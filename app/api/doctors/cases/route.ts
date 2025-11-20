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

    const cases = await prisma.appointment.findMany({
      where: {
        doctorId: user.doctorProfile.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        patient: { include: { user: true } },
        symptomReport: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ cases })
  } catch (error) {
    console.error('Cases fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cases' },
      { status: 500 }
    )
  }
}

