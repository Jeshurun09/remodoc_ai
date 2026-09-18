'use client'

import { useState } from 'react'

interface DocumentsStepProps {
  onNext: (data: Record<string, any>) => void
  onBack: () => void
  initialData: Record<string, any>
}

interface DocumentFile {
  type: string
  file: File | null
  url: string
}

export default function DocumentsStep({ onNext, onBack, initialData }: DocumentsStepProps) {
  const [documents, setDocuments] = useState<Record<string, DocumentFile>>({
    license: { type: 'license', file: null, url: initialData.licenseUrl || '' },
    degree: { type: 'degree', file: null, url: initialData.degreeUrl || '' },
    gov_id: { type: 'gov_id', file: null, url: initialData.govIdUrl || '' },
    headshot: { type: 'headshot', file: null, url: initialData.headshotUrl || '' },
    cv: { type: 'cv', file: null, url: initialData.cvUrl || '' }
  })
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const requiredDocs = ['license', 'degree', 'gov_id', 'headshot']

  const validate = () => {
    const newErrors: Record<string, string> = {}
    requiredDocs.forEach(doc => {
      if (!documents[doc].url && !documents[doc].file) {
        newErrors[doc] = `${doc.replace('_', ' ').toUpperCase()} is required`
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileChange = (docType: string, file: File | null) => {
    setDocuments(prev => ({
      ...prev,
      [docType]: { ...prev[docType], file }
    }))
    if (errors[docType]) {
      setErrors(prev => ({ ...prev, [docType]: '' }))
    }
  }

  const uploadFile = async (docType: string) => {
    const doc = documents[docType]
    if (!doc.file) return doc.url

    setUploading(prev => ({ ...prev, [docType]: true }))
    try {
      const formData = new FormData()
      formData.append('file', doc.file)
      formData.append('type', docType)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setDocuments(prev => ({
          ...prev,
          [docType]: { ...prev[docType], url: data.url }
        }))
        return data.url
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert(`Failed to upload ${docType}`)
      return ''
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    // Upload all files
    const uploadedUrls: Record<string, string> = {}
    for (const docType of Object.keys(documents)) {
      const url = await uploadFile(docType)
      if (url) {
        uploadedUrls[`${docType}Url`] = url
      } else if (documents[docType].url) {
        uploadedUrls[`${docType}Url`] = documents[docType].url
      }
    }

    onNext(uploadedUrls)
  }

  const renderFileInput = (docType: string, label: string, required: boolean = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="file"
        accept={docType === 'headshot' ? 'image/*' : docType === 'cv' ? '.pdf,.doc,.docx' : '.pdf,.jpg,.jpeg,.png'}
        onChange={(e) => handleFileChange(docType, e.target.files?.[0] || null)}
        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {documents[docType].url && (
        <p className="mt-1 text-sm text-green-600">✓ Uploaded</p>
      )}
      {uploading[docType] && (
        <p className="mt-1 text-sm text-blue-600">Uploading...</p>
      )}
      {errors[docType] && <p className="mt-1 text-sm text-red-600">{errors[docType]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Document Requirements</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Medical License: PDF or image of your current medical license</li>
          <li>• Degree Certificate: PDF or image of your medical degree</li>
          <li>• Government Photo ID: Passport, driver's license, or national ID</li>
          <li>• Professional Headshot: Recent photo in professional attire</li>
          <li>• CV/Resume: PDF format (optional but recommended)</li>
        </ul>
      </div>

      {renderFileInput('license', 'Medical License', true)}
      {renderFileInput('degree', 'Degree Certificate', true)}
      {renderFileInput('gov_id', 'Government Photo ID', true)}
      {renderFileInput('headshot', 'Professional Headshot', true)}
      {renderFileInput('cv', 'CV/Resume')}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
        >
          Back
        </button>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          disabled={Object.values(uploading).some(Boolean)}
        >
          {Object.values(uploading).some(Boolean) ? 'Uploading...' : 'Complete Profile Update'}
        </button>
      </div>
    </form>
  )
}