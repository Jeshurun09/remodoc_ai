import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { invitationId, action } = await req.json()

  if (!invitationId || !['ACCEPT', 'DECLINE'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    // Find the invitation and ensure the current user is the recipient
    const invitation = await prisma.videoCallInvitation.findFirst({
      where: {
        id: invitationId,
        recipientId: session.user.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found or expired' }, { status: 404 })
    }

    // Update the invitation status
    const updatedInvitation = await prisma.videoCallInvitation.update({
      where: { id: invitationId },
      data: {
        status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED'
      },
      include: {
        initiator: { select: { name: true } },
        recipient: { select: { name: true } }
      }
    })

    return NextResponse.json(updatedInvitation)
  } catch (error) {
    console.error('Failed to respond to video call invitation:', error)
    return NextResponse.json({ error: 'Failed to respond to invitation' }, { status: 500 })
  }
}