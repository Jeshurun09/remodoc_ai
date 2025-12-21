import axios from 'axios'

interface PayPalAccessToken {
  access_token: string
  token_type: string
  expires_in: number
}

interface CreateOrderParams {
  amount: number
  currency?: string
  planName: string
  userId: string
  returnUrl: string
  cancelUrl: string
}

interface PayPalOrder {
  id: string
  status: string
  links: Array<{
    rel: string
    href: string
  }>
}

interface PayPalOrderDetails {
  id: string
  status: string
  amount: {
    currency_code: string
    value: string
  }
  payer?: {
    email_address: string
  }
}

const PAYPAL_BASE_URL =
  process.env.PAYPAL_ENV === 'production'
    ? 'https://api.paypal.com'
    : 'https://api.sandbox.paypal.com'

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || ''
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || ''

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get PayPal OAuth access token
 */
export async function getPayPalToken(): Promise<string> {
  try {
    // Return cached token if still valid
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return cachedToken.token
    }

    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

    const response = await axios.post<PayPalAccessToken>(
      `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    const token = response.data.access_token
    const expiresAt = Date.now() + (response.data.expires_in - 60) * 1000 // 60s buffer

    cachedToken = { token, expiresAt }
    return token
  } catch (error) {
    console.error('Error getting PayPal token:', error)
    throw new Error('Failed to authenticate with PayPal')
  }
}

/**
 * Create a PayPal order
 */
export async function createPayPalOrder({
  amount,
  currency = 'USD',
  planName,
  userId,
  returnUrl,
  cancelUrl
}: CreateOrderParams): Promise<PayPalOrder> {
  try {
    const token = await getPayPalToken()

    const orderData = {
      intent: 'CAPTURE',
      payer: {
        email_address: 'buyer@example.com' // This will be replaced by actual payer email
      },
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2)
          },
          description: `${planName} subscription for RemoDoc`,
          custom_id: userId,
          reference_id: `${planName}-${Date.now()}`
        }
      ],
      application_context: {
        brand_name: 'RemoDoc',
        locale: 'en-US',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
        shipping_preference: 'NO_SHIPPING'
      }
    }

    const response = await axios.post<PayPalOrder>(
      `${PAYPAL_BASE_URL}/v2/checkout/orders`,
      orderData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  } catch (error) {
    console.error('Error creating PayPal order:', error)
    throw new Error('Failed to create PayPal order')
  }
}

/**
 * Get PayPal order details
 */
export async function getPayPalOrderDetails(orderId: string): Promise<PayPalOrderDetails> {
  try {
    const token = await getPayPalToken()

    const response = await axios.get<PayPalOrderDetails>(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response.data
  } catch (error) {
    console.error('Error getting PayPal order details:', error)
    throw new Error('Failed to get PayPal order details')
  }
}

/**
 * Capture PayPal order (complete payment)
 */
export async function capturePayPalOrder(orderId: string): Promise<PayPalOrderDetails> {
  try {
    const token = await getPayPalToken()

    const response = await axios.post<PayPalOrderDetails>(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  } catch (error) {
    console.error('Error capturing PayPal order:', error)
    throw new Error('Failed to capture PayPal order')
  }
}

/**
 * Verify PayPal webhook signature
 */
export async function verifyWebhookSignature(
  webhookId: string,
  eventBody: string,
  signature: string,
  transmissionId: string,
  transmissionTime: string
): Promise<boolean> {
  try {
    const token = await getPayPalToken()

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
      {
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: '', // PayPal provides this
        auth_algo: 'SHA-256',
        transmission_sig: signature,
        webhook_id: webhookId,
        webhook_event: JSON.parse(eventBody)
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data.verification_status === 'SUCCESS'
  } catch (error) {
    console.error('Error verifying PayPal webhook:', error)
    return false
  }
}

/**
 * Get PayPal client ID (for frontend)
 */
export function getPayPalClientId(): string {
  return CLIENT_ID
}
