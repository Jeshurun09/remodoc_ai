'use client'

import { useState, useEffect } from 'react'

interface Appointment {
  id: string
  status: string
  scheduledAt: string | null
  notes: string | null
  doctor: {
    user: {
      name: string
      email: string
    }
    specialization: string
  } | null
  symptomReport: {
    symptoms: string
    urgency: string
  } | null
}

export default function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments')
      const data = await response.json()
      if (response.ok) {
        setAppointments(data.appointments || [])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800'
  }

  if (loading) {
    return <div className="text-center py-8">Loading appointments...</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Appointments</h2>
        <p className="text-gray-600">View and manage your medical appointments</p>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No appointments yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {appointment.doctor
                      ? `Dr. ${appointment.doctor.user.name} - ${appointment.doctor.specialization}`
                      : 'No doctor assigned'}
                  </h3>
                  {appointment.scheduledAt && (
                    <p className="text-sm text-gray-600 mt-1">
                      Scheduled: {new Date(appointment.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusColors[appointment.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {appointment.status}
                </span>
              </div>

              {appointment.symptomReport && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Symptoms:</p>
                  <p className="text-sm text-gray-600">{appointment.symptomReport.symptoms}</p>
                  <span
                    className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                      appointment.symptomReport.urgency === 'CRITICAL' || appointment.symptomReport.urgency === 'HIGH'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {appointment.symptomReport.urgency} Urgency
                  </span>
                </div>
              )}

              {appointment.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                  <p className="text-sm text-gray-600">{appointment.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

