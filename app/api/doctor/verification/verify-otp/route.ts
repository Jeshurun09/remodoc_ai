import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { method, phone, email, code } = await req.json()
    if (!method || !['phone', 'email'].includes(method)) {
      return NextResponse.json({ error: 'Invalid method; must be phone or email' }, { status: 400 })
    }
    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 })
    }

    let otp: any
    if (method === 'phone') {
      if (!phone) return NextResponse.json({ error: 'phone is required for phone method' }, { status: 400 })
      otp = await prisma.phoneOtp.findFirst({
        where: { phone, code },
        orderBy: { createdAt: 'desc' }
      })
    } else if (method === 'email') {
      if (!email) return NextResponse.json({ error: 'email is required for email method' }, { status: 400 })
      otp = await prisma.emailOtp.findFirst({
        where: { email, code },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!otp) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }

    if (new Date() > otp.expiresAt) {
      if (method === 'phone') {
        await prisma.phoneOtp.delete({ where: { id: otp.id } })
      } else {
        await prisma.emailOtp.delete({ where: { id: otp.id } })
      }
      return NextResponse.json({ error: 'Code expired' }, { status: 400 })
    }

    // valid - delete used otp
    if (method === 'phone') {
      await prisma.phoneOtp.delete({ where: { id: otp.id } })
      // Optionally, mark any pending verification requests for this phone as phoneVerified
      await prisma.doctorVerificationRequest.updateMany({
        where: { phoneNumber: phone },
        data: { phoneVerified: true }
      })
    } else {
      await prisma.emailOtp.delete({ where: { id: otp.id } })
    }

    return NextResponse.json({ message: `${method} verified` })
  } catch (error) {
    console.error('verify-otp error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
