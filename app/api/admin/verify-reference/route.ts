import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { referenceId, verified, notes } = await request.json()

    if (!referenceId) {
      return NextResponse.json({ error: 'Reference ID required' }, { status: 400 })
    }

    await prisma.doctorReference.update({
      where: { id: referenceId },
      data: {
        verified,
        verificationNotes: notes || '',
        verifiedAt: verified ? new Date() : null,
        verifiedBy: verified ? session.user.id : null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error verifying reference:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}