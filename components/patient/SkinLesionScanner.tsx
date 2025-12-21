'use client'

import { useState, useRef, useEffect } from 'react'

interface LesionAnalysis {
  lesionType: string
  riskLevel: string
  characteristics: {
    size?: string
    color?: string
    shape?: string
    borders?: string
    texture?: string
  }
  recommendations: string
  confidence: number
  analysis: string
}

export default function SkinLesionScanner() {
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [bodyLocation, setBodyLocation] = useState('')
  const [analysis, setAnalysis] = useState<LesionAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scans, setScans] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  useEffect(() => {
    fetchScans()
  }, [])

  const fetchScans = async () => {
    try {
      const res = await fetch('/api/skin-lesion/analyze')
      if (res.ok) {
        const data = await res.json()
        setScans(data.scans || [])
      }
    } catch (error) {
      console.error('Error fetching scans:', error)
    }
  }

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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCapturing(true)
      }
    } catch (error) {
      setError('Unable to access camera. Please use file upload instead.')
    }
  }

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
            setImage(file)
            setImagePreview(canvas.toDataURL())
            stopCamera()
          }
        }, 'image/jpeg')
      }
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsCapturing(false)
    }
  }

  const analyzeLesion = async () => {
    if (!image) {
      setError('Please select or capture an image')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const reader = new FileReader()
      const imageBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.readAsDataURL(image)
      })

      const response = await fetch('/api/skin-lesion/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageBase64,
          bodyLocation: bodyLocation
        })
      })

      const data = await response.json()
      if (response.ok) {
        setAnalysis(data.analysis)
        fetchScans()
      } else {
        setError(data.error || 'Failed to analyze skin lesion')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const riskColors: Record<string, string> = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-500 mb-2">Skin Lesion AI Scanner</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Life-saving feature that uses your existing camera to analyze skin lesions. Always consult a dermatologist for professional evaluation.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Body Location (optional):
            </label>
            <input
              type="text"
              value={bodyLocation}
              onChange={(e) => setBodyLocation(e.target.value)}
              placeholder="e.g., left arm, back, face..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Capture or Upload Image:
            </label>
            <div className="flex space-x-2">
              <button
                onClick={isCapturing ? stopCamera : startCamera}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-semibold"
              >
                {isCapturing ? 'Stop Camera' : 'Use Camera'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {isCapturing && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <button
                onClick={capturePhoto}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 font-semibold"
              >
                Capture Photo
              </button>
            </div>
          )}

          {imagePreview && (
            <div>
              <img
                src={imagePreview}
                alt="Skin lesion preview"
                className="w-full max-w-md mx-auto rounded-lg border border-gray-200 dark:border-gray-700"
              />
            </div>
          )}

          <button
            onClick={analyzeLesion}
            disabled={loading || !image}
            className="w-full px-4 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-semibold disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze Skin Lesion'}
          </button>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {analysis && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-cyan-500">Analysis Results</h3>
                {analysis.riskLevel && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${riskColors[analysis.riskLevel]}`}>
                    {analysis.riskLevel.toUpperCase()} RISK
                  </span>
                )}
              </div>

              <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 mb-2">
                  Confidence: {(analysis.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-gray-700 dark:text-gray-300">{analysis.analysis}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Lesion Type:</h4>
                <p className="text-gray-600 dark:text-gray-400">{analysis.lesionType}</p>
              </div>

              {analysis.characteristics && Object.keys(analysis.characteristics).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Characteristics:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(analysis.characteristics).map(([key, value]) => (
                      <li key={key} className="text-gray-600 dark:text-gray-400 capitalize">
                        <strong>{key}:</strong> {value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.recommendations && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">⚠️ Important:</h4>
                  <p className="text-yellow-600 dark:text-yellow-400">{analysis.recommendations}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {scans.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-cyan-500 mb-4">Previous Scans</h3>
          <div className="space-y-3">
            {scans.slice(0, 5).map((item: any) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${riskColors[item.riskLevel || 'medium']}`}>
                    {item.riskLevel?.toUpperCase() || 'UNKNOWN'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {item.bodyLocation && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Location: {item.bodyLocation}
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

