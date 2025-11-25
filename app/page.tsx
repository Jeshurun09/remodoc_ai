'use client'

import Link from 'next/link'
import { useTheme } from '@/components/theme/ThemeProvider'

export default function Home() {
  const { theme, isDark, setTheme } = useTheme()

  const toggleTheme = () => {
    // Toggle between light and dark mode
    setTheme(isDark ? 'light' : 'dark')
  }

  const sectionHeaderClass = isDark ? 'text-[#22f7a8]' : 'text-gray-900'
  const cardClass = `bg-[var(--card-bg)] rounded-lg shadow-lg p-6 ${
    isDark ? 'text-white' : 'text-gray-900'
  }`
  const navClass = isDark ? 'bg-[var(--card-bg)] shadow-sm' : 'bg-white shadow-sm'

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <nav className={navClass}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:opacity-80 cursor-pointer">
              RemoDoc
            </Link>
            <div className="flex space-x-4">
              <Link
                href="/premium"
                className="px-4 py-2 text-[var(--foreground)] hover:opacity-80"
              >
                Premium
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-[var(--foreground)] hover:opacity-80"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className={`text-5xl font-bold mb-6 ${sectionHeaderClass}`}>
            AI-Powered Telehealth Platform
          </h1>
          <p className="text-xl text-[var(--foreground)]/80 mb-8 max-w-2xl mx-auto">
            Smart symptom checking, location-based care, and secure medical workflows
            powered by Gemini AI and Google Maps
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/register"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 font-semibold"
            >
              Sign In
            </Link>
            <Link
              href="/premium"
              className="px-8 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-semibold"
            >
              View Premium Features
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className={cardClass}>
            <div className="text-4xl mb-4">🩺</div>
            <h3 className={`text-xl font-semibold mb-2 ${sectionHeaderClass}`}>For Patients</h3>
            <p className="text-[var(--foreground)]/80">
              Symptom input (text/voice/image), AI triage, hospital maps, appointments, and offline access
            </p>
          </div>

          <div className={cardClass}>
            <div className="text-4xl mb-4">👨‍⚕️</div>
            <h3 className={`text-xl font-semibold mb-2 ${sectionHeaderClass}`}>For Doctors</h3>
            <p className="text-[var(--foreground)]/80">
              Verified login, case management, chat, prescriptions, and AI feedback review
            </p>
          </div>

          <div className={cardClass}>
            <div className="text-4xl mb-4">🧑‍💼</div>
            <h3 className={`text-xl font-semibold mb-2 ${sectionHeaderClass}`}>Admin Dashboard</h3>
            <p className="text-[var(--foreground)]/80">
              Verify doctors, manage hospitals, monitor AI logs, configure system, and view analytics
            </p>
          </div>
        </div>

        <div className="mt-16 bg-[var(--card-bg)] rounded-lg p-8">
          <h2 className={`text-2xl font-bold mb-4 text-center ${sectionHeaderClass}`}>
            Powered by Advanced AI Technology
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className={`font-semibold mb-2 ${sectionHeaderClass}`}>🧠 Gemini AI</h3>
              <p className="text-[var(--foreground)]/80">
                Processes text & image data, returns likely conditions, urgency, and care advice
              </p>
            </div>
            <div>
              <h3 className={`font-semibold mb-2 ${sectionHeaderClass}`}>🗺️ Google Maps</h3>
              <p className="text-[var(--foreground)]/80">
                Hospital discovery, directions, and emergency routing with Google Maps integration
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Unlock Premium Features
          </h2>
          <p className="text-xl mb-6 max-w-2xl mx-auto opacity-90">
            Get access to telemedicine, IoT health tracking, cloud records, and more with RemoDoc Premium
          </p>
          <Link
            href="/premium"
            className="inline-block px-8 py-3 bg-white text-cyan-600 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Explore Premium Plans
          </Link>
        </div>
      </main>
    </div>
  )
}
