import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '30d'

    let dateFilter: { gte?: Date } = {}
    if (range !== 'all') {
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
      dateFilter.gte = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    }

    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      totalAppointments,
      pendingDoctors,
      verifiedDoctors,
      activeHospitals,
      totalPrescriptions,
      totalMessages,
      totalAILogs,
      appointmentStats,
      recentAppointments
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'DOCTOR' } }),
      prisma.user.count({ where: { role: 'PATIENT' } }),
      prisma.appointment.count({ where: { createdAt: dateFilter } }),
      prisma.doctorProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.doctorProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
      prisma.hospital.count({ where: { active: true } }),
      prisma.prescription.count({ where: { createdAt: dateFilter } }),
      prisma.message.count({ where: { createdAt: dateFilter } }),
      prisma.aILog.count({ where: { createdAt: dateFilter } }),
      prisma.appointment.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { createdAt: dateFilter }
      }),
      prisma.appointment.findMany({
        take: 10,
        where: { createdAt: dateFilter },
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { include: { user: { select: { name: true, email: true } } } },
          doctor: { include: { user: { select: { name: true, email: true } } } }
        }
      })
    ])

    const stats = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    }

    appointmentStats.forEach((stat: { status: AppointmentStatus; _count: { status: number } }) => {
      stats[stat.status.toLowerCase() as keyof typeof stats] = stat._count.status
    })

    return NextResponse.json({
      reports: {
        totalUsers,
        totalDoctors,
        totalPatients,
        totalAppointments,
        pendingDoctors,
        verifiedDoctors,
        activeHospitals,
        totalPrescriptions,
        totalMessages,
        totalAILogs,
        appointmentStats: stats,
        recentAppointments,
        topDoctors: [] // Can be enhanced later
      }
    })
  } catch (error) {
    console.error('Reports fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

