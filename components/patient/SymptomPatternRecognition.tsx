'use client'

import { useState, useEffect } from 'react'

interface PatternAnalysis {
  patternType: string
  frequency: string
  triggers: string[]
  aiInsights: string
  recommendations: string
  confidence: number
}

export default function SymptomPatternRecognition() {
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [currentSymptom, setCurrentSymptom] = useState('')
  const [pattern, setPattern] = useState<PatternAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patterns, setPatterns] = useState<any[]>([])

  useEffect(() => {
    fetchPatterns()
  }, [])

  const fetchPatterns = async () => {
    try {
      const res = await fetch('/api/symptom-patterns/recognize')
      if (res.ok) {
        const data = await res.json()
        setPatterns(data.patterns || [])
      }
    } catch (error) {
      console.error('Error fetching patterns:', error)
    }
  }

  const addSymptom = () => {
    if (currentSymptom.trim() && !symptoms.includes(currentSymptom.trim())) {
      setSymptoms([...symptoms, currentSymptom.trim()])
      setCurrentSymptom('')
    }
  }

  const removeSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom))
  }

  const recognizePattern = async () => {
    if (symptoms.length === 0) {
      setError('Please add at least one symptom')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/symptom-patterns/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: symptoms
        })
      })

      const data = await response.json()
      if (response.ok) {
        setPattern(data.pattern)
        fetchPatterns()
      } else {
        setError(data.error || 'Failed to recognize patterns')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-500 mb-2">Symptom Pattern Recognition</h2>
        <p className="text-gray-600 dark:text-gray-400">
          AI-powered pattern recognition that catches things human doctors might miss. Identifies recurring, seasonal, or progressive patterns.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Symptoms:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentSymptom}
                onChange={(e) => setCurrentSymptom(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                placeholder="Enter a symptom..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={addSymptom}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-semibold"
              >
                Add
              </button>
            </div>
          </div>

          {symptoms.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Symptoms:
              </label>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((symptom, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
                  >
                    {symptom}
                    <button
                      onClick={() => removeSymptom(symptom)}
                      className="ml-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={recognizePattern}
            disabled={loading || symptoms.length === 0}
            className="w-full px-4 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-semibold disabled:opacity-50"
          >
            {loading ? 'Analyzing Patterns...' : 'Recognize Patterns'}
          </button>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {pattern && (
            <div className="mt-6 space-y-4">
              <h3 className="text-xl font-bold text-cyan-500">Pattern Analysis</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pattern Type</p>
                  <p className="text-lg font-semibold text-cyan-700 dark:text-cyan-300 capitalize">
                    {pattern.patternType}
                  </p>
                </div>
                <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Frequency</p>
                  <p className="text-lg font-semibold text-cyan-700 dark:text-cyan-300 capitalize">
                    {pattern.frequency}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 mb-2">
                  Confidence: {(pattern.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-gray-700 dark:text-gray-300">{pattern.aiInsights}</p>
              </div>

              {pattern.triggers && pattern.triggers.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Potential Triggers:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {pattern.triggers.map((trigger: string, idx: number) => (
                      <li key={idx} className="text-gray-600 dark:text-gray-400">{trigger}</li>
                    ))}
                  </ul>
                </div>
              )}

              {pattern.recommendations && (
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Recommendations:</h4>
                  <p className="text-gray-600 dark:text-gray-400">{pattern.recommendations}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {patterns.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-cyan-500 mb-4">Previous Pattern Analyses</h3>
          <div className="space-y-3">
            {patterns.slice(0, 5).map((item: any) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-semibold text-cyan-500 capitalize">{item.patternType}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {item.aiInsights}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

