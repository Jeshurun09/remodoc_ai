'use client'

import { useState, useEffect } from 'react'

interface Doctor {
  id: string
  licenseNumber: string
  specialization: string
  yearsExperience: number
  verificationStatus: string
  user: {
    name: string
    email: string
  }
}

export default function DoctorVerification() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDoctors()
  }, [])

  const fetchDoctors = async () => {
    try {
      const response = await fetch('/api/admin/doctors')
      const data = await response.json()
      if (response.ok) {
        setDoctors(data.doctors || [])
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (doctorId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const response = await fetch('/api/admin/doctors/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, status })
      })
      if (response.ok) {
        fetchDoctors()
      }
    } catch (error) {
      console.error('Error verifying doctor:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  const pendingDoctors = doctors.filter(d => d.verificationStatus === 'PENDING')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Doctor Verification</h2>
        <p className="text-gray-600">Review and verify doctor registrations</p>
      </div>

      {pendingDoctors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No pending verifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {doctor.user.name}
                  </h3>
                  <p className="text-sm text-gray-600">{doctor.user.email}</p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  PENDING
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">License Number</p>
                  <p className="text-sm text-gray-900">{doctor.licenseNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Specialization</p>
                  <p className="text-sm text-gray-900">{doctor.specialization}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Experience</p>
                  <p className="text-sm text-gray-900">{doctor.yearsExperience} years</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleVerify(doctor.id, 'VERIFIED')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Verify
                </button>
                <button
                  onClick={() => handleVerify(doctor.id, 'REJECTED')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

