import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
})

interface CreatePaymentIntentParams {
  amount: number
  currency?: string
  metadata?: Record<string, string>
}

interface ConfirmPaymentParams {
  paymentIntentId: string
  paymentMethodId: string
}

/**
 * Create a Stripe payment intent
 */
export async function createPaymentIntent({
  amount,
  currency = 'usd',
  metadata = {}
}: CreatePaymentIntentParams) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString()
      }
    })

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status
    }
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw new Error('Failed to create payment intent')
  }
}

/**
 * Retrieve payment intent status
 */
export async function getPaymentIntentStatus(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      clientSecret: paymentIntent.client_secret,
      lastPaymentError: paymentIntent.last_payment_error?.message
    }
  } catch (error) {
    console.error('Error retrieving payment intent:', error)
    throw new Error('Failed to retrieve payment intent')
  }
}

/**
 * Confirm payment with payment method
 */
export async function confirmPayment({
  paymentIntentId,
  paymentMethodId
}: ConfirmPaymentParams) {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId
    })

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret
    }
  } catch (error) {
    console.error('Error confirming payment:', error)
    throw new Error('Failed to confirm payment')
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    stripe.webhooks.constructEvent(body, signature, secret)
    return true
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return false
  }
}

/**
 * Parse webhook event
 */
export function parseWebhookEvent(body: string, signature: string) {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
    return event
  } catch (error) {
    console.error('Error parsing webhook:', error)
    throw new Error('Failed to parse webhook event')
  }
}

/**
 * Get Stripe publishable key (for frontend)
 */
export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
}

/**
 * Refund a charge
 */
export async function refundCharge(paymentIntentId: string, amount?: number) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount && { amount: Math.round(amount * 100) })
    })

    return {
      id: refund.id,
      status: refund.status,
      amount: refund.amount,
      reason: refund.reason
    }
  } catch (error) {
    console.error('Error refunding charge:', error)
    throw new Error('Failed to refund charge')
  }
}
