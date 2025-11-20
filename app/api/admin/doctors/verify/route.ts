import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { doctorId, status } = body

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const doctor = await prisma.doctorProfile.update({
      where: { id: doctorId },
      data: {
        verificationStatus: status,
        verifiedAt: status === 'VERIFIED' ? new Date() : null,
        verifiedBy: session.user.id
      },
      include: { user: true }
    })

    return NextResponse.json({ doctor })
  } catch (error) {
    console.error('Doctor verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify doctor' },
      { status: 500 }
    )
  }
}

