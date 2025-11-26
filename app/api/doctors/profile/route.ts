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

    return NextResponse.json({
      profile: {
        id: user.doctorProfile.id,
        verificationStatus: user.doctorProfile.verificationStatus,
        verifiedAt: user.doctorProfile.verifiedAt,
        licenseNumber: user.doctorProfile.licenseNumber,
        specialization: user.doctorProfile.specialization,
        hospital: user.doctorProfile.hospital,
        yearsExperience: user.doctorProfile.yearsExperience
      }
    })
  } catch (error) {
    console.error('Doctor profile fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch doctor profile' },
      { status: 500 }
    )
  }
}

