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

    const { doctorId, action, notes } = await request.json()

    if (!doctorId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Determine new status
    let newStatus: string
    switch (action) {
      case 'approve':
        newStatus = 'VERIFIED'
        break
      case 'reject':
        newStatus = 'REJECTED'
        break
      case 'request_changes':
        newStatus = 'PENDING' // Keep as pending but log the request
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update doctor profile status
    await prisma.doctorProfile.update({
      where: { id: doctorId },
      data: {
        verificationStatus: newStatus as any,
        verifiedAt: action === 'approve' ? new Date() : null,
        verifiedBy: action === 'approve' ? session.user.id : null,
        verificationCompletedAt: action === 'approve' ? new Date() : null,
        verificationReviewedBy: session.user.id
      }
    })

    // Create verification history entry
    await prisma.doctorVerificationHistory.create({
      data: {
        doctorId,
        action,
        notes: notes || '',
        adminId: session.user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error verifying doctor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}