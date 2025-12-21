import { NextRequest, NextResponse } from 'next/server'
import { parseWebhookEvent } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

/**
 * Stripe Webhook Handler
 * Handles: charge.succeeded, charge.failed, payment_intent.succeeded, payment_intent.payment_failed
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    // Verify webhook signature
    let event
    try {
      event = parseWebhookEvent(body, signature)
    } catch (error) {
      console.error('Stripe webhook signature verification failed:', error)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log(`Stripe webhook event: ${event.type}`)

    // Handle payment_intent.succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object

      // Find transaction by paymentIntentId
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { transactionId: paymentIntent.id }
      })

      if (!transaction) {
        console.error(`Transaction not found for payment intent: ${paymentIntent.id}`)
        return NextResponse.json({ received: true })
      }

      // Update transaction status
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'completed'
        }
      })

      // Create/update subscription
      const planUpper = transaction.plan.toUpperCase().replace(/-/g, '_')
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1)

      const existing = await prisma.subscription.findUnique({
        where: { userId: transaction.userId }
      })

      if (existing) {
        await prisma.subscription.update({
          where: { userId: transaction.userId },
          data: {
            plan: planUpper as any,
            status: 'ACTIVE',
            endDate,
            paymentMethod: 'stripe'
          }
        })
      } else {
        await prisma.subscription.create({
          data: {
            userId: transaction.userId,
            plan: planUpper as any,
            status: 'ACTIVE',
            endDate,
            paymentMethod: 'stripe'
          }
        })
      }

      console.log(`Payment succeeded for user ${transaction.userId}, plan: ${transaction.plan}`)
    }

    // Handle payment_intent.payment_failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object

      // Find transaction
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { transactionId: paymentIntent.id }
      })

      if (transaction) {
        // Update transaction status to failed
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'failed',
            metadata: JSON.stringify({
              error: paymentIntent.last_payment_error?.message
            })
          }
        })

        console.log(`Payment failed for user ${transaction.userId}`)
      }
    }

    // Return success to Stripe
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing Stripe webhook:', error)
    // Still return 200 so Stripe doesn't retry
    return NextResponse.json({ received: true })
  }
}
