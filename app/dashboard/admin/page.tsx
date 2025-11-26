'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '@/components/theme/ThemeProvider'
import DoctorVerification from '@/components/admin/DoctorVerification'
import HospitalManagement from '@/components/admin/HospitalManagement'
import Analytics from '@/components/admin/Analytics'
import AILogs from '@/components/admin/AILogs'
import SystemConfiguration from '@/components/admin/SystemConfiguration'
import UserManagement from '@/components/admin/UserManagement'
import Reports from '@/components/admin/Reports'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isDark, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<
    'doctors' | 'hospitals' | 'analytics' | 'logs' | 'config' | 'users' | 'reports'
  >('doctors')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }
    if (status === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.replace('/dashboard')
      return
    }
  }, [status, session, router])

  // Don't render if not authenticated or wrong role
  if (status === 'loading') {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session) {
    return null
  }

  if (session.user.role !== 'ADMIN') {
    return null
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteStatus(null)

    try {
      setInviteLoading(true)
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: 'ADMIN' })
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteStatus({ type: 'error', message: data.error || 'Failed to send invite' })
        return
      }
      setInviteEmail('')
      setInviteStatus({ type: 'success', message: 'Invitation sent successfully.' })
    } catch (error) {
      setInviteStatus({ type: 'error', message: 'Failed to send invite. Try again later.' })
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="page-shell">
      <nav className="surface shadow-sm border-b subtle-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-500 hover:opacity-80 cursor-pointer">
                RemoDoc
              </Link>
              <span className="text-2xl font-bold text-blue-500 ml-2">- Admin Dashboard</span>
            </div>
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
              <span className="text-gray-700">{session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="surface rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Invite a new admin</h2>
          <p className="text-sm text-[var(--foreground)]/70 mb-4">
            Send a secure magic link to onboard trusted administrators.
          </p>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-600 mb-2">Admin Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                placeholder="admin@example.com"
              />
            </div>
            {inviteStatus && (
              <div
                className={`px-4 py-2 rounded ${
                  inviteStatus.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {inviteStatus.message}
              </div>
            )}
            <button
              type="submit"
              disabled={inviteLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {inviteLoading ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
        </div>

        <div className="surface rounded-lg shadow-sm mb-6">
          <div className="border-b subtle-border">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('doctors')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'doctors'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Doctor Verification
              </button>
              <button
                onClick={() => setActiveTab('hospitals')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'hospitals'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Hospitals
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'analytics'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'logs'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                AI Logs
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'config'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Configuration
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'reports'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Reports
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'doctors' && <DoctorVerification />}
            {activeTab === 'hospitals' && <HospitalManagement />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'logs' && <AILogs />}
            {activeTab === 'config' && <SystemConfiguration />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'reports' && <Reports />}
          </div>
        </div>
      </div>
    </div>
  )
}

