import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patientProfile: true }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    // Get timeline events from various sources
    const [timelineEvents, symptoms, appointments, prescriptions, vitals, scans, reports] = await Promise.all([
      prisma.healthTimeline.findMany({
        where: {
          patientId: user.patientProfile.id,
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
        },
        orderBy: { date: 'desc' }
      }),
      prisma.symptomReport.findMany({
        where: {
          patientId: user.patientProfile.id,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.appointment.findMany({
        where: {
          patientId: user.patientProfile.id,
          ...(Object.keys(dateFilter).length > 0 && { scheduledAt: dateFilter })
        },
        orderBy: { scheduledAt: 'desc' },
        take: 100
      }),
      prisma.medicationPrescription.findMany({
        where: {
          patientId: user.patientProfile.id,
          ...(Object.keys(dateFilter).length > 0 && { prescribedAt: dateFilter })
        },
        orderBy: { prescribedAt: 'desc' },
        take: 100
      }),
      prisma.vitalSign.findMany({
        where: {
          patientId: user.patientProfile.id,
          ...(Object.keys(dateFilter).length > 0 && { recordedAt: dateFilter })
        },
        orderBy: { recordedAt: 'desc' },
        take: 100
      }),
      prisma.skinLesionScan.findMany({
        where: {
          patientId: user.patientProfile.id,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.medicalReportSummary.findMany({
        where: {
          patientId: user.patientProfile.id,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ])

    // Combine all events into a unified timeline
    const allEvents: any[] = [
      ...timelineEvents.map(e => ({
        id: e.id,
        type: e.eventType,
        title: e.title,
        description: e.description,
        date: e.date,
        category: e.category || 'medical',
        metadata: e.metadata ? JSON.parse(e.metadata) : null
      })),
      ...symptoms.map(s => ({
        id: s.id,
        type: 'symptom',
        title: 'Symptom Report',
        description: s.symptoms.substring(0, 100),
        date: s.createdAt,
        category: 'medical',
        metadata: { urgency: s.urgency, reportId: s.id }
      })),
      ...appointments.map(a => ({
        id: a.id,
        type: 'appointment',
        title: 'Medical Appointment',
        description: a.notes || 'Appointment scheduled',
        date: a.scheduledAt || a.createdAt,
        category: 'medical',
        metadata: { status: a.status, appointmentId: a.id }
      })),
      ...prescriptions.map(p => ({
        id: p.id,
        type: 'medication',
        title: 'Prescription',
        description: `Medication prescribed`,
        date: p.prescribedAt,
        category: 'medication',
        metadata: { prescriptionId: p.id }
      })),
      ...vitals.map(v => ({
        id: v.id,
        type: 'vital',
        title: `${v.type} Recorded`,
        description: `${v.value} ${v.unit}`,
        date: v.recordedAt,
        category: 'medical',
        metadata: { type: v.type, value: v.value, unit: v.unit }
      })),
      ...scans.map(s => ({
        id: s.id,
        type: 'scan',
        title: 'Skin Lesion Scan',
        description: `Risk Level: ${s.riskLevel || 'Unknown'}`,
        date: s.createdAt,
        category: 'diagnostic',
        metadata: { scanId: s.id, riskLevel: s.riskLevel }
      })),
      ...reports.map(r => ({
        id: r.id,
        type: 'report',
        title: `Medical Report - ${r.reportType}`,
        description: r.summary.substring(0, 100),
        date: r.createdAt,
        category: 'diagnostic',
        metadata: { reportId: r.id, reportType: r.reportType }
      }))
    ]

    // Sort by date
    allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ timeline: allEvents })
  } catch (error) {
    console.error('Error fetching health timeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch health timeline' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { eventType, eventId, title, description, date, category, metadata } = body

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and date required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patientProfile: true }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    const timelineEvent = await prisma.healthTimeline.create({
      data: {
        patientId: user.patientProfile.id,
        eventType: eventType || 'custom',
        eventId: eventId || null,
        title: title,
        description: description || null,
        date: new Date(date),
        category: category || 'medical',
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    })

    return NextResponse.json({ event: timelineEvent })
  } catch (error) {
    console.error('Error creating timeline event:', error)
    return NextResponse.json(
      { error: 'Failed to create timeline event' },
      { status: 500 }
    )
  }
}

