import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeVoiceHealth } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { audioUrl, transcript, duration } = body

    if (!transcript || !duration) {
      return NextResponse.json({ error: 'Transcript and duration required' }, { status: 400 })
    }

    const startTime = Date.now()
    const analysis = await analyzeVoiceHealth(transcript, duration)
    const latency = Date.now() - startTime

    // Get patient profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patientProfile: true }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    // Save voice health analysis
    const voiceAnalysis = await prisma.voiceHealthAnalysis.create({
      data: {
        patientId: user.patientProfile.id,
        audioUrl: audioUrl || '',
        duration: duration,
        analysis: JSON.stringify(analysis),
        healthIndicators: JSON.stringify(analysis.healthIndicators || []),
        recommendations: analysis.recommendations || null,
        confidence: analysis.confidence || null
      }
    })

    // Log AI usage
    await prisma.aILog.create({
      data: {
        userId: user.id,
        inputType: 'voice',
        input: transcript.substring(0, 500),
        output: JSON.stringify(analysis),
        latency,
        model: 'gemini-pro'
      }
    })

    return NextResponse.json({
      analysisId: voiceAnalysis.id,
      analysis: analysis
    })
  } catch (error) {
    console.error('Voice health analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze voice health' },
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

    const analyses = await prisma.voiceHealthAnalysis.findMany({
      where: { patientId: user.patientProfile.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ analyses })
  } catch (error) {
    console.error('Error fetching voice health analyses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    )
  }
}

