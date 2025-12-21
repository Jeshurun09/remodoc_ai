'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '@/components/theme/ThemeProvider'
import dynamic from 'next/dynamic'
import SymptomChecker from '@/components/patient/SymptomChecker'
import AppointmentsList from '@/components/patient/AppointmentsList'
import EmergencyBeacon from '@/components/patient/EmergencyBeacon'
import EmergencyContactsManager from '@/components/patient/EmergencyContactsManager'
import Telemedicine from '@/components/patient/Telemedicine'
import IoTHealthSync from '@/components/patient/IoTHealthSync'
import HealthInsights from '@/components/patient/HealthInsights'
import Accessibility from '@/components/patient/Accessibility'
import CloudHealthRecords from '@/components/patient/CloudHealthRecords'
import VoiceHealthAnalysis from '@/components/patient/VoiceHealthAnalysis'
import MedicalReportSummary from '@/components/patient/MedicalReportSummary'
import SymptomPatternRecognition from '@/components/patient/SymptomPatternRecognition'
import SkinLesionScanner from '@/components/patient/SkinLesionScanner'
import HealthTimeMachine from '@/components/patient/HealthTimeMachine'

const HospitalMap = dynamic(() => import('@/components/patient/HospitalMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center bg-gray-100 rounded-lg">
      <p className="text-gray-600">Loading map…</p>
    </div>
  )
})

export default function PatientDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isDark, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'symptoms' | 'hospitals' | 'appointments' | 'telemedicine' | 'iot' | 'insights' | 'accessibility' | 'records' | 'emergency' | 'voice-health' | 'report-summary' | 'pattern-recognition' | 'skin-scanner' | 'timeline'>('symptoms')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [subscription, setSubscription] = useState<{ plan: string; status: string } | null>(null)
  const [isPremium, setIsPremium] = useState(false)

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }
    if (status === 'authenticated') {
      if (session?.user.role !== 'PATIENT') {
        router.replace('/dashboard')
        return
      }
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
        (error: GeolocationPositionError) => {
          // Handle different geolocation error types
          let errorMessage = 'Unable to get your location'
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions to use location-based features.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.'
              break
            default:
              errorMessage = `Location error: ${error.message || 'Unknown error'}`
              break
          }
          
          // Only log non-permission errors (permission denied is expected in some cases)
          if (error.code !== error.PERMISSION_DENIED) {
            console.warn('Geolocation error:', {
              code: error.code,
              message: error.message,
              type: error.code === error.PERMISSION_DENIED ? 'PERMISSION_DENIED' :
                    error.code === error.POSITION_UNAVAILABLE ? 'POSITION_UNAVAILABLE' :
                    error.code === error.TIMEOUT ? 'TIMEOUT' : 'UNKNOWN'
            })
          }
          
          // Location will remain null, which is fine - components should handle null location gracefully
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      )
    } else {
      console.warn('Geolocation is not supported by this browser')
    }

    // Fetch subscription status
    if (status === 'authenticated') {
      fetchSubscription()
    }

    // Check for premium activation message
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('premium') === 'activated') {
      fetchSubscription()
      // Remove query param
      window.history.replaceState({}, '', '/dashboard/patient')
    }
  }, [status, session, router])

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/subscription')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data)
        // Check if user has premium (not FREE)
        setIsPremium(data.plan && data.plan !== 'FREE' && data.status === 'ACTIVE')
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    }
  }

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

  if (session.user.role !== 'PATIENT') {
    return null
  }

  return (
    <div className="page-shell">
      <nav className="surface shadow-sm border-b subtle-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-cyan-500 hover:opacity-80 cursor-pointer">
                RemoDoc
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {subscription && (
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700">
                  {subscription.plan === 'FREE' ? 'Free Plan' : `${subscription.plan} Plan`}
                </div>
              )}
              {!isPremium && (
                <Link
                  href="/subscribe"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 text-sm font-semibold"
                >
                  ⭐ Upgrade to Premium
                </Link>
              )}
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
              <span className="text-cyan-500">{session.user.name}</span>
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
                onClick={() => setActiveTab('symptoms')}
                className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'symptoms'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-cyan-500 hover:text-cyan-600'
                }`}
              >
                Symptom Checker
              </button>
              <button
                onClick={() => setActiveTab('hospitals')}
                className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'hospitals'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-cyan-500 hover:text-cyan-600'
                }`}
              >
                Find Hospitals
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'appointments'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-cyan-500 hover:text-cyan-600'
                }`}
              >
                Appointments
              </button>
              <button
                onClick={() => setActiveTab('emergency')}
                className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'emergency'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-cyan-500 hover:text-cyan-600'
                }`}
              >
                🚨 Emergency Contacts
              </button>
              <button
                onClick={() => setActiveTab('voice-health')}
                className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'voice-health'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-cyan-500 hover:text-cyan-600'
                }`}
              >
                🎤 Voice Health
              </button>
              <button
                onClick={() => setActiveTab('report-summary')}
                className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'report-summary'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-cyan-500 hover:text-cyan-600'
                }`}
              >
                📄 Report Summary
              </button>
              <button
                onClick={() => setActiveTab('pattern-recognition')}
                className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'pattern-recognition'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-cyan-500 hover:text-cyan-600'
                }`}
              >
                🔍 Pattern Recognition
              </button>
              <button
                onClick={() => setActiveTab('skin-scanner')}
                className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'skin-scanner'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-cyan-500 hover:text-cyan-600'
                }`}
              >
                📷 Skin Scanner
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'timeline'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-cyan-500 hover:text-cyan-600'
                }`}
              >
                ⏰ Health Timeline
              </button>
              {isPremium ? (
                <>
                  <button
                    onClick={() => setActiveTab('telemedicine')}
                    className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                      activeTab === 'telemedicine'
                        ? 'border-b-2 border-cyan-500 text-cyan-500'
                        : 'text-cyan-500 hover:text-cyan-600'
                    }`}
                  >
                    💬 Telemedicine
                  </button>
                  <button
                    onClick={() => setActiveTab('iot')}
                    className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                      activeTab === 'iot'
                        ? 'border-b-2 border-cyan-500 text-cyan-500'
                        : 'text-cyan-500 hover:text-cyan-600'
                    }`}
                  >
                    ⌚ IoT Sync
                  </button>
                  <button
                    onClick={() => setActiveTab('insights')}
                    className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                      activeTab === 'insights'
                        ? 'border-b-2 border-cyan-500 text-cyan-500'
                        : 'text-cyan-500 hover:text-cyan-600'
                    }`}
                  >
                    💡 Insights
                  </button>
                  <button
                    onClick={() => setActiveTab('accessibility')}
                    className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                      activeTab === 'accessibility'
                        ? 'border-b-2 border-cyan-500 text-cyan-500'
                        : 'text-cyan-500 hover:text-cyan-600'
                    }`}
                  >
                    ♿ Accessibility
                  </button>
                  <button
                    onClick={() => setActiveTab('records')}
                    className={`px-4 py-4 text-sm font-medium whitespace-nowrap ${
                      activeTab === 'records'
                        ? 'border-b-2 border-cyan-500 text-cyan-500'
                        : 'text-cyan-500 hover:text-cyan-600'
                    }`}
                  >
                    🔒 Health Records
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push('/subscribe')}
                  className="px-4 py-4 text-sm font-medium whitespace-nowrap text-cyan-500 hover:text-cyan-600 border-b-2 border-transparent hover:border-cyan-300"
                >
                  ⭐ Premium Features
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'symptoms' && <SymptomChecker location={location} />}
            {activeTab === 'hospitals' && <HospitalMap location={location} />}
            {activeTab === 'appointments' && <AppointmentsList />}
            {activeTab === 'emergency' && <EmergencyContactsManager isDark={isDark} />}
            {activeTab === 'voice-health' && <VoiceHealthAnalysis />}
            {activeTab === 'report-summary' && <MedicalReportSummary />}
            {activeTab === 'pattern-recognition' && <SymptomPatternRecognition />}
            {activeTab === 'skin-scanner' && <SkinLesionScanner />}
            {activeTab === 'timeline' && <HealthTimeMachine />}
            {isPremium ? (
              <>
                {activeTab === 'telemedicine' && <Telemedicine />}
                {activeTab === 'iot' && <IoTHealthSync />}
                {activeTab === 'insights' && <HealthInsights />}
                {activeTab === 'accessibility' && <Accessibility />}
                {activeTab === 'records' && <CloudHealthRecords />}
              </>
            ) : (
              (activeTab === 'telemedicine' || activeTab === 'iot' || activeTab === 'insights' || activeTab === 'accessibility' || activeTab === 'records') && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⭐</div>
                  <h3 className="text-2xl font-bold text-cyan-500 mb-4">Premium Feature</h3>
                  <p className="text-cyan-500 mb-6">
                    This feature is available with a premium subscription
                  </p>
                  <Link
                    href="/subscribe"
                    className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 font-semibold"
                  >
                    Upgrade to Premium
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </div>
      <EmergencyBeacon location={location} />
    </div>
  )
}

