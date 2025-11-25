import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendInviteEmail } from '@/lib/email'

const DEFAULT_EXPIRY_HOURS = 48

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { email, role = 'ADMIN', expiresInHours = DEFAULT_EXPIRY_HOURS } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admin invites are supported currently' }, { status: 400 })
    }

    const normalizedEmail = (email as string).trim().toLowerCase()

    // Prevent duplicate invites for verified users
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000)

    const invite = await prisma.invite.create({
      data: {
        email: normalizedEmail,
        role,
        token,
        expiresAt,
        createdBy: session.user.id
      }
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const inviteLink = `${baseUrl}/invite/accept?token=${invite.token}`
    await sendInviteEmail(normalizedEmail, inviteLink, role)

    return NextResponse.json({ success: true, inviteId: invite.id })
  } catch (error) {
    console.error('Failed to create invite:', error)
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}

