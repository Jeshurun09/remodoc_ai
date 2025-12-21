import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/paypal'
import { prisma } from '@/lib/prisma'

/**
 * PayPal Webhook Handler
 * Handles: CHECKOUT.ORDER.APPROVED, CHECKOUT.ORDER.COMPLETED, CHECKOUT.ORDER.VOIDED
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const event = JSON.parse(body)

    // Get webhook headers for verification
    const transmissionId = req.headers.get('paypal-transmission-id') || ''
    const transmissionTime = req.headers.get('paypal-transmission-time') || ''
    const signature = req.headers.get('paypal-transmission-sig') || ''
    const webhookId = process.env.PAYPAL_WEBHOOK_ID || ''

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(webhookId, body, signature, transmissionId, transmissionTime)

    if (!isValid) {
      console.warn('PayPal webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log(`PayPal webhook event: ${event.event_type}`)

    // Handle order.approved
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = event.resource.id

      // Find transaction by PayPal order ID
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { transactionId: orderId }
      })

      if (!transaction) {
        console.error(`Transaction not found for PayPal order: ${orderId}`)
        return NextResponse.json({ received: true })
      }

      // Update transaction status
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'pending',
          metadata: JSON.stringify({
            paypalOrderId: orderId,
            status: 'approved'
          })
        }
      })

      console.log(`PayPal order approved: ${orderId}`)
    }

    // Handle order.completed (CAPTURE succeeded)
    if (event.event_type === 'CHECKOUT.ORDER.COMPLETED') {
      const orderId = event.resource.id

      // Find transaction
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { transactionId: orderId }
      })

      if (!transaction) {
        console.error(`Transaction not found for PayPal order: ${orderId}`)
        return NextResponse.json({ received: true })
      }

      // Update transaction status to completed
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'completed',
          metadata: JSON.stringify({
            paypalOrderId: orderId,
            status: 'completed'
          })
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
            paymentMethod: 'paypal'
          }
        })
      } else {
        await prisma.subscription.create({
          data: {
            userId: transaction.userId,
            plan: planUpper as any,
            status: 'ACTIVE',
            endDate,
            paymentMethod: 'paypal'
          }
        })
      }

      console.log(`PayPal payment completed for user ${transaction.userId}, plan: ${transaction.plan}`)
    }

    // Handle order.voided (Payment cancelled)
    if (event.event_type === 'CHECKOUT.ORDER.VOIDED') {
      const orderId = event.resource.id

      const transaction = await prisma.paymentTransaction.findUnique({
        where: { transactionId: orderId }
      })

      if (transaction) {
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'failed',
            metadata: JSON.stringify({
              paypalOrderId: orderId,
              status: 'voided'
            })
          }
        })

        console.log(`PayPal order voided: ${orderId}`)
      }
    }

    // Return success to PayPal
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing PayPal webhook:', error)
    // Still return 200 so PayPal doesn't retry
    return NextResponse.json({ received: true })
  }
}
