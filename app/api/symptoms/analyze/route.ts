import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeSymptoms } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { symptoms, imageBase64, location } = body

    if (!symptoms) {
      return NextResponse.json({ error: 'Symptoms required' }, { status: 400 })
    }

    const startTime = Date.now()
    const aiAnalysis = await analyzeSymptoms(symptoms, imageBase64, location)
    const latency = Date.now() - startTime

    // Get patient profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patientProfile: true }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    // Save symptom report
    const symptomReport = await prisma.symptomReport.create({
      data: {
        patientId: user.patientProfile.id,
        symptoms,
        imageUrl: imageBase64 ? `/uploads/${Date.now()}.jpg` : null,
        aiAnalysis: JSON.stringify(aiAnalysis),
        likelyConditions: JSON.stringify(aiAnalysis.likelyConditions || []),
        urgency: aiAnalysis.urgency || 'MEDIUM',
        careAdvice: aiAnalysis.careAdvice || '',
        locationLat: location?.lat,
        locationLng: location?.lng
      }
    })

    // Log AI usage
    await prisma.aILog.create({
      data: {
        userId: user.id,
        inputType: imageBase64 ? 'image' : 'text',
        input: symptoms.substring(0, 500),
        output: JSON.stringify(aiAnalysis),
        latency,
        model: 'gemini-pro-vision'
      }
    })

    return NextResponse.json({
      reportId: symptomReport.id,
      analysis: aiAnalysis,
      urgency: symptomReport.urgency
    })
  } catch (error) {
    console.error('Symptom analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze symptoms' },
      { status: 500 }
    )
  }
}

