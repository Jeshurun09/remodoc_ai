import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeWithGemini } from '@/lib/gemini';

/**
 * POST /api/ai/symptom-checker
 * AI-powered symptom checker with confidence scoring
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { symptoms, additionalInfo } = body;

    if (!symptoms || symptoms.length === 0) {
      return NextResponse.json({ error: 'At least one symptom required' }, { status: 400 });
    }

    // Get patient profile
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
      include: { medicationReminders: { include: { prescription: { include: { medication: true } } } } },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Prepare prompt for AI
    const symptomList = Array.isArray(symptoms) ? symptoms.join(', ') : symptoms;
    const medicationContext = patient.medicationReminders
      .map((r: any) => `${r.prescription.medication.name} (${r.prescription.dosage})`)
      .join(', ');

    const prompt = `
You are a medical AI assistant. Analyze the following symptoms and provide:
1. List of possible conditions (with confidence scores 0-1 for each)
2. Severity assessment (mild, moderate, severe)
3. Urgency level (low, medium, high, critical)
4. Recommended next steps
5. When to seek immediate medical attention

Symptoms: ${symptomList}
${additionalInfo ? `Additional information: ${additionalInfo}` : ''}
${medicationContext ? `Current medications: ${medicationContext}` : ''}

IMPORTANT: 
- Provide confidence scores as decimal numbers (e.g., 0.85)
- Be cautious and recommend professional medical consultation
- Do NOT provide a definitive diagnosis
- Suggest emergency services for critical symptoms

Respond in JSON format with keys: possible_conditions (array with name and confidence), severity, urgency, next_steps (array), emergency_warning
    `;

    // Call Gemini API
    const aiResponse = await analyzeWithGemini(prompt);

    let parsedResponse: any;
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
    } catch {
      parsedResponse = {
        possible_conditions: [{ name: 'General consultation recommended', confidence: 0.5 }],
        severity: 'unknown',
        urgency: 'medium',
        next_steps: ['Consult with a healthcare provider'],
        emergency_warning: 'If symptoms worsen or you experience difficulty breathing, seek emergency care immediately',
      };
    }

    // Calculate average confidence score
    const avgConfidence =
      parsedResponse.possible_conditions?.reduce((sum: number, c: any) => sum + (c.confidence || 0), 0) /
        Math.max(parsedResponse.possible_conditions?.length || 1, 1) || 0.5;

    // Create result record
    const result = await prisma.symptomCheckerResult.create({
      data: {
        patientId: session.user.id,
        inputSymptoms: JSON.stringify(symptoms),
        possibleConditions: JSON.stringify(parsedResponse.possible_conditions || []),
        confidenceScore: avgConfidence,
        severityAssessment: JSON.stringify({
          level: parsedResponse.severity,
          description: parsedResponse.severity_description,
        }),
        recommendations: JSON.stringify(parsedResponse.next_steps || []),
        disclaimerAcknowledged: false,
      },
    });

    // Log AI usage
    await prisma.aILog.create({
      data: {
        userId: session.user.id,
        inputType: 'text',
        input: symptomList,
        output: JSON.stringify(parsedResponse),
        model: 'gemini-pro',
      },
    });

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        possibleConditions: parsedResponse.possible_conditions,
        severity: parsedResponse.severity,
        urgency: parsedResponse.urgency,
        recommendations: parsedResponse.next_steps,
        emergencyWarning: parsedResponse.emergency_warning,
      },
    });
  } catch (error) {
    console.error('Symptom checker error:', error);
    return NextResponse.json({ error: 'Failed to analyze symptoms' }, { status: 500 });
  }
}

// NOTE: This file can only export ONE POST handler.
// Drug interactions should live in a separate route file (e.g. /api/ai/drug-interactions).
async function handleDrugInteractions(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { medicationId1, medicationId2 } = await request.json();

    if (!medicationId1 || !medicationId2) {
      return NextResponse.json({ error: 'Two medication IDs required' }, { status: 400 });
    }

    // Get medications
    const med1 = await prisma.medication.findUnique({ where: { id: medicationId1 } });
    const med2 = await prisma.medication.findUnique({ where: { id: medicationId2 } });

    if (!med1 || !med2) {
      return NextResponse.json({ error: 'One or both medications not found' }, { status: 404 });
    }

    // Check existing interactions data
    if (med1.interactions && med2.interactions) {
      try {
        const med1Interactions = JSON.parse(med1.interactions);
        if (med1Interactions.includes(med2.name)) {
          return NextResponse.json({
            success: true,
            hasInteraction: true,
            severity: 'moderate',
            description: `Known interaction between ${med1.name} and ${med2.name}`,
          });
        }
      } catch {}
    }

    // Use AI for unknown interactions
    const prompt = `
Check for drug interactions between:
1. ${med1.name} (${med1.strength}) - ${med1.genericName || 'no generic name'} 
2. ${med2.name} (${med2.strength}) - ${med2.genericName || 'no generic name'}

Provide:
- Has significant interaction (true/false)
- Severity (none, mild, moderate, severe)
- Description of interaction
- Recommendations

Respond in JSON with keys: has_interaction, severity, description, recommendations
    `;

    const aiResponse = await analyzeWithGemini(prompt);
    let parsedResponse: any;

    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
    } catch {
      parsedResponse = { has_interaction: false, severity: 'none', description: 'Unable to determine' };
    }

    // Get patient profile for logging
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (patient && parsedResponse.has_interaction) {
      // Create warning record
      await prisma.drugInteractionWarning.create({
        data: {
          patientId: session.user.id,
          medicationIds: JSON.stringify([medicationId1, medicationId2]),
          interactionLevel: parsedResponse.severity,
          description: parsedResponse.description,
          recommendation: parsedResponse.recommendations,
        },
      });
    }

    return NextResponse.json({
      success: true,
      hasInteraction: parsedResponse.has_interaction,
      severity: parsedResponse.severity,
      description: parsedResponse.description,
      recommendations: parsedResponse.recommendations,
    });
  } catch (error) {
    console.error('Drug interaction check error:', error);
    return NextResponse.json({ error: 'Failed to check interactions' }, { status: 500 });
  }
}

/**
 * GET /api/ai/health-trends
 * Get AI-generated health trend insights
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30days';
    const metricName = searchParams.get('metric');

    // Get patient
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 100 },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get health trend insights
    const trends = await prisma.healthTrendInsight.findMany({
      where: {
        patientId: session.user.id,
        ...(metricName && { metricName }),
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      trends: trends.map((t: any) => ({
        ...t,
        data: t.data ? JSON.parse(t.data) : null,
      })),
    });
  } catch (error) {
    console.error('Health trends error:', error);
    return NextResponse.json({ error: 'Failed to fetch health trends' }, { status: 500 });
  }
}
