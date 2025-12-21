'use client'

import React, { useEffect, useState } from 'react'
import { VerificationStatus } from '@prisma/client'

interface VerificationRequest {
  id: string
  doctorId: string
  fullLegalName: string
  nationalId: string
  registrationNumber: string
  licenseUrl: string | null
  degreeUrl: string | null
  status: VerificationStatus
  backgroundCheckStatus: string
  adminNotes: string | null
  createdAt: string
  reviewedAt: string | null
  doctor?: {
    user?: {
      name: string
      email: string
    }
  }
}

interface DoctorVerificationReviewProps {
  filter?: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
}

export default function DoctorVerificationReview({ filter = 'PENDING' }: DoctorVerificationReviewProps) {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [actionNotes, setActionNotes] = useState('')

  useEffect(() => {
    loadRequests()
  }, [filter])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/doctor-verifications?status=${filter}`)
      if (!res.ok) throw new Error('Failed to load requests')
      const data = await res.json()
      setRequests(data.requests || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading requests')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (requestId: string, action: 'approve' | 'reject' | 'request_background_check') => {
    try {
      setActionInProgress(true)
      const res = await fetch(`/api/admin/doctor-verifications/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          adminNotes: actionNotes,
          backgroundCheckReference: action === 'request_background_check' ? `BG_CHECK_${Date.now()}` : undefined
        })
      })

      if (!res.ok) throw new Error(`Action failed: ${res.statusText}`)
      setActionNotes('')
      setSelectedId(null)
      await loadRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionInProgress(false)
    }
  }

  if (loading) return <div className="p-6 text-center">Loading verification requests...</div>
  if (error) return <div className="p-6 bg-red-50 text-red-700 rounded">{error}</div>

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Doctor Verification Review</h2>

      {requests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No {filter} requests</div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="border rounded-lg p-4 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{req.fullLegalName}</h3>
                  <p className="text-sm text-gray-600">{req.doctor?.user?.email}</p>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {req.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <span className="font-medium">National ID:</span> {req.nationalId}
                </div>
                <div>
                  <span className="font-medium">Registration:</span> {req.registrationNumber}
                </div>
                <div>
                  <span className="font-medium">Background Check:</span> {req.backgroundCheckStatus}
                </div>
                <div>
                  <span className="font-medium">Submitted:</span> {new Date(req.createdAt).toLocaleDateString()}
                </div>
              </div>

              {req.adminNotes && (
                <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                  <strong>Admin Notes:</strong> {req.adminNotes}
                </div>
              )}

              <div className="space-y-3">
                {selectedId === req.id ? (
                  <>
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Add admin notes..."
                      className="w-full p-2 border rounded text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleAction(req.id, 'approve')}
                        disabled={actionInProgress}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(req.id, 'reject')}
                        disabled={actionInProgress}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleAction(req.id, 'request_background_check')}
                        disabled={actionInProgress}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        Request Background Check
                      </button>
                      <button
                        onClick={() => {
                          setSelectedId(null)
                          setActionNotes('')
                        }}
                        disabled={actionInProgress}
                        className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setSelectedId(req.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm w-full"
                  >
                    Review & Take Action
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
