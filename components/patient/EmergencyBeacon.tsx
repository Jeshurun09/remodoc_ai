'use client'

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

interface EmergencyBeaconProps {
  location: { lat: number; lng: number } | null
}

export default function EmergencyBeacon({ location }: EmergencyBeaconProps) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [hasContacts, setHasContacts] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if patient has emergency contacts configured
    checkEmergencyContacts()
  }, [])

  const checkEmergencyContacts = async () => {
    try {
      const response = await fetch('/api/patient/emergency-contacts')
      if (response.ok) {
        const data = await response.json()
        setHasContacts(data.emergencyContacts && data.emergencyContacts.length > 0)
      }
    } catch (error) {
      console.error('Error checking emergency contacts:', error)
    }
  }

  const handleEmergency = async () => {
    if (!hasContacts) {
      setError('Please add an emergency contact first')
      return
    }

    if (!confirm('Send emergency beacon? This will notify your emergency contact immediately.')) {
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/emergency/beacon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Emergency alert from RemoDoc',
          location
        })
      })

      if (response.ok) {
        setSent(true)
        setTimeout(() => setSent(false), 5000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to send emergency beacon')
      }
    } catch (error) {
      console.error('Emergency beacon error:', error)
      setError('Failed to send emergency beacon. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <div className="fixed top-6 right-6 p-4 bg-red-100 border border-red-400 rounded-lg flex items-start gap-3 z-40 max-w-sm">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      <button
        onClick={handleEmergency}
        disabled={loading || sent || !hasContacts}
        title={!hasContacts ? 'Add an emergency contact first' : 'Send emergency alert'}
        className={`fixed bottom-6 right-6 px-6 py-4 rounded-full text-white font-semibold shadow-lg transition-all ${
          sent
            ? 'bg-green-600'
            : !hasContacts
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700 active:scale-95'
        } disabled:opacity-50 z-50`}
      >
        {sent ? '✓ Beacon Sent' : loading ? 'Sending...' : '🚨 Emergency'}
      </button>
    </>
  )
}

