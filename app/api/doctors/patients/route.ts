import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { doctorProfile: true }
    })

    if (!user || !user.doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })
    }

    // Get all patients who have appointments with this doctor
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: user.doctorProfile.id
      },
      include: {
        patient: {
          include: {
            user: true
          }
        }
      },
      distinct: ['patientId']
    })

    // Get unread message counts for each patient
    const patients = await Promise.all(
      appointments.map(async (apt) => {
        const unreadCount = await prisma.message.count({
          where: {
            senderId: apt.patient.userId,
            receiverId: session.user.id,
            read: false
          }
        })

        return {
          id: apt.patient.userId,
          name: apt.patient.user.name,
          email: apt.patient.user.email,
          unreadCount
        }
      })
    )

    return NextResponse.json({ patients })
  } catch (error) {
    console.error('Patients fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}

