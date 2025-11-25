import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { token, name, password, phone } = await req.json()

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: 'Token, name, and password are required' },
        { status: 400 }
      )
    }

    const invite = await prisma.invite.findUnique({
      where: { token }
    })

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite is invalid or expired' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.$transaction([
      prisma.user.create({
        data: {
          name,
          email: invite.email,
          password: hashedPassword,
          phone,
          role: invite.role,
          isVerified: true
        }
      }),
      prisma.invite.update({
        where: { token },
        data: { usedAt: new Date() }
      })
    ])

    return NextResponse.json({ success: true, email: invite.email })
  } catch (error) {
    console.error('Invite acceptance failed:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}

