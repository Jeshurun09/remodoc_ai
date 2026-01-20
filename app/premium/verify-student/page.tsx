'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface VerificationStatus {
  verified: boolean
  provider?: string
  expiryDate?: string
}

export default function StudentVerificationPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [status, setStatus] = useState<VerificationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'SheerID' | 'UNiDAYS' | 'StudentBeans' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form fields for SheerID
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState(session?.user?.email || '')

  // For UNiDAYS and StudentBeans OAuth
  const [uniDaysAccessToken, setUniDaysAccessToken] = useState('')
  const [studentBeansAccessToken, setStudentBeansAccessToken] = useState('')

  useEffect(() => {
    fetchVerificationStatus()
  }, [session])

  const fetchVerificationStatus = async () => {
    try {
      const res = await fetch('/api/student-verification')
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      console.error('Error fetching verification status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSheerIDVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setVerifying(true)

    try {
      const res = await fetch('/api/student-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'SheerID',
          accessToken: 'sheerid-token', // SheerID uses their own token flow
          firstName,
          lastName,
          email,
        }),
      })

      const data = await res.json()

      if (data.verified) {
        setSuccess(true)
        setSelectedProvider(null)
        setFirstName('')
        setLastName('')
        setTimeout(() => {
          fetchVerificationStatus()
          setSuccess(false)
        }, 2000)
      } else {
        setError(data.message || 'Verification failed. Please check your information.')
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
      console.error('Error:', err)
    } finally {
      setVerifying(false)
    }
  }

  const handleUniDaysVerification = async () => {
    setError('')
    setVerifying(true)

    try {
      const res = await fetch('/api/student-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'UNiDAYS',
          accessToken: uniDaysAccessToken,
          email: session?.user?.email,
        }),
      })

      const data = await res.json()

      if (data.verified) {
        setSuccess(true)
        setSelectedProvider(null)
        setTimeout(() => {
          fetchVerificationStatus()
          setSuccess(false)
        }, 2000)
      } else {
        setError(data.message || 'Verification failed.')
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleStudentBeansVerification = async () => {
    setError('')
    setVerifying(true)

    try {
      const res = await fetch('/api/student-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'StudentBeans',
          accessToken: studentBeansAccessToken,
          email: session?.user?.email,
        }),
      })

      const data = await res.json()

      if (data.verified) {
        setSuccess(true)
        setSelectedProvider(null)
        setTimeout(() => {
          fetchVerificationStatus()
          setSuccess(false)
        }, 2000)
      } else {
        setError(data.message || 'Verification failed.')
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleRevokeVerification = async () => {
    if (confirm('Are you sure you want to revoke your student verification?')) {
      try {
        await fetch('/api/student-verification', { method: 'DELETE' })
        setStatus({ verified: false })
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      } catch (err) {
        setError('Failed to revoke verification')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/premium/profile" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            ← Back to Premium Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Student Verification</h1>
          <p className="text-gray-600 mt-2">Verify your student status to unlock the Student Plan with special pricing</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-900 font-medium">✓ Verification successful! Your plan has been upgraded.</p>
          </div>
        )}

        {/* Current Status */}
        {status?.verified ? (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Student Verified</h2>
                <p className="text-gray-600">Your student status has been verified</p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Verification Provider</p>
                  <p className="text-lg font-semibold text-gray-900">{status.provider}</p>
                </div>
                {status.expiryDate && (
                  <div>
                    <p className="text-sm text-gray-600">Valid Until</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(status.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleRevokeVerification}
              className="text-red-600 hover:text-red-700 font-medium text-sm"
            >
              Revoke Verification
            </button>
          </div>
        ) : (
          <>
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-900">{error}</p>
              </div>
            )}

            {/* Verification Methods */}
            {!selectedProvider ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* SheerID */}
                <button
                  onClick={() => setSelectedProvider('SheerID')}
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v4h8v-4zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">SheerID</h3>
                  <p className="text-sm text-gray-600 mb-4">Verify with your school email and personal information</p>
                  <span className="text-blue-600 font-medium text-sm">Verify with SheerID →</span>
                </button>

                {/* UNiDAYS */}
                <button
                  onClick={() => setSelectedProvider('UNiDAYS')}
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">UNiDAYS</h3>
                  <p className="text-sm text-gray-600 mb-4">Quick verification through your UNiDAYS account</p>
                  <span className="text-blue-600 font-medium text-sm">Connect with UNiDAYS →</span>
                </button>

                {/* Student Beans */}
                <button
                  onClick={() => setSelectedProvider('StudentBeans')}
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Student Beans</h3>
                  <p className="text-sm text-gray-600 mb-4">Verify through your Student Beans account</p>
                  <span className="text-blue-600 font-medium text-sm">Connect with Student Beans →</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8">
                {selectedProvider === 'SheerID' && (
                  <form onSubmit={handleSheerIDVerification}>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Verify with SheerID</h2>

                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your first name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your last name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your student email"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        disabled={verifying || !firstName || !lastName || !email}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
                      >
                        {verifying ? 'Verifying...' : 'Verify'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProvider(null)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}

                {selectedProvider === 'UNiDAYS' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Connect with UNiDAYS</h2>

                    <div className="bg-purple-50 rounded-lg p-4 mb-6 border border-purple-200">
                      <p className="text-sm text-purple-900 mb-4">
                        You'll be redirected to UNiDAYS to verify your student status securely.
                      </p>
                    </div>

                    <textarea
                      value={uniDaysAccessToken}
                      onChange={e => setUniDaysAccessToken(e.target.value)}
                      placeholder="Paste your UNiDAYS access token here"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-6 font-mono text-sm"
                      rows={4}
                    />

                    <div className="flex gap-4">
                      <button
                        onClick={handleUniDaysVerification}
                        disabled={verifying || !uniDaysAccessToken}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
                      >
                        {verifying ? 'Verifying...' : 'Verify with Token'}
                      </button>
                      <button
                        onClick={() => setSelectedProvider(null)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      <a href="https://www.myunidays.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Don't have a UNiDAYS account? Create one here
                      </a>
                    </p>
                  </div>
                )}

                {selectedProvider === 'StudentBeans' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Connect with Student Beans</h2>

                    <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
                      <p className="text-sm text-green-900 mb-4">
                        You'll be redirected to Student Beans to verify your student status securely.
                      </p>
                    </div>

                    <textarea
                      value={studentBeansAccessToken}
                      onChange={e => setStudentBeansAccessToken(e.target.value)}
                      placeholder="Paste your Student Beans access token here"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-6 font-mono text-sm"
                      rows={4}
                    />

                    <div className="flex gap-4">
                      <button
                        onClick={handleStudentBeansVerification}
                        disabled={verifying || !studentBeansAccessToken}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
                      >
                        {verifying ? 'Verifying...' : 'Verify with Token'}
                      </button>
                      <button
                        onClick={() => setSelectedProvider(null)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      <a href="https://studentbeans.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Don't have a Student Beans account? Create one here
                      </a>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Info Box */}
            <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">Why Verify Your Student Status?</h3>
              <ul className="text-sm text-blue-900 space-y-2">
                <li>✓ Get the <span className="font-semibold">Student Plan</span> at special pricing</li>
                <li>✓ Access premium features at student rates</li>
                <li>✓ Annual verification with automatic renewal</li>
                <li>✓ Quick and secure verification process</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
