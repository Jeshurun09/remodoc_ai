'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { SubscriptionPlan } from '@prisma/client'

interface PremiumData {
  currentPlan: SubscriptionPlan
  availablePlans: SubscriptionPlan[]
  canUpgrade: boolean
  canDowngrade: boolean
  subscription: {
    status: string
    startDate: string
    endDate?: string
  }
  isGroupMember?: boolean
  groupId?: string
}

interface Feature {
  name: string
  allowed: boolean
  description: string
}

export default function PremiumProfilePage() {
  const { data: session } = useSession()
  const [premiumData, setPremiumData] = useState<PremiumData | null>(null)
  const [features, setFeatures] = useState<Record<string, boolean>>({})
  const [customFeatures, setCustomFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showChangePlan, setShowChangePlan] = useState(false)
  const [selectedNewPlan, setSelectedNewPlan] = useState<SubscriptionPlan | ''>('')

  useEffect(() => {
    const fetchPremiumData = async () => {
      if (!session?.user?.id) return

      try {
        // Fetch current plan info
        const planRes = await fetch('/api/subscription/change-plan')
        const planData = await planRes.json()
        setPremiumData(planData)

        // Fetch current features
        const featuresRes = await fetch('/api/subscription/group-features')
        const featuresData = await featuresRes.json()
        if (featuresData.features) {
          setFeatures(featuresData.features)
          setCustomFeatures(
            Object.entries(featuresData.features).map(([name, allowed]) => ({
              name,
              allowed: allowed as boolean,
              description: getFeatureDescription(name)
            }))
          )
        }
      } catch (err) {
        console.error('Error fetching premium data:', err)
        setError('Failed to load premium profile')
      } finally {
        setLoading(false)
      }
    }

    fetchPremiumData()
  }, [session])

  const getFeatureDescription = (featureName: string): string => {
    const descriptions: Record<string, string> = {
      aiSymptomChecker: 'AI-powered symptom analysis',
      appointmentBooking: 'Book and manage appointments',
      messaging: 'Direct messaging with doctors',
      healthRecordStorage: 'Store and access health records',
      vitalsTracking: 'Track vital signs',
      appointmentHistory: 'View appointment history',
      advancedAnalytics: 'Advanced health analytics',
      prioritySupport: 'Priority customer support',
      prescriptionManagement: 'Manage prescriptions',
      lifeStyleTracking: 'Track lifestyle metrics',
      emergencyAlerts: 'Emergency alert system',
      familySharing: 'Share with family members'
    }
    return descriptions[featureName] || featureName
  }

  const getPlanColor = (plan: SubscriptionPlan): string => {
    const colors: Record<SubscriptionPlan, string> = {
      FREE: 'bg-gray-100 text-gray-700',
      STUDENT: 'bg-blue-100 text-blue-700',
      INDIVIDUAL: 'bg-purple-100 text-purple-700',
      SMALL_GROUP: 'bg-green-100 text-green-700',
      FAMILY: 'bg-red-100 text-red-700'
    }
    return colors[plan] || 'bg-gray-100 text-gray-700'
  }

  const handlePlanChange = async () => {
    if (!selectedNewPlan) return

    try {
      const res = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPlan: selectedNewPlan,
          prorationPolicy: 'charge_difference'
        })
      })

      if (!res.ok) throw new Error('Failed to change plan')

      const data = await res.json()
      alert(`Plan successfully changed to ${selectedNewPlan}${data.proratedAmount ? `. Charge: KES ${(data.proratedAmount / 100).toFixed(2)}` : ''}`)
      
      // Refresh data
      window.location.reload()
    } catch (err) {
      setError('Failed to change plan')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading premium profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <Link href="/dashboard/patient" className="text-red-600 hover:text-red-700 mt-4 inline-block underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/patient" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Premium Profile</h1>
          <p className="text-gray-600">Manage your subscription and features</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Plan Card */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Plan</h2>
              
              <div className={`${getPlanColor(premiumData?.currentPlan || 'FREE')} rounded-lg p-6 mb-6 text-center`}>
                <p className="text-sm font-semibold mb-2 opacity-75">Current Subscription</p>
                <p className="text-4xl font-bold mb-4">{premiumData?.currentPlan || 'FREE'}</p>
                <p className="text-sm opacity-75">Status: <span className="font-semibold">{premiumData?.subscription?.status || 'ACTIVE'}</span></p>
              </div>

              {premiumData?.subscription?.endDate && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600">
                    Renewal Date: <span className="font-semibold text-gray-900">
                      {new Date(premiumData.subscription.endDate).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              )}

              {/* Change Plan Button */}
              <button
                onClick={() => setShowChangePlan(!showChangePlan)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                {showChangePlan ? 'Cancel' : 'Change Current Plan'}
              </button>

              {/* Plan Selection */}
              {showChangePlan && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select New Plan</h3>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {premiumData?.availablePlans.map(plan => (
                      <button
                        key={plan}
                        onClick={() => setSelectedNewPlan(plan)}
                        className={`p-4 rounded-lg font-semibold transition duration-200 ${
                          selectedNewPlan === plan
                            ? 'bg-indigo-600 text-white border-2 border-indigo-700'
                            : `${getPlanColor(plan)} border-2 border-transparent hover:border-indigo-400`
                        }`}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handlePlanChange}
                    disabled={!selectedNewPlan}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                  >
                    Confirm Plan Change
                  </button>
                </div>
              )}

              {/* Comparison Link */}
              <div className="mt-6 text-center">
                <Link
                  href="/premium/compare"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center gap-2"
                >
                  Compare All Plans
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Features Card */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Features</h2>
              
              <div className="space-y-3">
                {customFeatures.map(feature => (
                  <div key={feature.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div>
                      <p className="font-semibold text-gray-900">{feature.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{feature.name}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-semibold ${
                      feature.allowed
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {feature.allowed ? '✓ Enabled' : '✗ Disabled'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Group Info Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Group Information</h3>
              
              {premiumData?.isGroupMember ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      <span className="font-semibold">You are a member of a group subscription</span>
                    </p>
                  </div>
                  <Link
                    href={`/premium/group/${premiumData.groupId}`}
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    View Group Details
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 text-sm mb-4">You are not part of a group subscription</p>
                  <Link
                    href="/premium/create-group"
                    className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Create Group Plan
                  </Link>
                </div>
              )}
            </div>

            {/* Plan Comparison Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Plan Comparison</h3>
              <Link
                href="/pricing"
                className="block w-full text-center border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold py-2 px-4 rounded-lg transition"
              >
                View All Plans
              </Link>
            </div>

            {/* Support Card */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-indigo-900 mb-4">Need Help?</h3>
            {/* Student Verification */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-1.429 5.951 1.429a1 1 0 001.169-1.409l-7-14z" />
                </svg>
                <h4 className="font-semibold text-blue-900">Student? Get Special Pricing</h4>
              </div>
              <p className="text-sm text-blue-800 mb-4">
                Verify your student status to unlock the Student Plan with discounted rates on premium features.
              </p>
              <Link
                href="/premium/verify-student"
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Verify Student Status
              </Link>
            </div>

              <p className="text-indigo-700 text-sm mb-4">
                Contact our support team for any questions about your subscription.
              </p>
              <Link
                href="/support"
                className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
