'use client'

import { useState } from 'react'

interface EmergencyBeaconProps {
  location: { lat: number; lng: number } | null
}

export default function EmergencyBeacon({ location }: EmergencyBeaconProps) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleEmergency = async () => {
    if (!confirm('Send emergency beacon? This will notify your emergency contact.')) {
      return
    }

    setLoading(true)
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
        alert('Failed to send emergency beacon')
      }
    } catch (error) {
      console.error('Emergency beacon error:', error)
      alert('Failed to send emergency beacon. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleEmergency}
      disabled={loading || sent}
      className={`fixed bottom-6 right-6 px-6 py-4 rounded-full text-white font-semibold shadow-lg transition-all ${
        sent
          ? 'bg-green-600'
          : 'bg-red-600 hover:bg-red-700 active:scale-95'
      } disabled:opacity-50 disabled:cursor-not-allowed z-50`}
    >
      {sent ? '✓ Beacon Sent' : loading ? 'Sending...' : '🚨 Emergency Beacon'}
    </button>
  )
}

