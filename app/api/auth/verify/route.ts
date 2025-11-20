import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()

    const normalizedEmail = (email as string | undefined)?.trim().toLowerCase()
    const normalizedCode = (code as string | undefined)?.trim()

    if (!normalizedEmail || !normalizedCode) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isVerified) {
      return NextResponse.json({ success: true, message: 'Account already verified.' })
    }

    if (
      !user.verificationCode ||
      user.verificationCode !== normalizedCode ||
      !user.verificationExpires ||
      user.verificationExpires < new Date()
    ) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationExpires: null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 })
  }
}

