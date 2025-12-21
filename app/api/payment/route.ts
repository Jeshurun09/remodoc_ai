import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { initiateStkPush } from '@/lib/mpesa'
import { createPaymentIntent } from '@/lib/stripe'
import { createPayPalOrder } from '@/lib/paypal'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan, paymentMethod, paymentDetails } = await req.json()

  if (!plan || !paymentMethod) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // Get plan pricing
    const planPrices: Record<string, number> = {
      student: 3.99,
      individual: 5.99,
      'small-group': 12.99,
      family: 19.99
    }

    const amount = planPrices[plan] || 5.99

    // Handle M-Pesa payment
    if (paymentMethod === 'mpesa') {
      if (!paymentDetails?.phoneNumber) {
        return NextResponse.json({ error: 'Phone number required for M-Pesa' }, { status: 400 })
      }

      try {
        // Initiate STK push with Safaricom
        const stkResponse = await initiateStkPush(
          paymentDetails.phoneNumber,
          amount,
          session.user.id,
          `${plan} subscription`
        )

        if (stkResponse.ResponseCode !== '0') {
          return NextResponse.json(
            { error: stkResponse.ResponseDescription || 'STK push failed' },
            { status: 400 }
          )
        }

        // Create payment transaction record
        const transaction = await prisma.paymentTransaction.create({
          data: {
            userId: session.user.id,
            transactionId: `mpesa_${stkResponse.CheckoutRequestID}`,
            amount,
            currency: 'KES',
            status: 'pending',
            method: 'mpesa',
            phoneNumber: paymentDetails.phoneNumber,
            merchantRequestId: stkResponse.MerchantRequestID,
            checkoutRequestId: stkResponse.CheckoutRequestID,
            plan,
            description: `${plan} subscription`
          }
        })

        return NextResponse.json({
          success: true,
          checkoutRequestId: stkResponse.CheckoutRequestID,
          merchantRequestId: stkResponse.MerchantRequestID,
          transactionId: transaction.id,
          message: 'Payment prompt sent to your phone. Please enter your M-Pesa PIN to complete payment.',
          customerMessage: stkResponse.CustomerMessage
        })
      } catch (mpesaError) {
        console.error('M-Pesa error:', mpesaError)
        return NextResponse.json(
          { error: 'Failed to process M-Pesa payment. Please try again.' },
          { status: 500 }
        )
      }
    }

    // Handle Stripe payment
    if (paymentMethod === 'stripe') {
      try {
        const paymentIntent = await createPaymentIntent({
          amount,
          currency: 'usd',
          metadata: {
            plan,
            userId: session.user.id
          }
        })

        // Create payment transaction record
        const transaction = await prisma.paymentTransaction.create({
          data: {
            userId: session.user.id,
            transactionId: paymentIntent.paymentIntentId,
            amount,
            currency: 'USD',
            status: 'pending',
            method: 'stripe',
            plan,
            description: `${plan} subscription`
          }
        })

        return NextResponse.json({
          success: true,
          clientSecret: paymentIntent.clientSecret,
          paymentIntentId: paymentIntent.paymentIntentId,
          transactionId: transaction.id,
          amount,
          message: 'Payment intent created. Complete payment on the next screen.'
        })
      } catch (stripeError) {
        console.error('Stripe error:', stripeError)
        return NextResponse.json(
          { error: 'Failed to create payment intent' },
          { status: 500 }
        )
      }
    }

    // Handle PayPal payment
    if (paymentMethod === 'paypal') {
      try {
        const baseUrl = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'

        const order = await createPayPalOrder({
          amount,
          currency: 'USD',
          planName: plan,
          userId: session.user.id,
          returnUrl: `${baseUrl}/api/paypal/return`,
          cancelUrl: `${baseUrl}/subscribe/payment?plan=${plan}`
        })

        // Create payment transaction record
        const transaction = await prisma.paymentTransaction.create({
          data: {
            userId: session.user.id,
            transactionId: order.id,
            amount,
            currency: 'USD',
            status: 'pending',
            method: 'paypal',
            plan,
            description: `${plan} subscription`
          }
        })

        // Find approval link
        const approvalLink = order.links.find(link => link.rel === 'approve')?.href

        return NextResponse.json({
          success: true,
          orderId: order.id,
          transactionId: transaction.id,
          approvalUrl: approvalLink,
          message: 'PayPal order created. Redirect to PayPal to complete payment.'
        })
      } catch (paypalError) {
        console.error('PayPal error:', paypalError)
        return NextResponse.json(
          { error: 'Failed to create PayPal order' },
          { status: 500 }
        )
      }
    }

    // Handle bank transfer (manual)
    if (paymentMethod === 'bank') {
      // Create pending transaction for manual bank transfer
      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: session.user.id,
          transactionId: `bank_${Date.now()}`,
          amount,
          currency: 'USD',
          status: 'pending',
          method: 'bank',
          plan,
          description: `${plan} subscription (awaiting bank transfer)`
        }
      })

      return NextResponse.json({
        success: true,
        transactionId: transaction.id,
        message: 'Bank transfer details sent to your email. Payment will be activated within 2 business days.'
      })
    }

    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
  } catch (error) {
    console.error('Payment processing error:', error)
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 })
  }
}
