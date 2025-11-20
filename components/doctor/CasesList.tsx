'use client'

import { useState, useEffect } from 'react'

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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Cases</h2>
        <p className="text-gray-600">Manage and review patient cases</p>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No active cases</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cases.map((caseItem) => (
            <div
              key={caseItem.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {caseItem.patient.user.name}
                  </h3>
                  <p className="text-sm text-gray-600">{caseItem.patient.user.email}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    caseItem.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {caseItem.status}
                </span>
              </div>

              {caseItem.symptomReport && (
                <div className="mb-4 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Symptoms:</p>
                    <p className="text-sm text-gray-600">{caseItem.symptomReport.symptoms}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">AI Analysis:</p>
                    <p className="text-sm text-gray-600">
                      {caseItem.symptomReport.aiAnalysis
                        ? JSON.parse(caseItem.symptomReport.aiAnalysis).careAdvice || 'No analysis available'
                        : 'No analysis available'}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs ${
                      caseItem.symptomReport.urgency === 'CRITICAL' || caseItem.symptomReport.urgency === 'HIGH'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {caseItem.symptomReport.urgency} Urgency
                  </span>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedCase(caseItem)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  View Details
                </button>
                {caseItem.status === 'PENDING' && (
                  <button
                    onClick={() => handleUpdateStatus(caseItem.id, 'CONFIRMED')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Confirm
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Case Details</h3>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-semibold">Patient:</p>
                <p>{selectedCase.patient.user.name} ({selectedCase.patient.user.email})</p>
              </div>
              {selectedCase.symptomReport && (
                <>
                  <div>
                    <p className="font-semibold">Symptoms:</p>
                    <p>{selectedCase.symptomReport.symptoms}</p>
                  </div>
                  <div>
                    <p className="font-semibold">AI Analysis:</p>
                    <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                      {JSON.stringify(JSON.parse(selectedCase.symptomReport.aiAnalysis || '{}'), null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

