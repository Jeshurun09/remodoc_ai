export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">You're Offline</h1>
        <p className="text-gray-600 mb-4">
          It looks like you're not connected to the internet.
        </p>
        <p className="text-sm text-gray-500">
          Some features may be available offline. Please check your connection and try again.
        </p>
      </div>
    </div>
  )
}

