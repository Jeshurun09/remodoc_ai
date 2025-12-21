'use client'

import { useState, useEffect } from 'react'

interface Appointment {
  id: string
  scheduledAt: string | null
  status: string
  patient: {
    user: {
      name: string
      email: string
    }
  }
  symptomReport: {
    symptoms: string
    urgency: string
  } | null
}

export default function AppointmentReminders() {
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingAppointments()
    const interval = setInterval(fetchUpcomingAppointments, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchUpcomingAppointments = async () => {
    try {
      const response = await fetch('/api/appointments')
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          console.error('Error fetching appointments:', error.error || 'Failed to fetch appointments')
        } else {
          console.error('Error fetching appointments: Server returned non-JSON response')
        }
        return
      }
      const data = await response.json()
      const now = new Date()
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const upcoming = (data.appointments || [])
        .filter((apt: Appointment) => {
          if (!apt.scheduledAt || apt.status !== 'CONFIRMED') return false
          const scheduled = new Date(apt.scheduledAt)
          return scheduled >= now && scheduled <= next24Hours
        })
        .sort((a: Appointment, b: Appointment) => {
          const dateA = new Date(a.scheduledAt!).getTime()
          const dateB = new Date(b.scheduledAt!).getTime()
          return dateA - dateB
        })
        .slice(0, 5) // Show next 5 appointments

      setUpcomingAppointments(upcoming)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeUntil = (scheduledAt: string) => {
    const now = new Date()
    const scheduled = new Date(scheduledAt)
    const diff = scheduled.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className="surface rounded-lg p-4 border subtle-border">
        <div className="text-center py-4">Loading reminders...</div>
      </div>
    )
  }

  return (
    <div className="surface rounded-lg p-6 border subtle-border shadow-sm">
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
        Upcoming Appointments (Next 24 Hours)
      </h3>
      {upcomingAppointments.length === 0 ? (
        <p className="text-sm text-[var(--foreground)]/70 text-center py-4">
          No upcoming appointments in the next 24 hours
        </p>
      ) : (
        <div className="space-y-3">
          {upcomingAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {appointment.patient.user.name}
                  </p>
                  <p className="text-sm text-[var(--foreground)]/70">
                    {appointment.patient.user.email}
                  </p>
                  {appointment.symptomReport && (
                    <p className="text-xs text-[var(--foreground)]/60 mt-1">
                      {appointment.symptomReport.symptoms.substring(0, 100)}...
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {new Date(appointment.scheduledAt!).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-[var(--foreground)]/70">
                    in {getTimeUntil(appointment.scheduledAt!)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

