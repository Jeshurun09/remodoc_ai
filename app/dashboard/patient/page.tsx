'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import SymptomChecker from '@/components/patient/SymptomChecker'
import HospitalMap from '@/components/patient/HospitalMap'
import AppointmentsList from '@/components/patient/AppointmentsList'
import EmergencyBeacon from '@/components/patient/EmergencyBeacon'

export default function PatientDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'symptoms' | 'hospitals' | 'appointments'>('symptoms')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (status === 'authenticated' && session?.user.role !== 'PATIENT') {
      router.push('/dashboard')
    }

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
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
              <h1 className="text-2xl font-bold text-blue-600">RemoDoc</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{session.user.name}</span>
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
                onClick={() => setActiveTab('symptoms')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'symptoms'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Symptom Checker
              </button>
              <button
                onClick={() => setActiveTab('hospitals')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'hospitals'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Find Hospitals
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'appointments'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Appointments
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'symptoms' && <SymptomChecker location={location} />}
            {activeTab === 'hospitals' && <HospitalMap location={location} />}
            {activeTab === 'appointments' && <AppointmentsList />}
          </div>
        </div>
      </div>
      <EmergencyBeacon location={location} />
    </div>
  )
}

