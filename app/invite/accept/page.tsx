'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

interface InviteInfo {
  email: string
  role: string
}

export default function InviteAcceptPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    if (!token) {
      setError('Missing invite token.')
      setInitializing(false)
      return
    }

    const validateInvite = async () => {
      try {
        const res = await fetch(`/api/invite/validate?token=${token}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Invite is invalid or expired.')
        } else {
          setInvite({ email: data.email, role: data.role })
        }
      } catch (err) {
        setError('Failed to validate invite. Please try again later.')
      } finally {
        setInitializing(false)
      }
    }

    validateInvite()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invite || !token) return

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name,
          password,
          phone: phone.trim() || undefined
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to accept invite.')
        return
      }

      setSuccess('Invitation accepted! Signing you in...')

      const signInResult = await signIn('credentials', {
        email: invite.email,
        password,
        redirect: false
      })

      if (signInResult?.error) {
        setError('Account created but automatic sign-in failed. Please log in manually.')
        setSuccess('')
        return
      }

      router.replace('/dashboard')
    } catch (err) {
      setError('Something went wrong. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="text-xl">Validating invitation…</div>
      </div>
    )
  }

  if (!invite || error) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="surface max-w-md w-full p-8 rounded-lg shadow">
          <h1 className="text-2xl font-semibold text-red-600 mb-4">Invitation Error</h1>
          <p className="text-[var(--foreground)] mb-4">{error || 'Invite not found.'}</p>
          <button
            onClick={() => router.replace('/login')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell flex items-center justify-center py-12">
      <div className="surface max-w-md w-full p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-green-600 mb-2">Accept Invitation</h1>
        <p className="text-[var(--foreground)]/80 mb-6">
          You have been invited to join RemoDoc as a <strong>{invite.role.toLowerCase()}</strong>.
          Complete your profile to activate your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">Email</label>
            <input
              type="email"
              value={invite.email}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-[var(--foreground)] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  )
}

