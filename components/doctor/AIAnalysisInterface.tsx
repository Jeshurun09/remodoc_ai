'use client'

import { useState } from 'react'

interface AIAnalysis {
  careAdvice?: string
  urgency?: string
  likelyConditions?: string[]
  recommendations?: string[]
  [key: string]: any
}

interface AIAnalysisInterfaceProps {
  aiAnalysis: string | null
  symptoms: string
  urgency: string
  likelyConditions: string
}

export default function AIAnalysisInterface({
  aiAnalysis,
  symptoms,
  urgency,
  likelyConditions
}: AIAnalysisInterfaceProps) {
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'raw'>('summary')

  let analysisData: AIAnalysis | null = null
  try {
    if (aiAnalysis) {
      analysisData = JSON.parse(aiAnalysis)
    }
  } catch (e) {
    console.error('Failed to parse AI analysis:', e)
  }

  let conditions: string[] = []
  try {
    conditions = JSON.parse(likelyConditions)
  } catch (e) {
    conditions = [likelyConditions]
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
      case 'LOW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <div className="surface rounded-lg p-6 border subtle-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">AI Analysis</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('summary')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'summary'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'detailed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Detailed
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'raw'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Raw Data
          </button>
        </div>
      </div>

      {viewMode === 'summary' && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] mb-2">Urgency Level</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(
                urgency
              )}`}
            >
              {urgency}
            </span>
          </div>

          {conditions.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)] mb-2">
                Likely Conditions
              </p>
              <div className="flex flex-wrap gap-2">
                {conditions.map((condition, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 rounded-full text-sm"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysisData?.careAdvice && (
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)] mb-2">Care Advice</p>
              <p className="text-sm text-[var(--foreground)]/80 bg-black/5 dark:bg-white/5 p-3 rounded">
                {analysisData.careAdvice}
              </p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'detailed' && analysisData && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] mb-2">Symptoms</p>
            <p className="text-sm text-[var(--foreground)]/80 bg-black/5 dark:bg-white/5 p-3 rounded">
              {symptoms}
            </p>
          </div>

          {Object.entries(analysisData).map(([key, value]) => {
            if (key === 'careAdvice' || key === 'urgency') return null
            return (
              <div key={key}>
                <p className="text-sm font-semibold text-[var(--foreground)] mb-2">
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </p>
                <div className="text-sm text-[var(--foreground)]/80 bg-black/5 dark:bg-white/5 p-3 rounded">
                  {Array.isArray(value) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {value.map((item, idx) => (
                        <li key={idx}>{String(item)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{String(value)}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === 'raw' && (
        <div>
          <pre className="text-xs bg-black/5 dark:bg-white/5 p-4 rounded overflow-auto max-h-96">
            {aiAnalysis ? JSON.stringify(analysisData, null, 2) : 'No AI analysis available'}
          </pre>
        </div>
      )}
    </div>
  )
}

