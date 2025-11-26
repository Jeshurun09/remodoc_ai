'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface AvailabilitySlot {
  id?: string
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  isAvailable: boolean
}

export default function AvailabilityCalendar() {
  const { data: session } = useSession()
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const daysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ]

  useEffect(() => {
    fetchAvailability()
  }, [])

  const fetchAvailability = async () => {
    try {
      const response = await fetch('/api/doctors/availability')
      if (response.ok) {
        const data = await response.json()
        setSlots(data.slots || [])
      } else {
        // Initialize with default slots if none exist
        const defaultSlots: AvailabilitySlot[] = daysOfWeek.map((_, index) => ({
          dayOfWeek: index,
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: index !== 0 && index !== 6 // Available Monday-Friday by default
        }))
        setSlots(defaultSlots)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
      // Initialize with default slots on error
      const defaultSlots: AvailabilitySlot[] = daysOfWeek.map((_, index) => ({
        dayOfWeek: index,
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: index !== 0 && index !== 6
      }))
      setSlots(defaultSlots)
    } finally {
      setLoading(false)
    }
  }

  const updateSlot = (dayIndex: number, field: keyof AvailabilitySlot, value: any) => {
    setSlots((prev) => {
      const updated = [...prev]
      const slotIndex = updated.findIndex((s) => s.dayOfWeek === dayIndex)
      if (slotIndex >= 0) {
        updated[slotIndex] = { ...updated[slotIndex], [field]: value }
      } else {
        updated.push({
          dayOfWeek: dayIndex,
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
          [field]: value
        })
      }
      return updated
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/doctors/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots })
      })
      if (response.ok) {
        setMessage({ type: 'success', text: 'Availability updated successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Failed to update availability' })
      }
    } catch (error) {
      console.error('Error saving availability:', error)
      setMessage({ type: 'error', text: 'Error saving availability' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading availability...</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Availability Calendar</h2>
        <p className="text-[var(--foreground)]/70">
          Set your weekly availability for appointments
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="surface rounded-lg p-6 border subtle-border">
        <div className="space-y-4">
          {daysOfWeek.map((day, index) => {
            const slot = slots.find((s) => s.dayOfWeek === index) || {
              dayOfWeek: index,
              startTime: '09:00',
              endTime: '17:00',
              isAvailable: false
            }

            return (
              <div
                key={index}
                className="flex items-center gap-4 p-4 border subtle-border rounded-lg"
              >
                <div className="w-32">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={slot.isAvailable}
                      onChange={(e) => updateSlot(index, 'isAvailable', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-[var(--foreground)]">{day}</span>
                  </label>
                </div>
                {slot.isAvailable && (
                  <div className="flex items-center gap-2 flex-1">
                    <div>
                      <label className="block text-xs text-[var(--foreground)]/70 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-[var(--foreground)] bg-transparent"
                      />
                    </div>
                    <span className="text-[var(--foreground)]/70 mt-6">to</span>
                    <div>
                      <label className="block text-xs text-[var(--foreground)]/70 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-[var(--foreground)] bg-transparent"
                      />
                    </div>
                  </div>
                )}
                {!slot.isAvailable && (
                  <span className="text-sm text-[var(--foreground)]/50">Not available</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  )
}

