'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Prescription {
  id: string
  medication: string
  dosage: string
  instructions: string
  startDate: string
  endDate: string | null
  patientId: string
  patient?: {
    user: {
      name: string
      email: string
    }
  }
}

interface Patient {
  id: string
  name: string
  email: string
}

export default function PrescriptionsList() {
  const { data: session } = useSession()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    patientId: '',
    medication: '',
    dosage: '',
    instructions: '',
    startDate: '',
    endDate: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPrescriptions()
    fetchPatients()
  }, [])

  const fetchPrescriptions = async () => {
    try {
      const response = await fetch('/api/prescriptions')
      if (response.ok) {
        const data = await response.json()
        setPrescriptions(data)
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error)
    } finally {
      setLoading(false)
    }
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
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (response.ok) {
        setShowForm(false)
        setFormData({
          patientId: '',
          medication: '',
          dosage: '',
          instructions: '',
          startDate: '',
          endDate: ''
        })
        fetchPrescriptions()
      }
    } catch (error) {
      console.error('Error creating prescription:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading prescriptions...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Prescriptions</h2>
          <p className="text-[var(--foreground)]/70">Manage patient prescriptions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + New Prescription
        </button>
      </div>

      {showForm && (
        <div className="surface border subtle-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Create Prescription</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Patient
              </label>
              <select
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
              >
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} ({patient.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Medication
              </label>
              <input
                type="text"
                value={formData.medication}
                onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                placeholder="e.g., Amoxicillin 500mg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Dosage
              </label>
              <input
                type="text"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                placeholder="e.g., 1 tablet twice daily"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Instructions
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                placeholder="Take with food. Complete the full course even if symptoms improve."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {prescriptions.length === 0 ? (
        <div className="text-center py-12 surface rounded-lg border subtle-border">
          <p className="text-[var(--foreground)]/70">No prescriptions yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="surface border subtle-border rounded-lg p-6 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">
                    {prescription.medication}
                  </h3>
                  {prescription.patient && (
                    <p className="text-sm text-[var(--foreground)]/70 mt-1">
                      Patient: {prescription.patient.user.name}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-[var(--foreground)]/80 mb-2">
                <span className="font-medium">Dosage:</span> {prescription.dosage}
              </p>
              <p className="text-sm text-[var(--foreground)]/80 mb-2">
                <span className="font-medium">Instructions:</span> {prescription.instructions}
              </p>
              <p className="text-xs text-[var(--foreground)]/60 mt-2">
                {new Date(prescription.startDate).toLocaleDateString()} -{' '}
                {prescription.endDate
                  ? new Date(prescription.endDate).toLocaleDateString()
                  : 'Ongoing'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

