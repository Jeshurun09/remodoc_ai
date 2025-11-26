'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  createdAt: string
  read: boolean
  sender: {
    name: string
    email: string
  }
  receiver: {
    name: string
    email: string
  }
}

interface Patient {
  id: string
  name: string
  email: string
  unreadCount: number
}

export default function EnhancedMessaging() {
  const { data: session } = useSession()
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    if (selectedPatient) {
      fetchMessages()
      const interval = setInterval(fetchMessages, 3000) // Poll every 3 seconds
      return () => clearInterval(interval)
    }
  }, [selectedPatient])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/doctors/patients')
      if (response.ok) {
        const data = await response.json()
        setPatients(data.patients || [])
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    if (!selectedPatient) return
    try {
      const response = await fetch(`/api/messages?patientId=${selectedPatient}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
        // Mark messages as read
        const unreadIds = data
          .filter((msg: Message) => !msg.read && msg.senderId !== session?.user?.id)
          .map((msg: Message) => msg.id)
        if (unreadIds.length > 0) {
          await fetch('/api/messages/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageIds: unreadIds })
          })
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedPatient) return

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedPatient,
          content: newMessage.trim()
        })
      })
      if (response.ok) {
        setNewMessage('')
        fetchMessages()
        fetchPatients() // Refresh patient list to update unread counts
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading messages...</div>
  }

  const selectedPatientData = patients.find((p) => p.id === selectedPatient)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Messages</h2>
        <p className="text-[var(--foreground)]/70">Communicate with your patients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient List */}
        <div className="surface rounded-lg border subtle-border p-4">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Patients</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {patients.length === 0 ? (
              <p className="text-sm text-[var(--foreground)]/70 text-center py-4">
                No patients yet
              </p>
            ) : (
              patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedPatient === patient.id
                      ? 'bg-blue-100 dark:bg-blue-900/40'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{patient.name}</p>
                      <p className="text-xs text-[var(--foreground)]/70">{patient.email}</p>
                    </div>
                    {patient.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1">
                        {patient.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2 surface rounded-lg border subtle-border flex flex-col">
          {selectedPatient ? (
            <>
              <div className="p-4 border-b subtle-border">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  {selectedPatientData?.name}
                </h3>
                <p className="text-sm text-[var(--foreground)]/70">
                  {selectedPatientData?.email}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-[var(--foreground)]/70">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.senderId === session?.user?.id
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOwn
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-[var(--foreground)]'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? 'text-blue-100' : 'text-[var(--foreground)]/50'
                            }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="p-4 border-t subtle-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[var(--foreground)]/70">Select a patient to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

