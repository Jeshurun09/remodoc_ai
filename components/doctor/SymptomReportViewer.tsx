'use client'

import { useState } from 'react'

interface SymptomReport {
  id: string
  symptoms: string
  imageUrl?: string | null
  audioUrl?: string | null
  aiAnalysis?: string | null
  likelyConditions: string
  urgency: string
  careAdvice?: string | null
  locationLat?: number | null
  locationLng?: number | null
  createdAt: string
}

interface SymptomReportViewerProps {
  report: SymptomReport
  patientName: string
}

export default function SymptomReportViewer({ report, patientName }: SymptomReportViewerProps) {
  const [expanded, setExpanded] = useState(false)

  let aiAnalysisData: any = null
  try {
    if (report.aiAnalysis) {
      aiAnalysisData = JSON.parse(report.aiAnalysis)
    }
  } catch (e) {
    console.error('Failed to parse AI analysis:', e)
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

  let likelyConditions: string[] = []
  try {
    likelyConditions = JSON.parse(report.likelyConditions)
  } catch (e) {
    likelyConditions = [report.likelyConditions]
  }

  return (
    <div className="surface rounded-lg p-6 border subtle-border shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
            Symptom Report
          </h3>
          <p className="text-sm text-[var(--foreground)]/70">
            Patient: {patientName} • {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(
            report.urgency
          )}`}
        >
          {report.urgency} Urgency
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)] mb-2">Symptoms</p>
          <p className="text-sm text-[var(--foreground)]/80 bg-black/5 dark:bg-white/5 p-3 rounded">
            {report.symptoms}
          </p>
        </div>

        {report.imageUrl && (
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] mb-2">Image</p>
            <img
              src={report.imageUrl}
              alt="Symptom image"
              className="max-w-full h-auto rounded-lg border subtle-border"
            />
          </div>
        )}

        {report.audioUrl && (
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] mb-2">Audio Recording</p>
            <audio controls className="w-full">
              <source src={report.audioUrl} />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {likelyConditions.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] mb-2">
              Likely Conditions
            </p>
            <div className="flex flex-wrap gap-2">
              {likelyConditions.map((condition, idx) => (
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

        {report.careAdvice && (
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] mb-2">Care Advice</p>
            <p className="text-sm text-[var(--foreground)]/80 bg-black/5 dark:bg-white/5 p-3 rounded">
              {report.careAdvice}
            </p>
          </div>
        )}

        {aiAnalysisData && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-2"
            >
              {expanded ? '▼' : '▶'} AI Analysis Details
            </button>
            {expanded && (
              <pre className="text-xs bg-black/5 dark:bg-white/5 p-3 rounded overflow-auto max-h-96">
                {JSON.stringify(aiAnalysisData, null, 2)}
              </pre>
            )}
          </div>
        )}

        {report.locationLat && report.locationLng && (
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] mb-2">Location</p>
            <p className="text-sm text-[var(--foreground)]/70">
              {report.locationLat.toFixed(4)}, {report.locationLng.toFixed(4)}
            </p>
            <a
              href={`https://www.google.com/maps?q=${report.locationLat},${report.locationLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View on Google Maps
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

