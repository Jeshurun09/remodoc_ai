import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-blue-600">RemoDoc</h1>
            <div className="flex space-x-4">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI-Powered Telehealth Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-4xl mb-4">🩺</div>
            <h3 className="text-xl font-semibold mb-2">For Patients</h3>
            <p className="text-gray-600">
              Symptom input (text/voice/image), AI triage, hospital maps, appointments, and offline access
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-4xl mb-4">👨‍⚕️</div>
            <h3 className="text-xl font-semibold mb-2">For Doctors</h3>
            <p className="text-gray-600">
              Verified login, case management, chat, prescriptions, and AI feedback review
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-4xl mb-4">🧑‍💼</div>
            <h3 className="text-xl font-semibold mb-2">Admin Dashboard</h3>
            <p className="text-gray-600">
              Verify doctors, manage hospitals, monitor AI logs, configure system, and view analytics
            </p>
          </div>
        </div>

        <div className="mt-16 bg-blue-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Powered by Advanced AI Technology
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">🧠 Gemini AI</h3>
              <p className="text-gray-600">
                Processes text & image data, returns likely conditions, urgency, and care advice
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">🗺️ Google Maps</h3>
              <p className="text-gray-600">
                Hospital discovery, directions, and emergency routing with GPS integration
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
