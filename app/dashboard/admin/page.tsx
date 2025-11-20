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

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isDark, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'doctors' | 'hospitals' | 'analytics' | 'logs'>('doctors')

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (status === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) return null

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="surface rounded-lg shadow-sm mb-6">
          <div className="border-b subtle-border">
            <nav className="flex -mb-px">
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
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'logs'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                AI Logs
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'doctors' && <DoctorVerification />}
            {activeTab === 'hospitals' && <HospitalManagement />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'logs' && <AILogs />}
          </div>
        </div>
      </div>
    </div>
  )
}

