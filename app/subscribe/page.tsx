'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/components/theme/ThemeProvider'

const plans = [
  {
    id: 'free',
    name: 'Free',
    users: 1,
    price: 0,
    features: [
      'Basic AI diagnosis',
      'GPS location services',
      'Emergency tools',
      'Hospital finder',
      'Basic symptom checker'
    ]
  },
  {
    id: 'student',
    name: 'Student',
    users: 1,
    price: 3.99,
    features: [
      'All premium features',
      'Telemedicine access',
      'IoT device sync',
      'Health insights',
      'Cloud records',
      'Student discount'
    ],
    discount: true
  },
  {
    id: 'individual',
    name: 'Individual',
    users: 1,
    price: 5.99,
    features: [
      'Full premium access',
      'Unlimited consultations',
      'All IoT integrations',
      'Priority support',
      'Advanced analytics'
    ],
    popular: true
  },
  {
    id: 'small-group',
    name: 'Small Group',
    users: 5,
    price: 12.99,
    features: [
      'Up to 5 users',
      'Shared dashboard',
      'Family health tracking',
      'Group appointments',
      'Coordinated care'
    ]
  },
  {
    id: 'family',
    name: 'Family',
    users: 8,
    price: 19.99,
    features: [
      'Up to 8 users',
      'Multi-profile management',
      'Elderly care features',
      'Health monitoring',
      'Priority booking'
    ]
  }
]

export default function SubscribePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isDark, setTheme } = useTheme()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [currentSubscription, setCurrentSubscription] = useState<any>(null)

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchCurrentSubscription()
    }
  }, [status, router])

  const fetchCurrentSubscription = async () => {
    try {
      const res = await fetch('/api/subscription')
      if (res.ok) {
        const data = await res.json()
        setCurrentSubscription(data)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    }
  }

  const handleSelectPlan = (planId: string) => {
    if (planId === 'free') {
      // Handle free plan selection
      handleSubscribe(planId)
    } else {
      setSelectedPlan(planId)
      router.push(`/subscribe/payment?plan=${planId}`)
    }
  }

  const handleSubscribe = async (planId: string) => {
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId })
      })
      if (res.ok) {
        router.push('/dashboard/patient?premium=activated')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update subscription')
      }
    } catch (error) {
      console.error('Failed to subscribe:', error)
      alert('Failed to update subscription')
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) return null

  return (
    <div className="page-shell min-h-screen">
      <nav className="surface shadow-sm border-b subtle-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-2xl font-bold text-cyan-500 hover:opacity-80 cursor-pointer">
              RemoDoc
            </Link>
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
              <Link
                href="/dashboard/patient"
                className="px-4 py-2 text-sm text-cyan-500 hover:text-cyan-600"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-cyan-500 mb-4">
            Choose Your Premium Plan
          </h1>
          <p className="text-xl text-cyan-500">
            Select a plan to unlock premium features
          </p>
          {currentSubscription && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg inline-block">
              <p className="text-sm text-cyan-500">
                Current Plan: <span className="font-semibold">{currentSubscription.plan}</span>
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.plan?.toLowerCase() === plan.id
            const isFree = plan.id === 'free'
            
            return (
              <div
                key={plan.id}
                className={`surface rounded-lg p-6 shadow-sm border subtle-border relative ${
                  plan.popular ? 'ring-2 ring-cyan-500' : ''
                } ${isCurrentPlan ? 'bg-cyan-50' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-cyan-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                {plan.discount && (
                  <div className="absolute -top-3 right-3">
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                      Student
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-cyan-500 mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-cyan-500">${plan.price}</span>
                    {plan.price > 0 && (
                      <span className="text-cyan-500">/month</span>
                    )}
                  </div>
                  <p className="text-sm text-cyan-500">
                    {plan.users === 1 ? '1 user' : `Up to ${plan.users} users`}
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-cyan-500">
                      <span className="mr-2 text-green-500">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                      : plan.price === 0
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : plan.popular
                      ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isCurrentPlan ? 'Current Plan' : isFree ? 'Select Free Plan' : 'Subscribe'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

