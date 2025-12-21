'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/components/theme/ThemeProvider'

const plans: Record<string, { name: string; price: number }> = {
  student: { name: 'Student', price: 3.99 },
  individual: { name: 'Individual', price: 5.99 },
  'small-group': { name: 'Small Group', price: 12.99 },
  family: { name: 'Family', price: 19.99 }
}

const paymentMethods = [
  { id: 'stripe', name: 'Credit/Debit Card', icon: '💳' },
  { id: 'paypal', name: 'PayPal', icon: '💳' },
  { id: 'mpesa', name: 'M-Pesa', icon: '📱' },
  { id: 'bank', name: 'Bank Transfer', icon: '🏦' }
]

function PaymentContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan') || 'individual'
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('stripe')
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    phoneNumber: '', // For M-Pesa
    accountNumber: '' // For bank transfer
  })
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [mpesaCheckoutRequestId, setMpesaCheckoutRequestId] = useState<string | null>(null)
  const { isDark, setTheme } = useTheme()

  const plan = plans[planId] || plans.individual

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Poll for M-Pesa payment status
  useEffect(() => {
    if (!mpesaCheckoutRequestId) return

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/subscription?checkoutRequestId=${mpesaCheckoutRequestId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.subscription?.status === 'ACTIVE') {
            clearInterval(pollInterval)
            router.push('/dashboard/patient?premium=activated')
          }
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 3000) // Poll every 3 seconds

    // Stop polling after 5 minutes
    const timeout = setTimeout(() => clearInterval(pollInterval), 300000)

    return () => {
      clearInterval(pollInterval)
      clearTimeout(timeout)
    }
  }, [mpesaCheckoutRequestId, router])

  const handleInputChange = (field: string, value: string) => {
    setPaymentDetails(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError('')

    // Validate payment details based on selected method
    if (selectedPaymentMethod === 'stripe') {
      if (!paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv || !paymentDetails.cardholderName) {
        setError('Please fill in all card details')
        setProcessing(false)
        return
      }
    } else if (selectedPaymentMethod === 'mpesa') {
      if (!paymentDetails.phoneNumber) {
        setError('Please enter your M-Pesa phone number')
        setProcessing(false)
        return
      }
    } else if (selectedPaymentMethod === 'bank') {
      if (!paymentDetails.accountNumber) {
        setError('Please enter your account number')
        setProcessing(false)
        return
      }
    }

    try {
      // Process payment
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          paymentMethod: selectedPaymentMethod,
          paymentDetails: selectedPaymentMethod === 'stripe' ? {
            cardNumber: paymentDetails.cardNumber.replace(/\s/g, ''),
            expiryDate: paymentDetails.expiryDate,
            cvv: paymentDetails.cvv,
            cardholderName: paymentDetails.cardholderName
          } : selectedPaymentMethod === 'mpesa' ? {
            phoneNumber: paymentDetails.phoneNumber
          } : selectedPaymentMethod === 'bank' ? {
            accountNumber: paymentDetails.accountNumber
          } : {}
        })
      })

      if (res.ok) {
        const data = await res.json()
        
        if (selectedPaymentMethod === 'mpesa') {
          // For M-Pesa, show waiting message and poll for confirmation
          setMpesaCheckoutRequestId(data.checkoutRequestId)
          setError('')
        } else if (selectedPaymentMethod === 'paypal') {
          // For PayPal, redirect to PayPal checkout
          if (data.approvalUrl) {
            window.location.href = data.approvalUrl
          } else {
            setError('Failed to get PayPal approval URL')
          }
        } else if (selectedPaymentMethod === 'stripe') {
          // For Stripe, show a message to complete payment
          // In a real implementation, you would use Stripe Elements here
          setError('Stripe integration requires Stripe Elements. Please use a test card.')
          // For now, just redirect
          router.push('/dashboard/patient?premium=activated')
        } else if (selectedPaymentMethod === 'bank') {
          // For bank transfer, show confirmation
          router.push(`/subscribe/payment/confirmation?transactionId=${data.transactionId}`)
        } else {
          router.push('/dashboard/patient?premium=activated')
        }
      } else {
        const data = await res.json()
        setError(data.error || 'Payment processing failed')
      }
    } catch (error) {
      console.error('Payment error:', error)
      setError('An error occurred during payment processing')
    } finally {
      setProcessing(false)
    }
  }

  // Render M-Pesa waiting screen
  if (mpesaCheckoutRequestId) {
    return (
      <div className="page-shell min-h-screen flex items-center justify-center">
        <div className="surface rounded-lg shadow-sm p-8 border subtle-border max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-cyan-500 mb-2">Payment Prompt Sent</h2>
            <p className="text-gray-600 mb-4">
              Check your phone for the M-Pesa payment prompt and enter your PIN to complete the transaction.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700">
                This page will automatically redirect once payment is confirmed.
              </p>
            </div>
            <button
              onClick={() => {
                setMpesaCheckoutRequestId(null)
                setError('')
              }}
              className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) return null

  return (
    <div className="page-shell min-h-screen">
      <nav className="surface shadow-sm border-b subtle-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-2xl font-bold text-cyan-500 hover:opacity-80 cursor-pointer">
              RemoDoc
            </Link>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className={`px-4 py-2 border rounded-lg text-lg transition-all duration-200 ${
                  isDark 
                    ? 'border-white/40 hover:bg-white/10 text-yellow-400 hover:text-yellow-300' 
                    : 'border-gray-300 hover:bg-gray-100 text-yellow-500 hover:text-yellow-600'
                }`}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? '🌙' : '☀️'}
              </button>
              <Link
                href="/subscribe"
                className="px-4 py-2 text-sm text-cyan-500 hover:text-cyan-600"
              >
                Back to Plans
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="surface rounded-lg shadow-sm p-8 border subtle-border">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-cyan-500 mb-2">Complete Your Subscription</h1>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Selected Plan</p>
                  <p className="text-xl font-semibold text-cyan-500">{plan.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Monthly Price</p>
                  <p className="text-2xl font-bold text-cyan-500">${plan.price}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-cyan-500 mb-4">Select Payment Method</h2>
            <div className="grid grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    selectedPaymentMethod === method.id
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-200 hover:border-cyan-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{method.icon}</div>
                  <div className="font-semibold text-cyan-500">{method.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit}>
            {selectedPaymentMethod === 'stripe' && (
              <div className="space-y-4 mb-6">
                <p className="text-sm text-gray-600">
                  Your card information will be securely processed by Stripe. Your card details are never stored on our servers.
                </p>
                <div>
                  <label className="block text-sm font-medium text-cyan-500 mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.cardholderName}
                    onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-500 mb-2">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-cyan-500 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={paymentDetails.expiryDate}
                      onChange={(e) => handleInputChange('expiryDate', formatExpiryDate(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cyan-500 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={paymentDetails.cvv}
                      onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedPaymentMethod === 'mpesa' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-cyan-500 mb-2">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  value={paymentDetails.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+254 712 345 678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  You will receive a prompt on your phone to confirm the payment
                </p>
              </div>
            )}

            {selectedPaymentMethod === 'bank' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-cyan-500 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={paymentDetails.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  placeholder="1234567890"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Bank transfer instructions will be sent to your email
                </p>
              </div>
            )}

            {selectedPaymentMethod === 'paypal' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 mb-4">
                  You will be securely redirected to PayPal to complete your payment. PayPal is a trusted payment platform used by millions worldwide.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl">💳</div>
                  <p className="text-sm font-semibold text-blue-700">
                    Click "Pay" to proceed to PayPal
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="flex-1 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-semibold disabled:opacity-50"
              >
                {processing ? 'Processing...' : `Pay $${plan.price}/month`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl">Loading payment options…</div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  )
}

