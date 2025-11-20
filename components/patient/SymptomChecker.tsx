'use client'

import { useState, useRef } from 'react'
import { useSpeechRecognitionHook } from '@/components/SpeechRecognitionProvider'

interface SymptomCheckerProps {
  location: { lat: number; lng: number } | null
}

export default function SymptomChecker({ location }: SymptomCheckerProps) {
  const [symptoms, setSymptoms] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { transcript, listening, startListening, stopListening, resetTranscript } = useSpeechRecognitionHook()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      let imageBase64 = null
      if (image) {
        const reader = new FileReader()
        imageBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1]
            resolve(base64)
          }
          reader.readAsDataURL(image)
        })
      }

      const response = await fetch('/api/symptoms/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: symptoms || transcript,
          imageBase64,
          location
        })
      })

      const data = await response.json()
      if (response.ok) {
        setResult(data)
      } else {
        alert(data.error || 'Failed to analyze symptoms')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const urgencyColors = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Symptom Checker</h2>
        <p className="text-gray-600">Describe your symptoms using text, voice, or upload an image</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe Your Symptoms
          </label>
          <textarea
            value={symptoms || transcript}
            onChange={(e) => {
              setSymptoms(e.target.value)
              resetTranscript()
            }}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your symptoms here or use voice input..."
          />
        </div>

        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            className={`px-4 py-2 rounded-lg ${
              listening
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {listening ? '🛑 Stop Recording' : '🎤 Voice Input'}
          </button>
          {transcript && (
            <button
              type="button"
              onClick={resetTranscript}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image (Optional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            📷 Upload Image
          </button>
          {imagePreview && (
            <div className="mt-4">
              <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg" />
              <button
                type="button"
                onClick={() => {
                  setImage(null)
                  setImagePreview(null)
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (!symptoms && !transcript)}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Analyze Symptoms'}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Analysis Results</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${urgencyColors[result.urgency]}`}>
              {result.urgency} Urgency
            </span>
          </div>

          {result.analysis?.likelyConditions && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Likely Conditions:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {result.analysis.likelyConditions.map((condition: string, idx: number) => (
                  <li key={idx}>{condition}</li>
                ))}
              </ul>
            </div>
          )}

          {result.analysis?.careAdvice && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Care Advice:</h4>
              <p className="text-gray-700">{result.analysis.careAdvice}</p>
            </div>
          )}

          {result.urgency === 'CRITICAL' || result.urgency === 'HIGH' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">
                ⚠️ This may require immediate medical attention. Please seek emergency care or contact a healthcare provider.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

