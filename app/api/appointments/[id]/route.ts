import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  // 1. Await the params object before accessing properties
  const params = await props.params
  
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { status, notes } = body

    // 2. Use the resolved params.id
    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id }, 
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        symptomReport: true
      }
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (session.user.role === 'PATIENT') {
      const patient = await prisma.patientProfile.findUnique({
        where: { id: appointment.patientId }
      })
      if (!patient || patient.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (session.user.role === 'DOCTOR') {
      const doctor = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { doctorProfile: true }
      })
      if (!doctor?.doctorProfile || doctor.doctorProfile.id !== appointment.doctorId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Use the resolved params.id here as well
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        symptomReport: true
      }
    })

    return NextResponse.json({ appointment: updated })
  } catch (error) {
    console.error('Appointment update error:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    )
  }
}