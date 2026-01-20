import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/triage
 * Create and process smart triage for symptom report
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symptomReportId } = await request.json();

    if (!symptomReportId) {
      return NextResponse.json({ error: 'Symptom report ID required' }, { status: 400 });
    }

    // Get symptom report
    const symptomReport = await prisma.symptomReport.findUnique({
      where: { id: symptomReportId },
      include: { patient: { include: { user: true } } },
    });

    if (!symptomReport || symptomReport.patientId !== session.user.id) {
      return NextResponse.json({ error: 'Symptom report not found' }, { status: 404 });
    }

    // Calculate urgency score based on AI analysis and keywords
    const urgencyScore = calculateUrgencyScore(symptomReport);
    const urgencyLevel = scoreToLevel(urgencyScore);

    // Check if existing triage exists
    let triage = await prisma.triageQueue.findFirst({
      where: { symptomReportId },
    });

    if (triage) {
      // Update existing triage
      triage = await prisma.triageQueue.update({
        where: { id: triage.id },
        data: {
          urgencyScore,
          urgencyLevel,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new triage
      triage = await prisma.triageQueue.create({
        data: {
          patientId: session.user.id,
          symptomReportId,
          urgencyScore,
          urgencyLevel,
          status: 'PENDING',
        },
      });
    }

    // Smart routing - assign to available doctor if not critical
    if (urgencyLevel !== 'CRITICAL') {
      const routedDoctor = await smartRouteToDoctor(symptomReport, urgencyLevel);
      if (routedDoctor) {
        await prisma.triageQueue.update({
          where: { id: triage.id },
          data: {
            routedToDoctorId: routedDoctor.id,
            autoAssigned: true,
            status: 'IN_PROGRESS',
            estimatedWaitTime: routedDoctor.estimatedWait,
            updatedAt: new Date(),
          },
        });
        
        // Log audit
        await prisma.enhancedAuditLog.create({
          data: {
            userId: session.user.id,
            action: 'TRIAGE_AUTO_ROUTED',
            resource: 'TRIAGE_QUEUE',
            resourceId: triage.id,
            details: JSON.stringify({
              urgencyLevel,
              routedToDoctorId: routedDoctor.id,
            }),
            severity: 'INFO',
          },
        });
      }
    } else {
      // CRITICAL case - flag for immediate admin review
      await prisma.enhancedAuditLog.create({
        data: {
          userId: session.user.id,
          action: 'CRITICAL_TRIAGE_CREATED',
          resource: 'TRIAGE_QUEUE',
          resourceId: triage.id,
          details: JSON.stringify({
            symptoms: symptomReport.symptoms,
            urgencyScore,
          }),
          severity: 'CRITICAL',
        },
      });
    }

    return NextResponse.json({
      success: true,
      triage,
      message: `Patient triaged as ${urgencyLevel} priority`,
    });
  } catch (error) {
    console.error('Triage error:', error);
    return NextResponse.json({ error: 'Failed to process triage' }, { status: 500 });
  }
}

/**
 * GET /api/triage?patientId=...
 * Get triage status for a patient
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId') || session.user.id;

    // Get active triage queue entries
    const triageEntries = await prisma.triageQueue.findMany({
      where: {
        patientId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        doctor: {
          select: { id: true, specialization: true, user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ triage: triageEntries });
  } catch (error) {
    console.error('Get triage error:', error);
    return NextResponse.json({ error: 'Failed to fetch triage status' }, { status: 500 });
  }
}

/**
 * Calculate urgency score based on symptoms
 */
function calculateUrgencyScore(symptomReport: any): number {
  const criticalKeywords = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious', 'severe allergic'];
  const highKeywords = ['severe pain', 'high fever', 'difficulty', 'emergency', 'urgent', 'intense'];
  const mediumKeywords = ['persistent', 'ongoing', 'concerning', 'moderate'];

  const text = (symptomReport.symptoms || '').toLowerCase();

  // Check critical keywords
  for (const keyword of criticalKeywords) {
    if (text.includes(keyword)) return 0.9;
  }

  // Check high priority keywords
  for (const keyword of highKeywords) {
    if (text.includes(keyword)) return 0.7;
  }

  // Check medium priority keywords
  for (const keyword of mediumKeywords) {
    if (text.includes(keyword)) return 0.5;
  }

  return 0.3; // Default to low
}

/**
 * Convert urgency score to level
 */
function scoreToLevel(score: number): string {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.6) return 'HIGH';
  if (score >= 0.4) return 'MEDIUM';
  return 'LOW';
}

/**
 * Smart routing algorithm
 */
async function smartRouteToDoctor(symptomReport: any, urgencyLevel: string) {
  const matchSpecialization = getSpecializationFromSymptoms(symptomReport.symptoms);

  // Find available doctors
  const availableDoctors = await prisma.doctorAvailability.findMany({
    where: {
      isOnline: true,
      currentlyAvailable: true,
    },
    include: {
      doctor: {
        select: {
          specialization: true,
          appointments: { where: { status: 'CONFIRMED' } },
        },
      },
    },
    orderBy: { lastStatusUpdate: 'desc' },
  });

  // Filter by specialization match and load
  const candidates = availableDoctors
    .filter((doc) => !matchSpecialization || doc.doctor.specialization.includes(matchSpecialization))
    .sort((a, b) => a.doctor.appointments.length - b.doctor.appointments.length)
    .slice(0, 3);

  if (candidates.length === 0) {
    return null;
  }

  // Pick the first available doctor
  const selectedDoctor = candidates[0];
  return {
    id: selectedDoctor.doctorId,
    estimatedWait: Math.min(selectedDoctor.doctor.appointments.length * 15, 120), // Max 2 hours
  };
}

/**
 * Get suggested specialization from symptoms
 */
function getSpecializationFromSymptoms(symptoms: string): string | null {
  const text = (symptoms || '').toLowerCase();

  const specializations: Record<string, string[]> = {
    'Cardiology': ['heart', 'chest', 'cardiac', 'arrhythmia'],
    'Neurology': ['headache', 'migraine', 'neurological', 'nerve', 'brain'],
    'Orthopedics': ['fracture', 'bone', 'joint', 'ligament', 'arthritis'],
    'Respiratory': ['breathing', 'cough', 'asthma', 'lungs', 'respiratory'],
    'Dermatology': ['skin', 'rash', 'lesion', 'dermatological'],
    'GastroEnterology': ['stomach', 'digestive', 'gastrointestinal', 'bowel'],
    'Pediatrics': ['child', 'infant', 'baby', 'pediatric'],
  };

  for (const [spec, keywords] of Object.entries(specializations)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return spec;
      }
    }
  }

  return null;
}
