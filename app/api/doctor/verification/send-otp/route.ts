import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { method, phone, email } = await req.json()
    if (!method || !['phone', 'email'].includes(method)) {
      return NextResponse.json({ error: 'Invalid method; must be phone or email' }, { status: 400 })
    }
    if (method === 'phone' && !phone) {
      return NextResponse.json({ error: 'Phone is required for SMS OTP' }, { status: 400 })
    }
    if (method === 'email' && !email) {
      return NextResponse.json({ error: 'Email is required for email OTP' }, { status: 400 })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    if (method === 'phone') {
      await prisma.phoneOtp.create({ data: { phone, code, expiresAt } })
      
      try {
        await sendSMS(phone, `Your RemoDoc verification code is: ${code}. It expires in 10 minutes.`)
      } catch (smsErr) {
        console.error('Failed to send OTP SMS:', smsErr)
      }
    } else if (method === 'email') {
      await prisma.emailOtp.create({ data: { email, code, expiresAt } })
      
      try {
        await sendEmail({
          to: email,
          subject: 'RemoDoc Verification Code',
          html: `<div style="font-family: sans-serif; line-height: 1.6;"><h2>Verification Code</h2><p>Your RemoDoc verification code is:</p><p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p><p>It expires in 10 minutes.</p></div>`,
          text: `Your RemoDoc verification code is: ${code}. It expires in 10 minutes.`
        })
      } catch (emailErr) {
        console.error('Failed to send OTP email:', emailErr)
      }
    }

    return NextResponse.json({ message: `OTP sent to ${method}` })
  } catch (error) {
    console.error('send-otp error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
