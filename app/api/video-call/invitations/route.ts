import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { recipientId } = await req.json()

  if (!recipientId) {
    return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 })
  }

  // Don't allow calling yourself
  if (recipientId === session.user.id) {
    return NextResponse.json({ error: 'Cannot call yourself' }, { status: 400 })
  }

  try {
    // Check if there's already a pending invitation between these users
    const existingInvitation = await prisma.videoCallInvitation.findFirst({
      where: {
        OR: [
          { initiatorId: session.user.id, recipientId, status: 'PENDING' },
          { initiatorId: recipientId, recipientId: session.user.id, status: 'PENDING' }
        ]
      }
    })

    if (existingInvitation) {
      return NextResponse.json({ error: 'There is already a pending call invitation' }, { status: 400 })
    }

    // Create the invitation
    const invitation = await prisma.videoCallInvitation.create({
      data: {
        initiatorId: session.user.id,
        recipientId,
        expiresAt: new Date(Date.now() + 30 * 1000) // 30 seconds from now
      },
      include: {
        initiator: { select: { name: true } },
        recipient: { select: { name: true } }
      }
    })

    return NextResponse.json(invitation)
  } catch (error) {
    console.error('Failed to create video call invitation:', error)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get pending invitations for the current user
    const invitations = await prisma.videoCallInvitation.findMany({
      where: {
        recipientId: session.user.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        initiator: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Failed to fetch video call invitations:', error)
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }
}