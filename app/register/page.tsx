'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useTheme } from '@/components/theme/ThemeProvider'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'PATIENT' as 'PATIENT' | 'DOCTOR',
    phone: '',
    licenseNumber: '',
    specialization: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const { isDark, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphabets, spaces, hyphens, and apostrophes
    const value = e.target.value.replace(/[^a-zA-Z\s'-]/g, '')
    setFormData({ ...formData, name: value })
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numerical digits, plus sign, spaces, hyphens, and parentheses for formatting
    const value = e.target.value.replace(/[^\d+\s()-]/g, '')
    setFormData({ ...formData, phone: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate name format
    if (!/^[a-zA-Z\s'-]+$/.test(formData.name.trim())) {
      setError('Name should only contain letters, spaces, hyphens, and apostrophes')
      return
    }

    // Validate phone format (if provided)
    if (formData.phone && !/^[\d+\s()-]+$/.test(formData.phone.trim())) {
      setError('Phone number should only contain digits and formatting characters (+, spaces, hyphens, parentheses)')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      const normalizedEmail = formData.email.trim().toLowerCase()
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
            'remodocPendingCredentials',
            JSON.stringify({
              email: normalizedEmail,
              password: formData.password
            })
        )
      }
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'PATIENT',
        phone: '',
        licenseNumber: '',
        specialization: ''
      })
      router.push(`/verify?email=${encodeURIComponent(normalizedEmail)}`)
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialRegister = async (provider: 'google' | 'facebook' | 'twitter') => {
    setSocialLoading(provider)
    setError('')
    try {
      await signIn(provider, { callbackUrl: '/dashboard' })
    } catch (err) {
      setError(`Failed to sign in with ${provider}. Please try again.`)
      setSocialLoading(null)
    }
  }

  return (
    <div className="page-shell flex items-center justify-center py-12 relative">
      <button
        onClick={toggleTheme}
        className={`absolute top-4 right-4 px-4 py-2 border rounded-lg text-lg transition-all duration-200 ${
          isDark 
            ? 'border-white/40 hover:bg-white/10 text-yellow-400 hover:text-yellow-300' 
            : 'border-gray-300 hover:bg-gray-100 text-yellow-500 hover:text-yellow-600'
        }`}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? '🌙' : '☀️'}
      </button>
      <div className="max-w-md w-full surface rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-600">Create Account</h1>
          <p className="text-green-600 mt-2">Join RemoDoc today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              required
              pattern="[a-zA-Z\s'-]+"
              title="Name should only contain letters, spaces, hyphens, and apostrophes"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoComplete="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={handlePhoneChange}
              pattern="[\d+\s()-]+"
              title="Phone number should only contain digits, plus sign, spaces, hyphens, and parentheses"
              placeholder="e.g., +1 234 567 8900"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-red-600 mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'PATIENT' | 'DOCTOR' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-red-600 bg-transparent"
            >
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
            </select>
          </div>

          {formData.role === 'DOCTOR' && (
            <>
              <div>
                <label className="block text-sm font-medium text-blue-600 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-600 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] pr-24 bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showPassword ? 'Hide Password' : 'Show Password'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] pr-24 bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showConfirmPassword ? 'Hide Password' : 'Show Password'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[var(--card-bg)] text-[var(--foreground)]">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleSocialRegister('google')}
              disabled={socialLoading !== null}
              className={`w-full inline-flex justify-center items-center px-4 py-2 border rounded-lg shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isDark
                  ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="Sign in with Google"
            >
              {socialLoading === 'google' ? (
                <span className="text-xs">Loading...</span>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSocialRegister('facebook')}
              disabled={socialLoading !== null}
              className={`w-full inline-flex justify-center items-center px-4 py-2 border rounded-lg shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isDark
                  ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="Sign in with Facebook"
            >
              {socialLoading === 'facebook' ? (
                <span className="text-xs">Loading...</span>
              ) : (
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSocialRegister('twitter')}
              disabled={socialLoading !== null}
              className={`w-full inline-flex justify-center items-center px-4 py-2 border rounded-lg shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isDark
                  ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="Sign in with X (Twitter)"
            >
              {socialLoading === 'twitter' ? (
                <span className="text-xs">Loading...</span>
              ) : (
                <svg className="w-5 h-5" fill="#1DA1F2" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-[var(--foreground)]">
          <a href="/login" className="text-blue-600 hover:text-blue-700 text-sm">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  )
}

