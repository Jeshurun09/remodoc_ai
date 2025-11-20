import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      totalAppointments,
      pendingDoctors,
      recentAILogs
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'DOCTOR' } }),
      prisma.user.count({ where: { role: 'PATIENT' } }),
      prisma.appointment.count(),
      prisma.doctorProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.aILog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: true }
      })
    ])

    return NextResponse.json({
      analytics: {
        totalUsers,
        totalDoctors,
        totalPatients,
        totalAppointments,
        pendingDoctors,
        recentAILogs
      }
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

