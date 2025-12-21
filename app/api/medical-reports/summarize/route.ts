import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { summarizeMedicalReport } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { reportText, reportType, reportUrl } = body

    if (!reportText || !reportType) {
      return NextResponse.json({ error: 'Report text and type required' }, { status: 400 })
    }

    const startTime = Date.now()
    const summary = await summarizeMedicalReport(reportText, reportType)
    const latency = Date.now() - startTime

    // Get patient profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patientProfile: true }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    // Save medical report summary
    const reportSummary = await prisma.medicalReportSummary.create({
      data: {
        patientId: user.patientProfile.id,
        originalReportUrl: reportUrl || '',
        reportType: reportType,
        originalText: reportText,
        summary: summary.summary || '',
        keyFindings: JSON.stringify(summary.keyFindings || []),
        recommendations: summary.recommendations || null,
        urgency: summary.urgency || null
      }
    })

    // Log AI usage
    await prisma.aILog.create({
      data: {
        userId: user.id,
        inputType: 'text',
        input: reportText.substring(0, 500),
        output: JSON.stringify(summary),
        latency,
        model: 'gemini-pro'
      }
    })

    return NextResponse.json({
      summaryId: reportSummary.id,
      summary: summary
    })
  } catch (error) {
    console.error('Medical report summary error:', error)
    return NextResponse.json(
      { error: 'Failed to summarize medical report' },
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

    const summaries = await prisma.medicalReportSummary.findMany({
      where: { patientId: user.patientProfile.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ summaries })
  } catch (error) {
    console.error('Error fetching report summaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch summaries' },
      { status: 500 }
    )
  }
}

