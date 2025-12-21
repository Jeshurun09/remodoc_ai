import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Verify Safaricom M-Pesa callback signature (if provided)
function verifyMpesaSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.MPESA_WEBHOOK_SECRET) {
    return true // Skip verification if no secret configured
  }
  const hash = crypto.createHmac('sha256', process.env.MPESA_WEBHOOK_SECRET).update(body).digest('hex')
  return hash === signature
}

// Safaricom B2C will POST a callback to this endpoint with details about the payment
export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-mpesa-signature')

  // Verify webhook signature
  if (!verifyMpesaSignature(body, signature)) {
    // Log but don't reject (Safaricom might not always send sig)
  }

  try {
    const data = JSON.parse(body)
    // Expect body to contain ConversationID, OriginatorConversationID, Result
    const conv = data.ConversationID || data.conversationID || (data.Result && data.Result.ConversationID)
    const result = data.Result || data

    if (!conv) {
      return NextResponse.json({ ok: false, error: 'Missing ConversationID' }, { status: 400 })
    }

    // Try to find payout by providerReference matching ConversationID
    const payout = await prisma.doctorPayout.findFirst({ where: { providerReference: conv } })
    if (!payout) {
      // Fallback: try to match by phone and amount in recent READY/PROCESSING payouts
      const phone = result.Msisdn || result.ReceiverPartyPublicName || result.PhoneNumber || null
      const amount = result.Amount || (result.ResultParameters && result.ResultParameters.ResultParameter && result.ResultParameters.ResultParameter.find && result.ResultParameters.ResultParameter.find((p:any)=>p.Key==='TransactionAmount')?.Value)
      const candidates = await prisma.doctorPayout.findMany({ where: { status: { in: ['PROCESSING', 'APPROVED', 'READY'] } }, orderBy: { createdAt: 'desc' } })
      // naive match
      const found = candidates.find(p => Math.abs((p.amountDue || 0) - (Number(amount) || 0)) < 1)
      if (found) {
        await prisma.doctorPayout.update({ where: { id: found.id }, data: { status: 'PAID' as any, providerReference: conv, processedAt: new Date() } })
        return NextResponse.json({ ok: true, data: found.id })
      }
      return NextResponse.json({ ok: false, error: 'Payout not found' }, { status: 404 })
    }

    // Update status based on result
    const resultCode = (result.Result && result.Result.ResultDesc) || result.ResultDesc || result.ResponseDescription || ''
    await prisma.doctorPayout.update({ where: { id: payout.id }, data: { status: 'PAID' as any, providerReference: conv, processedAt: new Date(), notes: String(resultCode) } })
    return NextResponse.json({ ok: true, data: payout.id })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
