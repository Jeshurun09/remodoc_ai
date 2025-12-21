'use client'

import { useEffect, useState } from 'react'

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

interface Doctor {
  id: string
  name: string
  email: string
  specialization: string
  currentInstitution: string | null
}

export default function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [form, setForm] = useState({
    doctorId: '',
    scheduledAt: '',
    notes: ''
  })
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    fetchAppointments()
    fetchDoctors()
  }, [])

  const fetchAppointments = async () => {
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
      setAppointments(data.appointments || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDoctors = async () => {
    try {
      const response = await fetch('/api/doctors')
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          console.error('Error fetching doctors:', error.error || 'Failed to fetch doctors')
        } else {
          console.error('Error fetching doctors: Server returned non-JSON response')
        }
        return
      }
      const data = await response.json()
      setDoctors(data.doctors || [])
    } catch (error) {
      console.error('Error fetching doctors:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback('')
    setCreating(true)
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: form.doctorId || null,
          scheduledAt: form.scheduledAt || null,
          notes: form.notes || null
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setFeedback(data.error || 'Failed to create appointment.')
        return
      }
      setFeedback('Appointment request sent! A doctor will review it shortly.')
      setForm({ doctorId: '', scheduledAt: '', notes: '' })
      fetchAppointments()
    } catch (error) {
      console.error('Create appointment error:', error)
      setFeedback('Something went wrong. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const statusStyles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100',
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
  }

  return (
    <div className="space-y-6">
      <div className="surface rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-2 text-cyan-500">Request New Appointment</h2>
        <p className="text-sm text-cyan-500 mb-4">
          Choose a preferred doctor and time. Your doctor will approve or decline the request.
        </p>
        {feedback && (
          <div className="mb-4 text-sm bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-100 px-4 py-2 rounded">
            {feedback}
          </div>
        )}
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2 text-cyan-500">Doctor</label>
            <select
              value={form.doctorId}
              onChange={(e) => setForm((prev) => ({ ...prev, doctorId: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-transparent text-cyan-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any available doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.name} — {doctor.specialization}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-cyan-500">Preferred Date & Time</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-transparent text-cyan-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2 text-cyan-500">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-transparent text-cyan-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Add any important context for the doctor..."
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-2 text-cyan-500">My Appointments</h2>
        <p className="text-sm text-cyan-500">
          Track the status of your requests and upcoming visits.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-cyan-500">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="surface text-center py-12 rounded-lg border subtle-border">
          <p className="text-cyan-500">No appointments yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="surface border subtle-border rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-cyan-500">
                    {appointment.doctor
                      ? `Dr. ${appointment.doctor.user.name} — ${appointment.doctor.specialization}`
                      : 'Awaiting doctor assignment'}
                  </h3>
                  {appointment.scheduledAt && (
                    <p className="text-sm text-cyan-500 mt-1">
                      Scheduled: {new Date(appointment.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusStyles[appointment.status] || 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {appointment.status}
                </span>
              </div>

              {appointment.symptomReport && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-cyan-500">Symptoms</p>
                  <p className="text-sm text-cyan-500">{appointment.symptomReport.symptoms}</p>
                  <span
                    className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                      appointment.symptomReport.urgency === 'CRITICAL' || appointment.symptomReport.urgency === 'HIGH'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-100'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                    }`}
                  >
                    {appointment.symptomReport.urgency} Urgency
                  </span>
                </div>
              )}

              {appointment.notes && (
                <div>
                  <p className="text-sm font-semibold text-cyan-500">Notes</p>
                  <p className="text-sm text-cyan-500">{appointment.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

