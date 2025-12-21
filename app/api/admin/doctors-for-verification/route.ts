import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const doctors = await prisma.doctorProfile.findMany({
      where: {
        OR: [
          { verificationStatus: 'PENDING' },
          { verificationStatus: 'UNDER_REVIEW' }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            nationality: true
          }
        },
        boardCertifications: true,
        references: true,
        documents: true,
        verificationHistory: {
          include: {
            admin: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({ doctors })
  } catch (error) {
    console.error('Error fetching doctors for verification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}