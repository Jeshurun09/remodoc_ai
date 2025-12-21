import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeSkinLesion } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { imageBase64, bodyLocation } = body

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image required' }, { status: 400 })
    }

    const startTime = Date.now()
    const analysis = await analyzeSkinLesion(imageBase64, bodyLocation)
    const latency = Date.now() - startTime

    // Get patient profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patientProfile: true }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    // Save image URL (in production, upload to S3 or similar)
    const imageUrl = `/uploads/skin-lesion-${Date.now()}.jpg`

    // Determine follow-up date based on risk level
    let followUpDate: Date | null = null
    if (analysis.riskLevel === 'urgent' || analysis.riskLevel === 'high') {
      followUpDate = new Date()
      followUpDate.setDate(followUpDate.getDate() + 7) // 1 week for high risk
    } else if (analysis.riskLevel === 'medium') {
      followUpDate = new Date()
      followUpDate.setMonth(followUpDate.getMonth() + 3) // 3 months for medium risk
    }

    // Save skin lesion scan
    const scan = await prisma.skinLesionScan.create({
      data: {
        patientId: user.patientProfile.id,
        imageUrl: imageUrl,
        bodyLocation: bodyLocation || null,
        analysis: JSON.stringify(analysis),
        lesionType: analysis.lesionType || null,
        riskLevel: analysis.riskLevel || null,
        characteristics: JSON.stringify(analysis.characteristics || {}),
        recommendations: analysis.recommendations || null,
        confidence: analysis.confidence || null,
        followUpDate: followUpDate
      }
    })

    // Log AI usage
    await prisma.aILog.create({
      data: {
        userId: user.id,
        inputType: 'image',
        input: 'Skin lesion image',
        output: JSON.stringify(analysis),
        latency,
        model: 'gemini-pro-vision'
      }
    })

    return NextResponse.json({
      scanId: scan.id,
      analysis: analysis
    })
  } catch (error) {
    console.error('Skin lesion analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze skin lesion' },
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

    const scans = await prisma.skinLesionScan.findMany({
      where: { patientId: user.patientProfile.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ scans })
  } catch (error) {
    console.error('Error fetching skin lesion scans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scans' },
      { status: 500 }
    )
  }
}

