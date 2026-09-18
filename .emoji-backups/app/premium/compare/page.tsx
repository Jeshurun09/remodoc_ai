'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SubscriptionPlan } from '@prisma/client'

const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  FREE: [
    'Basic symptom checker',
    'Limited health records storage',
    'Basic vital tracking',
    'Standard support'
  ],
  STUDENT: [
    'AI symptom checker',
    'Health records storage',
    'Vital signs tracking',
    'Appointment history',
    'Standard support',
    'Prescription management'
  ],
  INDIVIDUAL: [
    'AI symptom checker',
    'Full health records storage',
    'Advanced vital tracking',
    'Appointment booking & history',
    'Direct doctor messaging',
    'Advanced health analytics',
    'Prescription management',
    'Lifestyle tracking',
    'Priority support'
  ],
  SMALL_GROUP: [
    'All INDIVIDUAL features',
    'Up to 4 family/group members',
    'Group moderator controls',
    'Per-member feature management',
    'Family emergency alerts',
    'Shared health records (with permission)'
  ],
  FAMILY: [
    'All SMALL_GROUP features',
    'Up to 10 family members',
    'Advanced group management',
    'Per-member feature controls',
    'Emergency alert system',
    'Shared family health dashboard',
    'Family member invitations'
  ]
}

const PLAN_PRICING: Record<SubscriptionPlan, { price: number; currency: string; period: string }> = {
  FREE: { price: 0, currency: 'KES', period: 'Forever free' },
  STUDENT: { price: 299.99, currency: 'KES', period: '/month' },
  INDIVIDUAL: { price: 999.99, currency: 'KES', period: '/month' },
  SMALL_GROUP: { price: 1999.99, currency: 'KES', period: '/month' },
  FAMILY: { price: 2999.99, currency: 'KES', period: '/month' }
}

const PLAN_ORDER: SubscriptionPlan[] = ['FREE', 'STUDENT', 'INDIVIDUAL', 'SMALL_GROUP', 'FAMILY']

interface AllFeature {
  name: string
  id: string
}

// All possible features across all plans
const ALL_FEATURES: AllFeature[] = [
  { name: 'Basic Symptom Checker', id: 'symptomChecker' },
  { name: 'AI-Powered Diagnosis', id: 'aiSymptomChecker' },
  { name: 'Health Records Storage', id: 'healthRecordStorage' },
  { name: 'Advanced Analytics', id: 'advancedAnalytics' },
  { name: 'Vital Signs Tracking', id: 'vitalsTracking' },
  { name: 'Appointment Booking', id: 'appointmentBooking' },
  { name: 'Appointment History', id: 'appointmentHistory' },
  { name: 'Direct Doctor Messaging', id: 'messaging' },
  { name: 'Prescription Management', id: 'prescriptionManagement' },
  { name: 'Lifestyle Tracking', id: 'lifeStyleTracking' },
  { name: 'Emergency Alerts', id: 'emergencyAlerts' },
  { name: 'Family Sharing', id: 'familySharing' },
  { name: 'Group Moderator Controls', id: 'groupModeratorControls' },
  { name: 'Per-Member Feature Control', id: 'perMemberFeatureControl' },
  { name: 'Priority Support', id: 'prioritySupport' }
]

function hasFeature(plan: SubscriptionPlan, featureId: string): boolean {
  const featureNames = PLAN_FEATURES[plan] || []
  const featureMap: Record<string, string[]> = {
    symptomChecker: ['Basic symptom checker'],
    aiSymptomChecker: ['AI symptom checker', 'AI-powered symptom analysis'],
    healthRecordStorage: ['Health records storage', 'Full health records storage'],
    advancedAnalytics: ['Advanced health analytics'],
    vitalsTracking: ['Vital tracking', 'Vital signs tracking', 'Advanced vital tracking'],
    appointmentBooking: ['Appointment booking & history'],
    appointmentHistory: ['Appointment history'],
    messaging: ['Direct doctor messaging'],
    prescriptionManagement: ['Prescription management'],
    lifeStyleTracking: ['Lifestyle tracking'],
    emergencyAlerts: ['Family emergency alerts', 'Emergency alert system'],
    familySharing: ['Shared health records (with permission)', 'Shared family health dashboard'],
    groupModeratorControls: ['Group moderator controls'],
    perMemberFeatureControl: ['Per-member feature management', 'Per-member feature controls'],
    prioritySupport: ['Priority support', 'Standard support']
  }

  const keywords = featureMap[featureId] || []
  return featureNames.some(f =>
    keywords.some(k => f.toLowerCase().includes(k.toLowerCase()))
  )
}

function getPlanColor(plan: SubscriptionPlan): string {
  const colors: Record<SubscriptionPlan, string> = {
    FREE: 'bg-gray-100',
    STUDENT: 'bg-blue-100',
    INDIVIDUAL: 'bg-purple-100',
    SMALL_GROUP: 'bg-green-100',
    FAMILY: 'bg-red-100'
  }
  return colors[plan] || 'bg-gray-100'
}

function getPlanTextColor(plan: SubscriptionPlan): string {
  const colors: Record<SubscriptionPlan, string> = {
    FREE: 'text-gray-700',
    STUDENT: 'text-blue-700',
    INDIVIDUAL: 'text-purple-700',
    SMALL_GROUP: 'text-green-700',
    FAMILY: 'text-red-700'
  }
  return colors[plan] || 'text-gray-700'
}

export default function PlanComparisonPage() {
  const { data: session } = useSession()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/premium/profile" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            ← Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Plan Comparison</h1>
          <p className="text-gray-600 mt-2">See what features are included in each subscription plan</p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-900 w-48">Features</th>
                {PLAN_ORDER.map(plan => (
                  <th key={plan} className="text-center py-4 px-4">
                    <div className={`${getPlanColor(plan)} rounded-lg p-4 text-center`}>
                      <p className="font-bold text-lg">{plan}</p>
                      <p className="text-sm font-semibold mt-1">
                        {PLAN_PRICING[plan].price > 0 ? (
                          <>
                            {PLAN_PRICING[plan].currency} {PLAN_PRICING[plan].price.toLocaleString()}
                            <br />
                            <span className="text-xs font-normal">{PLAN_PRICING[plan].period}</span>
                          </>
                        ) : (
                          PLAN_PRICING[plan].period
                        )}
                      </p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_FEATURES.map((feature, idx) => (
                <tr key={feature.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-4 px-4 font-medium text-gray-900 border-r border-gray-200">
                    {feature.name}
                  </td>
                  {PLAN_ORDER.map(plan => (
                    <td key={`${plan}-${feature.id}`} className="py-4 px-4 text-center border-r border-gray-200 last:border-r-0">
                      {hasFeature(plan, feature.id) ? (
                        <div className="flex justify-center">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-5 gap-4">
          {PLAN_ORDER.map(plan => (
            <div key={plan} className="text-center">
              <Link
                href="/premium/profile"
                className={`inline-block px-6 py-2 rounded-lg font-medium transition-colors ${
                  session
                    ? `${getPlanColor(plan)} ${getPlanTextColor(plan)} hover:opacity-80`
                    : 'bg-gray-200 text-gray-600 hover:opacity-80'
                }`}
              >
                {session ? 'View Details' : 'Learn More'}
              </Link>
            </div>
          ))}
        </div>

        {/* Comparison Summary */}
        <div className="mt-16 bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Differences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-3">Individual Plans</h3>
              <ul className="space-y-2 text-gray-600">
                <li>✓ <span className="font-medium">FREE</span> - Basic features only</li>
                <li>✓ <span className="font-medium">STUDENT</span> - For students with limited needs</li>
                <li>✓ <span className="font-medium">INDIVIDUAL</span> - Full personal health management</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-3">Group Plans</h3>
              <ul className="space-y-2 text-gray-600">
                <li>✓ <span className="font-medium">SMALL_GROUP</span> - Up to 4 members with moderator control</li>
                <li>✓ <span className="font-medium">FAMILY</span> - Up to 10 members with full management</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Note:</span> Group plans include all individual features for each member, plus group-specific controls. Moderators can manage which features each member can access.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
