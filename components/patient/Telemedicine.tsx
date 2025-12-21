'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Doctor {
  id: string
  userId: string
  name: string
  specialization: string
  available: boolean
}

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
}

interface Prescription {
  id: string
  medication: string
  dosage: string
  instructions: string
  startDate: string
}

export default function Telemedicine() {
  const { data: session } = useSession()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [onlineDoctors, setOnlineDoctors] = useState<any[]>([])
  const [isOnline, setIsOnline] = useState(false)
  const [isVideoCall, setIsVideoCall] = useState(false)
  const [isVideoActive, setIsVideoActive] = useState(false)
  const [incomingCall, setIncomingCall] = useState<any>(null)
  const [callInvitations, setCallInvitations] = useState<any[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetchDoctors()
    if (selectedDoctor) {
      fetchMessages()
      fetchPrescriptions()
    }
  }, [selectedDoctor])

  // Set online status and fetch online doctors
  useEffect(() => {
    if (session?.user?.id) {
      setOnlineStatus(true)
      fetchOnlineDoctors()

      // Check online doctors every 30 seconds
      const interval = setInterval(fetchOnlineDoctors, 30000)

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

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/doctors')
      if (!res.ok) {
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const error = await res.json()
          console.error('Error fetching doctors:', error.error || 'Failed to fetch doctors')
        } else {
          console.error('Error fetching doctors: Server returned non-JSON response')
        }
        return
      }
      const data = await res.json()
      setDoctors(data.doctors.map((d: any) => ({
        id: d.id,
        userId: d.userId,
        name: d.name,
        specialization: d.specialization,
        available: true
      })))
    } catch (error) {
      console.error('Failed to fetch doctors:', error)
    }
  }

  const fetchMessages = async () => {
    if (!selectedDoctor || !session?.user?.id) return
    try {
      const res = await fetch(`/api/messages?doctorId=${selectedDoctor.id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const fetchPrescriptions = async () => {
    if (!selectedDoctor || !session?.user?.id) return
    try {
      const res = await fetch(`/api/prescriptions?patientId=${session.user.id}`)
      if (res.ok) {
        const data = await res.json()
        setPrescriptions(data)
      }
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedDoctor || !session?.user?.id) return
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedDoctor.userId,
          content: newMessage
        })
      })
      if (res.ok) {
        setNewMessage('')
        fetchMessages()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'medical_file')

    try {
      const res = await fetch('/api/health-records/upload', {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        const data = await res.json()
        setUploadedFiles([...uploadedFiles, data.fileUrl])
        alert('File uploaded successfully!')
      }
    } catch (error) {
      console.error('Failed to upload file:', error)
      alert('Failed to upload file')
    }
  }

  const requestFollowUp = async () => {
    if (!selectedDoctor || !session?.user?.id) return
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          notes: 'Follow-up consultation requested'
        })
      })
      if (res.ok) {
        alert('Follow-up consultation requested!')
      }
    } catch (error) {
      console.error('Failed to request follow-up:', error)
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

  const handleVideoCallToggle = () => {
    if (isVideoCall) {
      endVideoCall()
      setIsVideoCall(false)
    } else {
      initiateVideoCall()
    }
  }

  const initiateVideoCall = async () => {
    if (!selectedDoctor?.userId) return

    try {
      const res = await fetch('/api/video-call/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selectedDoctor.userId })
      })

      if (res.ok) {
        alert('Video call invitation sent to doctor. Waiting for response...')
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

  const fetchOnlineDoctors = async () => {
    if (!session?.user?.id) return

    try {
      const res = await fetch('/api/user/online-status?role=DOCTOR')
      if (res.ok) {
        const data = await res.json()
        setOnlineDoctors(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch online doctors:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cyan-500">Telemedicine & Doctor Access</h2>
        <Link href="/premium" className="text-sm text-cyan-500 hover:underline">
          Upgrade to Premium
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Selection */}
        <div className="surface rounded-lg p-4 border subtle-border">
          <h3 className="text-lg font-semibold text-cyan-500 mb-4">Available Doctors</h3>
          <div className="space-y-2">
            {doctors.map((doctor) => {
              const onlineStatus = onlineDoctors.find(od => od.id === doctor.userId)
              const isOnline = onlineStatus?.isOnline || false
              const lastSeen = onlineStatus?.lastSeen

              return (
                <button
                  key={doctor.id}
                  onClick={() => setSelectedDoctor(doctor)}
                  className={`w-full text-left p-3 rounded-lg border ${
                    selectedDoctor?.id === doctor.id
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-200 hover:border-cyan-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-cyan-500">{doctor.name}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      isOnline
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isOnline ? '● Online' : '○ Offline'}
                    </div>
                  </div>
                  <div className="text-sm text-cyan-500">{doctor.specialization}</div>
                  <div className={`text-xs mt-1 ${doctor.available ? 'text-green-500' : 'text-gray-500'}`}>
                    {doctor.available ? '● Available' : '● Busy'}
                  </div>
                  {!isOnline && lastSeen && (
                    <div className="text-xs text-gray-400 mt-1">
                      Last seen: {new Date(lastSeen).toLocaleString()}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
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

        {/* Chat Interface */}
        {selectedDoctor && (
          <div className="lg:col-span-2 surface rounded-lg p-4 border subtle-border flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-cyan-500">{selectedDoctor.name}</h3>
                <p className="text-sm text-cyan-500">{selectedDoctor.specialization}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleVideoCallToggle}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 text-sm"
                >
                  {isVideoCall ? 'End Call' : 'Video Call'}
                </button>
                <button
                  onClick={requestFollowUp}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Request Follow-up
                </button>
              </div>
            </div>

            {isVideoCall && (
              <div className="mb-4">
                <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center">
                  {isVideoActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-white text-center">
                      <p className="mb-2">Connecting to video call...</p>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    </div>
                  )}
                </div>
                {isVideoActive && (
                  <button
                    onClick={endVideoCall}
                    className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Stop Video
                  </button>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2 max-h-96">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.senderId === session?.user?.id
                      ? 'bg-cyan-500 text-white ml-auto max-w-xs'
                      : 'bg-gray-100 text-gray-900 mr-auto max-w-xs'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
              />
              <button
                onClick={sendMessage}
                className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* File Upload */}
      <div className="surface rounded-lg p-4 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Upload Medical Files</h3>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileUpload}
            className="text-sm text-cyan-500"
          />
          <span className="text-sm text-cyan-500">
            Upload lab results, reports, or medical images
          </span>
        </div>
        {uploadedFiles.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-cyan-500 mb-2">Uploaded Files:</p>
            <ul className="space-y-1">
              {uploadedFiles.map((file, idx) => (
                <li key={idx} className="text-sm text-cyan-500">
                  • {file}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Prescriptions */}
      {prescriptions.length > 0 && (
        <div className="surface rounded-lg p-4 border subtle-border">
          <h3 className="text-lg font-semibold text-cyan-500 mb-4">Digital Prescriptions</h3>
          <div className="space-y-3">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="p-4 bg-gray-50 rounded-lg border">
                <div className="font-semibold text-cyan-500">{prescription.medication}</div>
                <div className="text-sm text-cyan-500 mt-1">
                  Dosage: {prescription.dosage}
                </div>
                <div className="text-sm text-cyan-500 mt-1">
                  Instructions: {prescription.instructions}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Start Date: {new Date(prescription.startDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

