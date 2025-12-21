'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DoctorProfile {
  id: string
  user: {
    name: string
    email: string
    phone: string
    dateOfBirth: string
    nationality: string
  }
  licenseNumber: string
  licenseIssuingAuthority: string
  licenseIssueDate: string
  licenseExpiryDate: string
  specialization: string
  subspecialty: string
  yearsExperience: number
  medicalSchool: string
  graduationYear: number
  medicalDegree: string
  currentInstitution: string
  professionalContact: string
  verificationStatus: string
  boardCertifications: any[]
  references: any[]
  documents: any[]
  verificationHistory: any[]
}

export default function AdminVerificationPage() {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchDoctors()
  }, [])

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/admin/doctors-for-verification')
      if (res.ok) {
        const data = await res.json()
        setDoctors(data.doctors)
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerificationAction = async (doctorId: string, action: 'approve' | 'reject' | 'request_changes', notes: string) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/verify-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, action, notes })
      })
      if (res.ok) {
        await fetchDoctors()
        setSelectedDoctor(null)
      } else {
        alert('Action failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const verifyReference = async (referenceId: string, verified: boolean, notes: string) => {
    try {
      const res = await fetch('/api/admin/verify-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceId, verified, notes })
      })
      if (res.ok) {
        // Refresh selected doctor data
        if (selectedDoctor) {
          const updatedDoctor = { ...selectedDoctor }
          const refIndex = updatedDoctor.references.findIndex(r => r.id === referenceId)
          if (refIndex !== -1) {
            updatedDoctor.references[refIndex].verified = verified
            updatedDoctor.references[refIndex].verificationNotes = notes
            setSelectedDoctor(updatedDoctor)
          }
        }
      }
    } catch (error) {
      console.error('Error verifying reference:', error)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Doctor Verification Panel</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctors List */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold mb-4">Pending Verifications</h2>
          <div className="space-y-4">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                onClick={() => setSelectedDoctor(doctor)}
                className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  selectedDoctor?.id === doctor.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <h3 className="font-medium">{doctor.user.name}</h3>
                <p className="text-sm text-gray-600">{doctor.specialization}</p>
                <p className="text-sm text-gray-500">{doctor.user.email}</p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                  doctor.verificationStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  doctor.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {doctor.verificationStatus}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Doctor Details */}
        <div className="lg:col-span-2">
          {selectedDoctor ? (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">{selectedDoctor.user.name}</h2>

                {/* Personal Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Email:</strong> {selectedDoctor.user.email}</div>
                    <div><strong>Phone:</strong> {selectedDoctor.user.phone}</div>
                    <div><strong>DOB:</strong> {selectedDoctor.user.dateOfBirth}</div>
                    <div><strong>Nationality:</strong> {selectedDoctor.user.nationality}</div>
                  </div>
                </div>

                {/* Professional Credentials */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Professional Credentials</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>License:</strong> {selectedDoctor.licenseNumber}</div>
                    <div><strong>Authority:</strong> {selectedDoctor.licenseIssuingAuthority}</div>
                    <div><strong>Issue Date:</strong> {selectedDoctor.licenseIssueDate}</div>
                    <div><strong>Expiry:</strong> {selectedDoctor.licenseExpiryDate}</div>
                    <div><strong>Specialization:</strong> {selectedDoctor.specialization}</div>
                    <div><strong>Experience:</strong> {selectedDoctor.yearsExperience} years</div>
                  </div>
                </div>

                {/* Education */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Education</h3>
                  <div className="text-sm">
                    <p><strong>School:</strong> {selectedDoctor.medicalSchool}</p>
                    <p><strong>Graduation:</strong> {selectedDoctor.graduationYear}</p>
                    <p><strong>Degree:</strong> {selectedDoctor.medicalDegree}</p>
                  </div>
                </div>

                {/* Certifications */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Board Certifications</h3>
                  {selectedDoctor.boardCertifications.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDoctor.boardCertifications.map((cert: any, index: number) => (
                        <div key={index} className="text-sm border rounded p-2">
                          <p><strong>{cert.certificationName}</strong></p>
                          <p>Issued by: {cert.issuingBody}</p>
                          <p>Valid: {cert.issueDate} - {cert.expiryDate}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No certifications listed</p>
                  )}
                </div>

                {/* References */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Professional References</h3>
                  {selectedDoctor.references.map((ref: any, index: number) => (
                    <div key={index} className="border rounded p-3 mb-2">
                      <div className="flex justify-between items-start">
                        <div className="text-sm">
                          <p><strong>{ref.name}</strong> - {ref.title}</p>
                          <p>{ref.institution}</p>
                          <p>{ref.email} | {ref.phone}</p>
                          <p><em>{ref.relationship}</em></p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => verifyReference(ref.id, true, '')}
                            className={`px-2 py-1 text-xs rounded ${
                              ref.verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 hover:bg-green-100'
                            }`}
                          >
                            ✓ Verified
                          </button>
                          <button
                            onClick={() => verifyReference(ref.id, false, 'Not verified')}
                            className="px-2 py-1 text-xs rounded bg-red-100 hover:bg-red-200 text-red-800"
                          >
                            ✗ Unverified
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Documents */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Documents</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedDoctor.documents.map((doc: any) => (
                      <div key={doc.id} className="border rounded p-2">
                        <p className="text-sm font-medium capitalize">{doc.documentType.replace('_', ' ')}</p>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View Document
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification History */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Verification History</h3>
                  {selectedDoctor.verificationHistory.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDoctor.verificationHistory.map((history: any, index: number) => (
                        <div key={index} className="text-sm border rounded p-2">
                          <p><strong>{history.action}</strong> by {history.admin.name}</p>
                          <p>{history.notes}</p>
                          <p className="text-gray-500">{new Date(history.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No verification history</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleVerificationAction(selectedDoctor.id, 'approve', '')}
                    disabled={actionLoading}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Enter rejection notes:')
                      if (notes) handleVerificationAction(selectedDoctor.id, 'reject', notes)
                    }}
                    disabled={actionLoading}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Enter change request notes:')
                      if (notes) handleVerificationAction(selectedDoctor.id, 'request_changes', notes)
                    }}
                    disabled={actionLoading}
                    className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Request Changes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Select a doctor to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}