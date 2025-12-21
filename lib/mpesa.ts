import axios from 'axios'
import crypto from 'crypto'

interface MpesaTokenResponse {
  access_token: string
  expires_in: number
}

interface MpesaStkPushRequest {
  BusinessShortCode: string
  Password: string
  Timestamp: string
  TransactionType: string
  Amount: number
  PartyA: string
  PartyB: string
  PhoneNumber: string
  CallBackURL: string
  AccountReference: string
  TransactionDesc: string
}

interface MpesaStkPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{
          Name: string
          Value: string | number
        }>
      }
    }
  }
}

const MPESA_BASE_URL =
  process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || ''
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || ''
const SHORTCODE = process.env.MPESA_SHORTCODE || ''
const PASSKEY = process.env.MPESA_PASSKEY || ''
const INITIATOR_NAME = process.env.MPESA_INITIATOR_NAME || ''
const INITIATOR_PASSWORD = process.env.MPESA_INITIATOR_PASSWORD || ''
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || ''

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get M-Pesa OAuth access token
 */
export async function getMpesaToken(): Promise<string> {
  try {
    // Return cached token if still valid
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return cachedToken.token
    }

    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')

    const response = await axios.get<MpesaTokenResponse>(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    )

    const token = response.data.access_token
    const expiresAt = Date.now() + response.data.expires_in * 1000

    cachedToken = { token, expiresAt }
    return token
  } catch (error) {
    console.error('Error getting M-Pesa token:', error)
    throw new Error('Failed to authenticate with M-Pesa')
  }
}

/**
 * Initiate STK Push (payment prompt on customer's phone)
 */
export async function initiateStkPush(
  phoneNumber: string,
  amount: number,
  accountReference: string,
  transactionDesc: string
): Promise<MpesaStkPushResponse> {
  try {
    const token = await getMpesaToken()

    // Format phone number: must be in format 254XXXXXXXXX (Kenya +254)
    const formattedPhone = formatPhoneNumber(phoneNumber)

    // Generate timestamp and password
    const timestamp = getTimestamp()
    const password = generatePassword(SHORTCODE, PASSKEY, timestamp)

    const requestBody: MpesaStkPushRequest = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.floor(amount),
      PartyA: formattedPhone,
      PartyB: SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: accountReference.substring(0, 12), // Max 12 chars
      TransactionDesc: transactionDesc.substring(0, 20) // Max 20 chars
    }

    const response = await axios.post<MpesaStkPushResponse>(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  } catch (error) {
    console.error('Error initiating STK push:', error)
    throw new Error('Failed to initiate M-Pesa payment prompt')
  }
}

/**
 * Query STK Push status
 */
export async function queryStk(
  businessShortCode: string,
  checkoutRequestID: string
): Promise<any> {
  try {
    const token = await getMpesaToken()
    const timestamp = getTimestamp()
    const password = generatePassword(businessShortCode, PASSKEY, timestamp)

    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: businessShortCode,
        CheckoutRequestID: checkoutRequestID,
        Password: password,
        Timestamp: timestamp
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  } catch (error) {
    console.error('Error querying STK status:', error)
    throw new Error('Failed to query M-Pesa payment status')
  }
}

/**
 * Initiate an M-Pesa B2C (Business to Customer) payment request.
 * Note: This requires B2C credentials and a SecurityCredential (encrypted initiator password)
 * The implementation below will call the B2C endpoint if `MPESA_B2C_SECURITY_CREDENTIAL` and
 * `MPESA_INITIATOR_NAME` are provided in env. Otherwise it will throw an informative error.
 */
export async function initiateB2CPayment(
  phoneNumber: string,
  amount: number,
  remarks: string,
  occasion?: string
): Promise<any> {
  const formattedPhone = formatPhoneNumber(phoneNumber)
  const token = await getMpesaToken()

  const initiatorName = process.env.MPESA_INITIATOR_NAME || ''
  const securityCredential = process.env.MPESA_B2C_SECURITY_CREDENTIAL || ''
  const commandID = process.env.MPESA_B2C_COMMAND || 'BusinessPayment'
  const partyB = process.env.MPESA_B2C_PARTYB || process.env.MPESA_SHORTCODE || ''

  if (!initiatorName || !securityCredential || !partyB) {
    throw new Error('M-Pesa B2C credentials not configured (MPESA_INITIATOR_NAME, MPESA_B2C_SECURITY_CREDENTIAL, MPESA_B2C_PARTYB)')
  }

  const requestBody = {
    InitiatorName: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: commandID,
    Amount: Math.floor(amount),
    PartyA: partyB,
    PartyB: formattedPhone,
    Remarks: remarks || 'Doctor payout',
    QueueTimeOutURL: process.env.MPESA_B2C_TIMEOUT_URL || process.env.MPESA_CALLBACK_URL || '',
    ResultURL: process.env.MPESA_B2C_RESULT_URL || process.env.MPESA_CALLBACK_URL || '',
    Occasion: occasion || 'PAYOUT'
  }

  const url = `${MPESA_BASE_URL}/mpesa/b2c/v1/paymentrequest`
  const axios = (await import('axios')).default
  const resp = await axios.post(url, requestBody, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  return resp.data
}

/**
 * Verify M-Pesa callback signature
 */
export function verifyCallbackSignature(
  callbackData: string,
  signature: string
): boolean {
  try {
    const computedSignature = crypto
      .createHash('sha256')
      .update(callbackData + PASSKEY)
      .digest('hex')

    return computedSignature === signature
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
}

/**
 * Parse M-Pesa callback response
 */
export function parseCallback(callback: MpesaCallback): {
  success: boolean
  resultCode: number
  resultDesc: string
  merchantRequestID: string
  checkoutRequestID: string
  amount?: number
  transactionDate?: string
  receiptNumber?: string
} {
  const stkCallback = callback.Body.stkCallback
  const resultCode = stkCallback.ResultCode
  const success = resultCode === 0

  let amount: number | undefined
  let transactionDate: string | undefined
  let receiptNumber: string | undefined

  if (stkCallback.CallbackMetadata?.Item) {
    const items = stkCallback.CallbackMetadata.Item
    const amountItem = items.find(item => item.Name === 'Amount')
    const dateItem = items.find(item => item.Name === 'TransactionDate')
    const receiptItem = items.find(item => item.Name === 'MpesaReceiptNumber')

    if (amountItem) amount = amountItem.Value as number
    if (dateItem) transactionDate = dateItem.Value as string
    if (receiptItem) receiptNumber = receiptItem.Value as string
  }

  return {
    success,
    resultCode,
    resultDesc: stkCallback.ResultDesc,
    merchantRequestID: stkCallback.MerchantRequestID,
    checkoutRequestID: stkCallback.CheckoutRequestID,
    amount,
    transactionDate,
    receiptNumber
  }
}

/**
 * Helper: Format phone number to 254XXXXXXXXX format
 */
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '')

  // If starts with 0, replace with 254
  if (cleaned.startsWith('0')) {
    return '254' + cleaned.substring(1)
  }

  // If already has 254, keep it
  if (cleaned.startsWith('254')) {
    return cleaned
  }

  // If just 10 digits, assume Kenya 254
  if (cleaned.length === 10) {
    return '254' + cleaned
  }

  return cleaned
}

/**
 * Helper: Generate timestamp in format YYYYMMDDHHmmss
 */
function getTimestamp(): string {
  const now = new Date()
  return (
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')
  )
}

/**
 * Helper: Generate M-Pesa password
 */
function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(shortcode + passkey + timestamp).toString('base64')
}
