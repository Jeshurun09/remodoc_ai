'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '@/components/theme/ThemeProvider'
import CasesList from '@/components/doctor/CasesList'
import PrescriptionsList from '@/components/doctor/PrescriptionsList'
import EnhancedMessaging from '@/components/doctor/EnhancedMessaging'
import TelemedicineConsultation from '@/components/doctor/TelemedicineConsultation'
import AvailabilityCalendar from '@/components/doctor/AvailabilityCalendar'
import VerificationStatus from '@/components/doctor/VerificationStatus'
import dynamic from 'next/dynamic'
import DoctorProfileEditor from '@/components/doctor/DoctorProfileEditor'
import AppointmentReminders from '@/components/doctor/AppointmentReminders'

export default function DoctorDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isDark, setTheme } = useTheme()
  const [showEditor, setShowEditor] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'cases' | 'prescriptions' | 'messages' | 'telemedicine' | 'availability' | 'profile'
  >('overview')

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }
    if (status === 'authenticated' && session?.user.role !== 'DOCTOR') {
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

  if (session.user.role !== 'DOCTOR') {
    return null
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
              <span className="text-2xl font-bold text-blue-500 ml-2">- Doctor Portal</span>
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
              <button
                onClick={() => setShowEditor(true)}
                className="text-gray-700 hover:underline focus:outline-none"
                aria-label="Edit doctor profile"
              >
                Dr. {session.user.name}
              </button>
              {showEditor && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditor(false)} />
                  <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 overflow-auto" role="dialog" aria-modal="true">
                    <div className="flex justify-end">
                      <button onClick={() => setShowEditor(false)} className="px-3 py-1 text-sm">Close</button>
                    </div>
                    <DoctorProfileEditor />
                  </div>
                </div>
              )}
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
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('cases')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'cases'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Cases
              </button>
              <button
                onClick={() => setActiveTab('prescriptions')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'prescriptions'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Prescriptions
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'messages'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Messages
              </button>
              <button
                onClick={() => setActiveTab('telemedicine')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'telemedicine'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Telemedicine
              </button>
              <button
                onClick={() => setActiveTab('availability')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'availability'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Availability
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Profile Update
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <VerificationStatus />
                <AppointmentReminders />
              </div>
            )}
            {activeTab === 'cases' && <CasesList />}
            {activeTab === 'prescriptions' && <PrescriptionsList />}
            {activeTab === 'messages' && <EnhancedMessaging />}
            {activeTab === 'telemedicine' && <TelemedicineConsultation />}
            {activeTab === 'availability' && <AvailabilityCalendar />}
            {activeTab === 'profile' && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold mb-4">Complete Your Doctor Profile</h2>
                <p className="text-gray-600 mb-6">
                  Update your professional information, credentials, and documents for verification.
                </p>
                <Link
                  href="/dashboard/doctor/profile-update"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-block"
                >
                  Start Profile Update
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

