'use client'

import { useEffect, useState } from 'react'

interface Case {
  id: string
  status: string
  scheduledAt: string | null
  notes: string | null
  patient: {
    user: {
      name: string
      email: string
    }
  }
  symptomReport: {
    id: string
    symptoms: string
    urgency: string
    aiAnalysis: string
    likelyConditions: string
    careAdvice: string | null
  } | null
}

export default function CasesList() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)

  useEffect(() => {
    fetchCases()
  }, [])

  const fetchCases = async () => {
    try {
      const response = await fetch('/api/doctors/cases')
      const data = await response.json()
      if (response.ok) {
        setCases(data.cases || [])
      }
    } catch (error) {
      console.error('Error fetching cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (caseId: string, status: string) => {
    try {
      const response = await fetch(`/api/appointments/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (response.ok) {
        fetchCases()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading cases...</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Patient Cases</h2>
        <p className="text-[var(--foreground)]/70">Approve or reject new appointment requests.</p>
      </div>

      {cases.length === 0 ? (
        <div className="surface text-center py-12 rounded-lg border subtle-border">
          <p className="text-[var(--foreground)]/70">No active cases</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cases.map((caseItem) => (
            <div key={caseItem.id} className="surface border subtle-border rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">
                    {caseItem.patient.user.name}
                  </h3>
                  <p className="text-sm text-[var(--foreground)]/70">{caseItem.patient.user.email}</p>
                  {caseItem.scheduledAt && (
                    <p className="text-sm text-[var(--foreground)]/60 mt-1">
                      Requested: {new Date(caseItem.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    caseItem.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                      : caseItem.status === 'CONFIRMED'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100'
                      : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                  }`}
                >
                  {caseItem.status}
                </span>
              </div>

              {caseItem.symptomReport && (
                <div className="mb-4 space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Symptoms</p>
                    <p className="text-sm text-[var(--foreground)]/80">{caseItem.symptomReport.symptoms}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">AI Analysis</p>
                    <p className="text-sm text-[var(--foreground)]/80">
                      {caseItem.symptomReport.aiAnalysis
                        ? JSON.parse(caseItem.symptomReport.aiAnalysis).careAdvice || 'No analysis available'
                        : 'No analysis available'}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs ${
                      caseItem.symptomReport.urgency === 'CRITICAL' || caseItem.symptomReport.urgency === 'HIGH'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                    }`}
                  >
                    {caseItem.symptomReport.urgency} Urgency
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCase(caseItem)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  View Details
                </button>
                {caseItem.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(caseItem.id, 'CONFIRMED')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(caseItem.id, 'CANCELLED')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCase && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="surface rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border subtle-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[var(--foreground)]">Case Details</h3>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-[var(--foreground)]">
              <div>
                <p className="font-semibold">Patient</p>
                <p>
                  {selectedCase.patient.user.name} ({selectedCase.patient.user.email})
                </p>
              </div>
              {selectedCase.symptomReport && (
                <>
                  <div>
                    <p className="font-semibold">Symptoms</p>
                    <p>{selectedCase.symptomReport.symptoms}</p>
                  </div>
                  <div>
                    <p className="font-semibold">AI Analysis</p>
                    <pre className="bg-black/5 dark:bg-white/5 p-3 rounded text-sm overflow-auto">
                      {JSON.stringify(JSON.parse(selectedCase.symptomReport.aiAnalysis || '{}'), null, 2)}
                    </pre>
                  </div>
                </>
              )}
              {selectedCase.notes && (
                <div>
                  <p className="font-semibold">Notes</p>
                  <p>{selectedCase.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


