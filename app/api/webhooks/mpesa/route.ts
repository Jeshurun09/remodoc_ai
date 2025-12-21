import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseCallback } from '@/lib/mpesa'

/**
 * M-Pesa Callback webhook
 * Safaricom will POST to this endpoint after user completes/cancels payment
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Parse the callback
    const callbackData = parseCallback(body)

    console.log('M-Pesa Callback received:', callbackData)

    // Find the payment transaction
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { checkoutRequestId: callbackData.checkoutRequestID }
    })

    if (!transaction) {
      console.error('Transaction not found:', callbackData.checkoutRequestID)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Update transaction status
    if (callbackData.success) {
      // Payment successful
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'completed',
          receiptNumber: callbackData.receiptNumber
        }
      })

      // Create or update subscription
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
            paymentMethod: 'mpesa'
          }
        })
      } else {
        await prisma.subscription.create({
          data: {
            userId: transaction.userId,
            plan: planUpper as any,
            status: 'ACTIVE',
            endDate,
            paymentMethod: 'mpesa'
          }
        })
      }

      console.log(`Payment successful for user ${transaction.userId}`)
    } else {
      // Payment failed or user cancelled
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'failed'
        }
      })

      console.log(`Payment failed for user ${transaction.userId}: ${callbackData.resultDesc}`)
    }

    // Return success to Safaricom (they just need acknowledgement)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error)
    // Still return success so Safaricom doesn't retry
    return NextResponse.json({ success: true })
  }
}
