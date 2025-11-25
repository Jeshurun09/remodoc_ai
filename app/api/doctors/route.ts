import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    type DoctorWithUser = Prisma.DoctorProfileGetPayload<{ include: { user: true } }>
    const doctors: DoctorWithUser[] = await prisma.doctorProfile.findMany({
      where: { verificationStatus: 'VERIFIED' },
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    })

    return NextResponse.json({
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        name: doctor.user.name,
        email: doctor.user.email,
        specialization: doctor.specialization,
        hospital: doctor.hospital
      }))
    })
  } catch (error) {
    console.error('Doctors list error:', error)
    return NextResponse.json({ error: 'Failed to fetch doctors' }, { status: 500 })
  }
}

