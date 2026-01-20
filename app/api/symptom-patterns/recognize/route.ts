import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recognizeSymptomPattern } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { symptoms } = body

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return NextResponse.json({ error: 'Symptoms array required' }, { status: 400 })
    }

    // Get patient profile and historical symptom data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        patientProfile: {
          include: {
            symptoms: {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        }
      }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    // Prepare historical data
    const historicalData = user.patientProfile.symptoms.map(s => ({
      symptoms: s.symptoms,
      urgency: s.urgency,
      createdAt: s.createdAt
    }))

    const startTime = Date.now()
    const patternAnalysis = await recognizeSymptomPattern(symptoms, historicalData)
    const latency = Date.now() - startTime

    // Save symptom pattern
    const pattern = await prisma.symptomPattern.create({
      data: {
        patientId: user.patientProfile.id,
        patternType: patternAnalysis.patternType || 'other',
        symptoms: JSON.stringify(symptoms),
        frequency: patternAnalysis.frequency || null,
        triggers: JSON.stringify(patternAnalysis.triggers || []),
        aiInsights: patternAnalysis.aiInsights || '',
        recommendations: patternAnalysis.recommendations || null,
        confidence: patternAnalysis.confidence || null
      }
    })

    // Log AI usage
    await prisma.aILog.create({
      data: {
        userId: user.id,
        inputType: 'text',
        input: symptoms.join(', ').substring(0, 500),
        output: JSON.stringify(patternAnalysis),
        latency,
        model: 'gemini-pro'
      }
    })

    return NextResponse.json({
      patternId: pattern.id,
      pattern: patternAnalysis
    })
  } catch (error) {
    console.error('Symptom pattern recognition error:', error)
    return NextResponse.json(
      { error: 'Failed to recognize symptom patterns' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patientProfile: true }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    const patterns = await prisma.symptomPattern.findMany({
      where: { patientId: user.patientProfile.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ patterns })
  } catch (error) {
    console.error('Error fetching symptom patterns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patterns' },
      { status: 500 }
    )
  }
}

