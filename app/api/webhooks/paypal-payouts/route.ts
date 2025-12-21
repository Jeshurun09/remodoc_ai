import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Verify PayPal webhook signature
async function verifyPayPalSignature(req: Request, body: string): Promise<boolean> {
  const transmissionId = req.headers.get('paypal-transmission-id') || ''
  const transmissionTime = req.headers.get('paypal-transmission-time') || ''
  const certUrl = req.headers.get('paypal-cert-url') || ''
  const authAlgo = req.headers.get('paypal-auth-algo') || ''
  const signature = req.headers.get('paypal-signature') || ''

  if (!process.env.PAYPAL_WEBHOOK_ID) return false

  try {
    // For now, return true if headers are present (production should verify cert chain)
    // Full verification requires fetching cert from certUrl and validating signature
    return transmissionId && transmissionTime && signature ? true : false
  } catch (err) {
    return false
  }
}

export async function POST(req: Request) {
  const body = await req.text()

  // Verify webhook signature
  const isValid = await verifyPayPalSignature(req, body)
  if (!isValid && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'Webhook signature verification failed' }, { status: 403 })
  }

  try {
    const event = JSON.parse(body)
    const eventType = event.event_type

    if (eventType === 'PAYMENT.PAYOUTS.ITEM.SUCCEEDED') {
      const item = event.resource
      const providerRef = item.payout_item_id
      const match = await prisma.doctorPayout.findFirst({ where: { providerReference: providerRef } })
      if (match) {
        await prisma.doctorPayout.update({
          where: { id: match.id },
          data: { status: 'PAID' as any, processedAt: new Date() },
        })
      }
    } else if (eventType === 'PAYMENT.PAYOUTS.ITEM.FAILED' || eventType === 'PAYMENT.PAYOUTS.ITEM.HELD') {
      const item = event.resource
      const providerRef = item.payout_item_id
      const match = await prisma.doctorPayout.findFirst({ where: { providerReference: providerRef } })
      if (match) {
        await prisma.doctorPayout.update({
          where: { id: match.id },
          data: { status: 'FAILED' as any, processedAt: new Date() },
        })
      }
    }

    return NextResponse.json({ id: event.id })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
