import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendAppointmentReminder } from '@/lib/sms'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        patientProfile: { include: { appointments: true } },
        doctorProfile: { include: { appointments: true } }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let appointments = []
    if (session.user.role === 'PATIENT' && user.patientProfile) {
      appointments = await prisma.appointment.findMany({
        where: { patientId: user.patientProfile.id },
        include: {
          doctor: { include: { user: true } },
          symptomReport: true
        },
        orderBy: { createdAt: 'desc' }
      })
    } else if (session.user.role === 'DOCTOR' && user.doctorProfile) {
      appointments = await prisma.appointment.findMany({
        where: { doctorId: user.doctorProfile.id },
        include: {
          patient: { include: { user: true } },
          symptomReport: true
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    return NextResponse.json({ appointments })
  } catch (error) {
    console.error('Appointments fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
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
    const { symptomReportId, doctorId, scheduledAt } = body

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patientProfile: true }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: user.patientProfile.id,
        doctorId: doctorId || null,
        symptomReportId: symptomReportId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: 'PENDING'
      },
      include: {
        doctor: { include: { user: true } },
        symptomReport: true
      }
    })

    if (appointment.scheduledAt) {
      const reminders: Promise<void>[] = []

      if (user.phone) {
        reminders.push(
          sendAppointmentReminder({
            to: user.phone,
            recipientName: user.name,
            counterpartName: appointment.doctor?.user?.name || 'your care team',
            scheduledAt: appointment.scheduledAt,
            role: 'patient'
          })
        )
      }

      if (appointment.doctor?.user?.phone) {
        reminders.push(
          sendAppointmentReminder({
            to: appointment.doctor.user.phone,
            recipientName: appointment.doctor.user.name,
            counterpartName: user.name,
            scheduledAt: appointment.scheduledAt,
            role: 'doctor'
          })
        )
      }

      if (reminders.length > 0) {
        await Promise.allSettled(reminders)
      }
    }

    return NextResponse.json({ appointment })
  } catch (error) {
    console.error('Appointment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}

