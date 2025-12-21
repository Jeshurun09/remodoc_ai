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
  const [incomingCall, setIncomingCall] = useState<any>(null)
  const [callInvitations, setCallInvitations] = useState<any[]>([])
  const [onlinePatients, setOnlinePatients] = useState<any[]>([])
  const [isOnline, setIsOnline] = useState(false)
  const [notes, setNotes] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAppointments()
  }, [])

  // Set online status and fetch online patients
  useEffect(() => {
    if (session?.user?.id) {
      setOnlineStatus(true)
      fetchOnlinePatients()

      // Check online patients every 30 seconds
      const interval = setInterval(fetchOnlinePatients, 30000)

      // Set offline when component unmounts or page unloads
      const handleBeforeUnload = () => setOnlineStatus(false)
      window.addEventListener('beforeunload', handleBeforeUnload)

      return () => {
        clearInterval(interval)
        window.removeEventListener('beforeunload', handleBeforeUnload)
        setOnlineStatus(false)
      }
    }
  }, [session])

  // Check for incoming call invitations every 5 seconds
  useEffect(() => {
    if (session?.user?.id) {
      const interval = setInterval(checkForInvitations, 5000)
      return () => clearInterval(interval)
    }
  }, [session])

  // Cleanup video stream on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
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
      // Filter for confirmed appointments
      const confirmed = (data.appointments || []).filter(
        (apt: Appointment) => apt.status === 'CONFIRMED'
      )
      setAppointments(confirmed)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const startVideoCall = async () => {
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
      
      if (!isSecure) {
        alert('Video calls require HTTPS. Please use a secure connection.')
        return
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Video calls are not supported in this browser.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsVideoActive(true)
      }
    } catch (error: any) {
      console.error('Error accessing camera/microphone:', error)
      
      let errorMessage = 'Unable to access camera/microphone.'
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access denied. Please allow permissions and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera/microphone found. Please connect a camera/microphone and try again.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is already in use by another application.'
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera/microphone doesn\'t meet the required constraints.'
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Camera/microphone access blocked due to security restrictions.'
      }
      
      alert(errorMessage)
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

  const setOnlineStatus = async (online: boolean) => {
    if (!session?.user?.id) return

    try {
      const res = await fetch('/api/user/online-status', {
        method: online ? 'POST' : 'DELETE'
      })
      if (res.ok) {
        setIsOnline(online)
      }
    } catch (error) {
      console.error('Failed to update online status:', error)
    }
  }

  const fetchOnlinePatients = async () => {
    if (!session?.user?.id) return

    try {
      const res = await fetch('/api/user/online-status?role=PATIENT')
      if (res.ok) {
        const data = await res.json()
        setOnlinePatients(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch online patients:', error)
    }
  }

  const selectAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setNotes('')
  }

  const handleStartConsultation = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setNotes('')
    // Optionally start video call immediately
    // startVideoCall()
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

  const initiateVideoCall = async () => {
    if (!selectedAppointment?.patient?.user?.id) return

    try {
      const res = await fetch('/api/video-call/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selectedAppointment.patient.user.id })
      })

      if (res.ok) {
        alert('Video call invitation sent to patient. Waiting for response...')
        checkForInvitations() // Check immediately
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send video call invitation')
      }
    } catch (error) {
      console.error('Failed to initiate video call:', error)
      alert('Failed to send video call invitation')
    }
  }

  const checkForInvitations = async () => {
    if (!session?.user?.id) return

    try {
      const res = await fetch('/api/video-call/invitations')
      if (res.ok) {
        const data = await res.json()
        setCallInvitations(data.invitations || [])

        // If there's an accepted call, start the video
        const acceptedCall = data.invitations?.find((inv: any) => inv.status === 'ACCEPTED')
        if (acceptedCall && !isVideoActive) {
          setIncomingCall(acceptedCall)
          startVideoCall()
        }
      }
    } catch (error) {
      console.error('Failed to check invitations:', error)
    }
  }

  const respondToCall = async (invitationId: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      const res = await fetch(`/api/video-call/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (res.ok) {
        if (action === 'ACCEPT') {
          const invitation = callInvitations.find(inv => inv.id === invitationId)
          setIncomingCall(invitation)
          startVideoCall()
        }
        setCallInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to respond to call')
      }
    } catch (error) {
      console.error('Failed to respond to call:', error)
      alert('Failed to respond to call')
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
            appointments.map((appointment) => {
              const patientOnlineStatus = onlinePatients.find(op => op.id === appointment.patient.user.id)
              const isPatientOnline = patientOnlineStatus?.isOnline || false
              const lastSeen = patientOnlineStatus?.lastSeen

              return (
                <div
                  key={appointment.id}
                  className="surface border subtle-border rounded-lg p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      {appointment.patient.user.name}
                    </h3>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      isPatientOnline
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isPatientOnline ? '● Online' : '○ Offline'}
                    </div>
                  </div>
                  <p className="text-sm text-[var(--foreground)]/70 mb-2">
                    {appointment.patient.user.email}
                  </p>
                  {!isPatientOnline && lastSeen && (
                    <p className="text-xs text-gray-400 mb-2">
                      Last seen: {new Date(lastSeen).toLocaleString()}
                    </p>
                  )}
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
              )
            })
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

          {/* Incoming Call Notifications */}
          {callInvitations.length > 0 && (
            <div className="mb-4">
              {callInvitations.map((invitation) => (
                <div key={invitation.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-800 font-semibold">
                        📞 Incoming video call from {invitation.initiator.name}
                      </p>
                      <p className="text-blue-600 text-sm">
                        Expires in {Math.max(0, Math.floor((new Date(invitation.expiresAt).getTime() - Date.now()) / 1000))} seconds
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => respondToCall(invitation.id, 'ACCEPT')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respondToCall(invitation.id, 'DECLINE')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                      onClick={initiateVideoCall}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Start Video Call
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

