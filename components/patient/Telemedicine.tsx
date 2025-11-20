'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Doctor {
  id: string
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
  const [isVideoCall, setIsVideoCall] = useState(false)

  useEffect(() => {
    fetchDoctors()
    if (selectedDoctor) {
      fetchMessages()
      fetchPrescriptions()
    }
  }, [selectedDoctor])

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/doctors')
      if (res.ok) {
        const data = await res.json()
        setDoctors(data.map((d: any) => ({
          id: d.id,
          name: d.user.name,
          specialization: d.specialization,
          available: true
        })))
      }
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
          receiverId: selectedDoctor.id,
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
            {doctors.map((doctor) => (
              <button
                key={doctor.id}
                onClick={() => setSelectedDoctor(doctor)}
                className={`w-full text-left p-3 rounded-lg border ${
                  selectedDoctor?.id === doctor.id
                    ? 'border-cyan-500 bg-cyan-50'
                    : 'border-gray-200 hover:border-cyan-300'
                }`}
              >
                <div className="font-semibold text-cyan-500">{doctor.name}</div>
                <div className="text-sm text-cyan-500">{doctor.specialization}</div>
                <div className={`text-xs mt-1 ${doctor.available ? 'text-green-500' : 'text-gray-500'}`}>
                  {doctor.available ? '● Available' : '● Busy'}
                </div>
              </button>
            ))}
          </div>
        </div>

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
                  onClick={() => setIsVideoCall(!isVideoCall)}
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
              <div className="mb-4 p-4 bg-gray-100 rounded-lg text-center">
                <p className="text-cyan-500">Video call would be initiated here</p>
                <p className="text-sm text-gray-500 mt-2">(Requires WebRTC integration)</p>
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

