'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import CasesList from '@/components/doctor/CasesList'
import PrescriptionsList from '@/components/doctor/PrescriptionsList'
import ChatInterface from '@/components/doctor/ChatInterface'

export default function DoctorDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'cases' | 'prescriptions' | 'chat'>('cases')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (status === 'authenticated' && session?.user.role !== 'DOCTOR') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">RemoDoc - Doctor Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Dr. {session.user.name}</span>
              <Link
                href="/api/auth/signout"
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('cases')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'cases'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Cases
              </button>
              <button
                onClick={() => setActiveTab('prescriptions')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'prescriptions'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Prescriptions
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'chat'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Messages
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'cases' && <CasesList />}
            {activeTab === 'prescriptions' && <PrescriptionsList />}
            {activeTab === 'chat' && <ChatInterface />}
          </div>
        </div>
      </div>
    </div>
  )
}

