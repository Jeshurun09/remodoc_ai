'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoSigninError, setAutoSigninError] = useState('')

  useEffect(() => {
    const paramEmail = searchParams.get('email')
    if (paramEmail) {
      setEmail(paramEmail)
    }
  }, [searchParams])

  const handleVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setAutoSigninError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Verification failed')
        return
      }

      setSuccess('Email verified! Signing you in...')

      const stored = typeof window !== 'undefined'
        ? sessionStorage.getItem('remodocPendingCredentials')
        : null

      if (stored) {
        const { email: storedEmail, password } = JSON.parse(stored)
        const signInResult = await signIn('credentials', {
          email: storedEmail,
          password,
          redirect: false
        })

        sessionStorage.removeItem('remodocPendingCredentials')

        if (signInResult?.error) {
          setAutoSigninError('Verified, but automatic sign-in failed. Please sign in manually.')
        } else {
          router.push('/dashboard')
          return
        }
      } else {
        setAutoSigninError('Verified! Please sign in with your credentials.')
      }
    } catch (err) {
      setError('Failed to verify code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-black">
        <div className="text-center mb-8 text-black">
          <h1 className="text-3xl font-bold text-green-600">Verify Your Email</h1>
          <p className="text-gray-600 mt-2">
            Enter the code we sent to your email to activate your account.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
              {success}
            </div>
          )}
          {autoSigninError && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              {autoSigninError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Email
            </label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Verification Code
            </label>
            <input
              type='text'
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black tracking-[0.5rem]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

