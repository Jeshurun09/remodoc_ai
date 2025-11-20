'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from '@/components/theme/ThemeProvider'

export default function PremiumPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const { theme, isDark, setTheme } = useTheme()

  const toggleTheme = () => {
    // Toggle between light and dark mode
    setTheme(isDark ? 'light' : 'dark')
  }

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
      popular: false,
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

  return (
    <div className="page-shell min-h-screen">
      <nav className="surface shadow-sm border-b subtle-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-2xl font-bold text-cyan-500">
              RemoDoc
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/" className="px-4 py-2 text-sm text-cyan-500 hover:text-cyan-600">
                Home
              </Link>
              <Link href="/login" className="px-4 py-2 text-sm text-cyan-500 hover:text-cyan-600">
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 text-sm"
              >
                Get Started
              </Link>
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
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-cyan-500 mb-4">
            Premium Healthcare Features
          </h1>
          <p className="text-xl text-cyan-500 max-w-3xl mx-auto">
            Access advanced telemedicine, IoT health tracking, and comprehensive care management
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Telemedicine & Doctor Access */}
          <div className="surface rounded-lg p-6 shadow-sm border subtle-border">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-cyan-500 mb-3">
              Telemedicine & Doctor Access
            </h3>
            <ul className="space-y-2 text-cyan-500">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Chat or video call with verified doctors</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Upload medical files (lab results, reports, images)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Get digital prescriptions</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Request follow-up consultations</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Receive medicine delivery (via pharmacy APIs)</span>
              </li>
            </ul>
          </div>

          {/* Appointment Booking */}
          <div className="surface rounded-lg p-6 shadow-sm border subtle-border">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-cyan-500 mb-3">
              Appointment Booking With Hospitals
            </h3>
            <ul className="space-y-2 text-cyan-500">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>View doctors' availability in real-time</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Book and manage appointments seamlessly</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Receive automated reminders and updates</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Reschedule or cancel with ease</span>
              </li>
            </ul>
          </div>

          {/* IoT & Wearable Health Sync */}
          <div className="surface rounded-lg p-6 shadow-sm border subtle-border">
            <div className="text-4xl mb-4">⌚</div>
            <h3 className="text-xl font-bold text-cyan-500 mb-3">
              IoT & Wearable Health Sync
            </h3>
            <ul className="space-y-2 text-cyan-500">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Connect via Bluetooth to smartwatches</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Sync with fitness bands and smart rings</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Collect vitals: HR, SpO₂, BP, temperature & glucose</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Real-time health monitoring</span>
              </li>
            </ul>
          </div>

          {/* Preventive & Personal Health Insights */}
          <div className="surface rounded-lg p-6 shadow-sm border subtle-border">
            <div className="text-4xl mb-4">💡</div>
            <h3 className="text-xl font-bold text-cyan-500 mb-3">
              Preventive & Personal Health Insights
            </h3>
            <ul className="space-y-2 text-cyan-500">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Personalized health tips and recommendations</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Lifestyle tracking: sleep, hydration, activity</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Outbreak alerts (WHO/CDC API integration)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Daily check-ins and health goals</span>
              </li>
            </ul>
          </div>

          {/* Elderly-Friendly & Accessibility */}
          <div className="surface rounded-lg p-6 shadow-sm border subtle-border">
            <div className="text-4xl mb-4">👴</div>
            <h3 className="text-xl font-bold text-cyan-500 mb-3">
              Elderly-Friendly + Accessibility
            </h3>
            <ul className="space-y-2 text-cyan-500">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Voice-based navigation and symptom entry</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Large-text UI mode for better visibility</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Local language switch (multilingual support)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>AI voice guidance for medical instructions</span>
              </li>
            </ul>
          </div>

          {/* Secure Cloud Health Records */}
          <div className="surface rounded-lg p-6 shadow-sm border subtle-border">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-cyan-500 mb-3">
              Secure Cloud Health Records
            </h3>
            <ul className="space-y-2 text-cyan-500">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Encrypted record storage (HIPAA compliant)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Unlimited medical history entries</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Downloadable/Shareable health reports</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Cross-platform access</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-cyan-500 text-center mb-4">
            Choose Your Plan
          </h2>
          <p className="text-center text-cyan-500 mb-12">
            Flexible pricing options for individuals, students, and families
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`surface rounded-lg p-6 shadow-sm border subtle-border relative ${
                  plan.popular ? 'ring-2 ring-cyan-500' : ''
                }`}
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
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    plan.price === 0
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : plan.popular
                      ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {plan.price === 0 ? 'Current Plan' : 'Subscribe'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="surface rounded-lg p-8 shadow-sm border subtle-border mb-16">
          <h3 className="text-2xl font-bold text-cyan-500 mb-6 text-center">
            Accepted Payment Methods
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">💳</div>
              <p className="text-sm text-cyan-500">Stripe</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">💳</div>
              <p className="text-sm text-cyan-500">PayPal</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">📱</div>
              <p className="text-sm text-cyan-500">M-Pesa</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🏦</div>
              <p className="text-sm text-cyan-500">Bank Cards</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">💼</div>
              <p className="text-sm text-cyan-500">Mobile Wallets</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center surface rounded-lg p-12 shadow-sm border subtle-border">
          <h2 className="text-3xl font-bold text-cyan-500 mb-4">
            Ready to Upgrade?
          </h2>
          <p className="text-cyan-500 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are taking control of their health with RemoDoc Premium.
            Start your free trial today or subscribe to unlock all features.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/register"
              className="px-8 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-semibold"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border-2 border-cyan-500 text-cyan-500 rounded-lg hover:bg-cyan-50 font-semibold"
            >
              Sign In to Upgrade
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

