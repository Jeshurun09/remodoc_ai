'use client'

import { useState, useRef, useEffect } from 'react'

interface ReportSummary {
  summary: string
  keyFindings: string[]
  recommendations: string
  urgency: string
}

export default function MedicalReportSummary() {
  const [reportText, setReportText] = useState('')
  const [reportType, setReportType] = useState('lab_result')
  const [file, setFile] = useState<File | null>(null)
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSummaries()
  }, [])

  const fetchSummaries = async () => {
    try {
      const res = await fetch('/api/medical-reports/summarize')
      if (res.ok) {
        const data = await res.json()
        setSummaries(data.summaries || [])
      }
    } catch (error) {
      console.error('Error fetching summaries:', error)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    // Try to extract text from PDF or text file
    if (selectedFile.type === 'text/plain') {
      const text = await selectedFile.text()
      setReportText(text)
    } else if (selectedFile.type === 'application/pdf') {
      // For PDF, we'd need a PDF parser library
      setError('PDF text extraction not yet implemented. Please paste the text manually.')
    }
  }

  const summarizeReport = async () => {
    if (!reportText.trim()) {
      setError('Please enter or upload report text')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/medical-reports/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportText: reportText,
          reportType: reportType
        })
      })

      const data = await response.json()
      if (response.ok) {
        setSummary(data.summary)
        fetchSummaries()
      } else {
        setError(data.error || 'Failed to summarize report')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const urgencyColors: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-500 mb-2">Medical Report Summary AI</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Upload or paste your medical report to get a clear, patient-friendly summary. Solves the pain point of confusing medical reports.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Report Type:
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="lab_result">Lab Result</option>
              <option value="imaging">Imaging Report</option>
              <option value="pathology">Pathology Report</option>
              <option value="discharge_summary">Discharge Summary</option>
              <option value="consultation">Consultation Note</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Report File (optional):
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Report Text:
            </label>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Paste your medical report text here..."
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <button
            onClick={summarizeReport}
            disabled={loading || !reportText.trim()}
            className="w-full px-4 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-semibold disabled:opacity-50"
          >
            {loading ? 'Summarizing...' : 'Generate Summary'}
          </button>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {summary && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-cyan-500">Summary</h3>
                {summary.urgency && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${urgencyColors[summary.urgency]}`}>
                    {summary.urgency}
                  </span>
                )}
              </div>

              <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{summary.summary}</p>
              </div>

              {summary.keyFindings && summary.keyFindings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Findings:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {summary.keyFindings.map((finding: string, idx: number) => (
                      <li key={idx} className="text-gray-600 dark:text-gray-400">{finding}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.recommendations && (
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Recommendations:</h4>
                  <p className="text-gray-600 dark:text-gray-400">{summary.recommendations}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {summaries.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-cyan-500 mb-4">Previous Summaries</h3>
          <div className="space-y-3">
            {summaries.slice(0, 5).map((item: any) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-semibold text-cyan-500">{item.reportType}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {item.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

