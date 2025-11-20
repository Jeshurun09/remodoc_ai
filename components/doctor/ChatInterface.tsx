'use client'

import { useState, useEffect } from 'react'

interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  createdAt: string
  read: boolean
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedPatient) return

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedPatient,
          content: newMessage
        })
      })
      if (response.ok) {
        setNewMessage('')
        // Refresh messages
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Messages</h2>
        <p className="text-gray-600">Communicate with your patients</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600 text-center py-8">
          Chat interface - Select a patient to start messaging
        </p>
      </div>
    </div>
  )
}

