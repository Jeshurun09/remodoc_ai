'use client'

import { useState, useRef, useEffect } from 'react'
import { useSpeechRecognitionHook } from '@/components/SpeechRecognitionProvider'

interface VoiceAnalysis {
  healthIndicators: string[]
  recommendations: string
  confidence: number
  analysis: string
}

export default function VoiceHealthAnalysis() {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<any[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { transcript, listening, startListening, stopListening, resetTranscript } = useSpeechRecognitionHook()

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const fetchAnalyses = async () => {
    try {
      const res = await fetch('/api/voice-health/analyze')
      if (res.ok) {
        const data = await res.json()
        setAnalyses(data.analyses || [])
      }
    } catch (error) {
      console.error('Error fetching analyses:', error)
    }
  }

  const startRecording = () => {
    setIsRecording(true)
    setDuration(0)
    setAnalysis(null)
    setError(null)
    resetTranscript()
    startListening()
    
    intervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1)
    }, 1000)
  }

  const stopRecording = () => {
    setIsRecording(false)
    stopListening()
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const analyzeVoice = async () => {
    if (!transcript || duration < 3) {
      setError('Please record at least 3 seconds of audio')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/voice-health/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript,
          duration: duration
        })
      })

      const data = await response.json()
      if (response.ok) {
        setAnalysis(data.analysis)
        fetchAnalyses()
      } else {
        setError(data.error || 'Failed to analyze voice')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-500 mb-2">Voice Health Analysis</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Record your voice to analyze health indicators. Uses your phone's microphone - no hardware needed.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 font-semibold flex items-center space-x-2"
              >
                <span className="w-3 h-3 bg-white rounded-full"></span>
                <span>Start Recording</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 font-semibold flex items-center space-x-2"
              >
                <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                <span>Stop Recording</span>
              </button>
            )}
          </div>

          {isRecording && (
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-500">{formatTime(duration)}</div>
              <p className="text-sm text-gray-500 mt-2">Recording in progress...</p>
            </div>
          )}

          {transcript && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transcript:
              </label>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-800 dark:text-gray-200">{transcript}</p>
              </div>
            </div>
          )}

          {transcript && !isRecording && (
            <button
              onClick={analyzeVoice}
              disabled={loading}
              className="w-full px-4 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-semibold disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze Voice Health'}
            </button>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {analysis && (
            <div className="mt-6 space-y-4">
              <h3 className="text-xl font-bold text-cyan-500">Analysis Results</h3>
              
              <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 mb-2">
                  Confidence: {(analysis.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-gray-700 dark:text-gray-300">{analysis.analysis}</p>
              </div>

              {analysis.healthIndicators && analysis.healthIndicators.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Health Indicators:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.healthIndicators.map((indicator: string, idx: number) => (
                      <li key={idx} className="text-gray-600 dark:text-gray-400">{indicator}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.recommendations && (
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Recommendations:</h4>
                  <p className="text-gray-600 dark:text-gray-400">{analysis.recommendations}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {analyses.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-cyan-500 mb-4">Previous Analyses</h3>
          <div className="space-y-3">
            {analyses.slice(0, 5).map((item: any) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-semibold text-cyan-500">
                    {item.duration}s
                  </span>
                </div>
                {item.recommendations && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {item.recommendations}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

