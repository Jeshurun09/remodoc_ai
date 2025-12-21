'use client'

import { useState, useEffect } from 'react'
import { Trash2, Edit2, Plus, Heart, AlertCircle } from 'lucide-react'

interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phone?: string
  email?: string
  notificationPreference: 'EMAIL' | 'PHONE' | 'BOTH'
  isPrimary: boolean
  verified: boolean
}

interface EmergencyContactsManagerProps {
  isDark?: boolean
}

export default function EmergencyContactsManager({ isDark = false }: EmergencyContactsManagerProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    relationship: 'parent',
    phone: '',
    email: '',
    notificationPreference: 'BOTH',
    isPrimary: false
  })

  const relationships = ['parent', 'spouse', 'sibling', 'friend', 'other']

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/patient/emergency-contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data.emergencyContacts)
      }
    } catch (err) {
      console.error('Error fetching contacts:', err)
      setError('Failed to load emergency contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    if (!formData.phone.trim() && !formData.email.trim()) {
      setError('At least phone or email must be provided')
      return
    }

    // Validate email format if provided
    if (formData.email.trim() && !formData.email.includes('@')) {
      setError('Invalid email format')
      return
    }

    try {
      const url = editingId
        ? `/api/patient/emergency-contacts/${editingId}`
        : '/api/patient/emergency-contacts'

      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSuccess(editingId ? 'Contact updated successfully' : 'Contact added successfully')
        setFormData({
          name: '',
          relationship: 'parent',
          phone: '',
          email: '',
          notificationPreference: 'BOTH',
          isPrimary: false
        })
        setEditingId(null)
        setShowForm(false)
        await fetchContacts()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to save contact')
      }
    } catch (err) {
      console.error('Error saving contact:', err)
      setError('Failed to save emergency contact')
    }
  }

  const handleEdit = (contact: EmergencyContact) => {
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone || '',
      email: contact.email || '',
      notificationPreference: contact.notificationPreference,
      isPrimary: contact.isPrimary
    })
    setEditingId(contact.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const response = await fetch(`/api/patient/emergency-contacts/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSuccess('Contact deleted successfully')
        await fetchContacts()
      } else {
        setError('Failed to delete contact')
      }
    } catch (err) {
      console.error('Error deleting contact:', err)
      setError('Failed to delete emergency contact')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: '',
      relationship: 'parent',
      phone: '',
      email: '',
      notificationPreference: 'BOTH',
      isPrimary: false
    })
    setError('')
  }

  if (loading) {
    return (
      <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading emergency contacts...</p>
      </div>
    )
  }

  return (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Heart className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Emergency Contacts
          </h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className={`mb-6 p-6 rounded-lg border-2 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {editingId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contact name"
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:border-blue-500`}
                />
              </div>

              {/* Relationship */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Relationship *
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:border-blue-500`}
                >
                  {relationships.map((rel) => (
                    <option key={rel} value={rel} className={isDark ? 'bg-gray-600' : ''}>
                      {rel.charAt(0).toUpperCase() + rel.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 7XX XXX XXX"
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:border-blue-500`}
                />
              </div>

              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:border-blue-500`}
                />
              </div>

              {/* Notification Preference */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  How to notify? *
                </label>
                <select
                  value={formData.notificationPreference}
                  onChange={(e) => setFormData({ ...formData, notificationPreference: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:border-blue-500`}
                >
                  <option value="PHONE">By Phone</option>
                  <option value="EMAIL">By Email</option>
                  <option value="BOTH">Both Phone & Email</option>
                </select>
              </div>

              {/* Primary Contact */}
              <div className="flex items-end">
                <label className={`flex items-center gap-2 cursor-pointer`}>
                  <input
                    type="checkbox"
                    checked={formData.isPrimary}
                    onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Make Primary Contact
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className={`px-6 py-2 rounded-lg font-medium transition ${isDark ? 'bg-gray-600 text-gray-100 hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                {editingId ? 'Update Contact' : 'Add Contact'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <div className={`p-8 text-center rounded-lg border-2 border-dashed ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'}`}>
          <Heart className={`w-12 h-12 mx-auto mb-3 opacity-50 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            No emergency contacts yet
          </p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Add someone to notify in case of an emergency
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} hover:shadow-md transition`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h5 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {contact.name}
                      </h5>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {contact.relationship.charAt(0).toUpperCase() + contact.relationship.slice(1)}
                        {contact.isPrimary && (
                          <span className="ml-2 inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            Primary
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className={`mt-3 space-y-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {contact.phone && (
                      <p>📱 {contact.phone}</p>
                    )}
                    {contact.email && (
                      <p>✉️ {contact.email}</p>
                    )}
                    <p>
                      🔔 Notify via:{' '}
                      <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {contact.notificationPreference === 'BOTH'
                          ? 'Phone & Email'
                          : contact.notificationPreference === 'PHONE'
                          ? 'Phone'
                          : 'Email'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(contact)}
                    className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                    title="Edit contact"
                  >
                    <Edit2 className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                    title="Delete contact"
                  >
                    <Trash2 className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className={`mt-6 p-4 rounded-lg border-l-4 ${isDark ? 'bg-blue-900 border-blue-500 text-blue-200' : 'bg-blue-50 border-blue-500 text-blue-800'}`}>
        <p className="text-sm font-medium mb-1">💡 About Emergency Contacts</p>
        <p className="text-sm">
          When you trigger an emergency beacon, we'll notify your primary contact using their preferred method. Make sure to keep this information up-to-date.
        </p>
      </div>
    </div>
  )
}
