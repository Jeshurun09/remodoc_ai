import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { PrismaClient, PayoutStatus } from '@prisma/client'

const prisma = new PrismaClient()
const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null

export async function POST(req: Request) {
  const buf = await req.text()
  const sig = req.headers.get('stripe-signature') || ''

  let event: any
  try {
    if (stripe && stripeSecret) {
      event = stripe.webhooks.constructEvent(buf, sig, stripeSecret)
    } else {
      // Fallback: parse body directly (insecure for prod)
      event = JSON.parse(buf)
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: 'Webhook signature verification failed' }, { status: 400 })
  }

  try {
    const type = event.type
    if (type === 'payout.paid' || type === 'payout.updated') {
      const payoutObj = event.data.object
      const providerRef = payoutObj.id
      // Find matching DoctorPayout
      const match = await prisma.doctorPayout.findFirst({ where: { providerReference: providerRef } })
      if (match) {
        await prisma.doctorPayout.update({ where: { id: match.id }, data: { status: PayoutStatus.PAID, processedAt: new Date() } })
      }
    }
    if (type === 'payout.failed') {
      const payoutObj = event.data.object
      const providerRef = payoutObj.id
      const match = await prisma.doctorPayout.findFirst({ where: { providerReference: providerRef } })
      if (match) {
        await prisma.doctorPayout.update({ where: { id: match.id }, data: { status: PayoutStatus.FAILED, processedAt: new Date() } })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
