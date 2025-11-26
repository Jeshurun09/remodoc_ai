'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface Patient {
  id: string
  name: string
  email: string
}

interface Appointment {
  id: string
  patient: {
    user: {
      id: string
      name: string
      email: string
    }
  }
  scheduledAt: string | null
  status: string
}

export default function TelemedicineConsultation() {
  const { data: session } = useSession()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isVideoActive, setIsVideoActive] = useState(false)
  const [notes, setNotes] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments')
      if (response.ok) {
        const data = await response.json()
        // Filter for confirmed appointments
        const confirmed = (data.appointments || []).filter(
          (apt: Appointment) => apt.status === 'CONFIRMED'
        )
        setAppointments(confirmed)
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsVideoActive(true)
      }
    } catch (error) {
      console.error('Error accessing camera/microphone:', error)
      alert('Unable to access camera/microphone. Please check permissions.')
    }
  }

  const endVideoCall = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setIsVideoActive(false)
    }
  }

  const handleStartConsultation = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setNotes('')
  }

  const handleEndConsultation = async () => {
    if (selectedAppointment && notes) {
      try {
        await fetch(`/api/appointments/${selectedAppointment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'COMPLETED',
            notes
          })
        })
        endVideoCall()
        setSelectedAppointment(null)
        setNotes('')
        fetchAppointments()
      } catch (error) {
        console.error('Error ending consultation:', error)
      }
    } else {
      endVideoCall()
      setSelectedAppointment(null)
      setNotes('')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading consultations...</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
          Telemedicine Consultations
        </h2>
        <p className="text-[var(--foreground)]/70">
          Conduct video consultations with your patients
        </p>
      </div>

      {!selectedAppointment ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appointments.length === 0 ? (
            <div className="col-span-full surface text-center py-12 rounded-lg border subtle-border">
              <p className="text-[var(--foreground)]/70">No confirmed appointments for consultation</p>
            </div>
          ) : (
            appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="surface border subtle-border rounded-lg p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  {appointment.patient.user.name}
                </h3>
                <p className="text-sm text-[var(--foreground)]/70 mb-2">
                  {appointment.patient.user.email}
                </p>
                {appointment.scheduledAt && (
                  <p className="text-sm text-[var(--foreground)]/60 mb-4">
                    Scheduled: {new Date(appointment.scheduledAt).toLocaleString()}
                  </p>
                )}
                <button
                  onClick={() => handleStartConsultation(appointment)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Start Consultation
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="surface rounded-lg p-6 border subtle-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                Consultation with {selectedAppointment.patient.user.name}
              </h3>
              <p className="text-sm text-[var(--foreground)]/70">
                {selectedAppointment.patient.user.email}
              </p>
            </div>
            <button
              onClick={handleEndConsultation}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              End Consultation
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center mb-4">
                {isVideoActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-white text-center">
                    <p className="mb-2">Video call ready</p>
                    <button
                      onClick={startVideoCall}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Start Video
                    </button>
                  </div>
                )}
              </div>
              {isVideoActive && (
                <button
                  onClick={endVideoCall}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Stop Video
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Consultation Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                placeholder="Enter consultation notes, diagnosis, and recommendations..."
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleEndConsultation}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Complete Consultation
            </button>
            <button
              onClick={() => {
                endVideoCall()
                setSelectedAppointment(null)
                setNotes('')
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

