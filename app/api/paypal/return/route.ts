import { NextRequest, NextResponse } from 'next/server'
import { capturePayPalOrder } from '@/lib/paypal'
import { prisma } from '@/lib/prisma'

/**
 * PayPal Return Handler
 * Called after user approves payment on PayPal
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/subscribe/payment?error=missing_token', req.url))
    }

    try {
      // Capture the PayPal order
      const order = await capturePayPalOrder(token)

      // Find transaction by PayPal order ID
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { transactionId: token }
      })

      if (!transaction) {
        console.error(`Transaction not found for PayPal order: ${token}`)
        return NextResponse.redirect(
          new URL('/subscribe/payment?error=transaction_not_found', req.url)
        )
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

      // Redirect to dashboard
      return NextResponse.redirect(
        new URL('/dashboard/patient?premium=activated', req.url)
      )
    } catch (error) {
      console.error('Error capturing PayPal order:', error)
      return NextResponse.redirect(
        new URL(`/subscribe/payment?error=capture_failed`, req.url)
      )
    }
  } catch (error) {
    console.error('Error processing PayPal return:', error)
    return NextResponse.redirect(
      new URL('/subscribe/payment?error=processing_failed', req.url)
    )
  }
}
