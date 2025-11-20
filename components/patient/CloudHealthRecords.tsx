'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface HealthRecord {
  id: string
  title: string
  description?: string
  fileUrl?: string
  recordType: string
  createdAt: string
}

export default function CloudHealthRecords() {
  const { data: session } = useSession()
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    if (!session?.user?.id) return
    try {
      const res = await fetch('/api/health-records')
      if (res.ok) {
        const data = await res.json()
        setRecords(data)
      }
    } catch (error) {
      console.error('Failed to fetch records:', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', file.name)
    formData.append('recordType', getRecordType(file.name))

    try {
      const res = await fetch('/api/health-records', {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        alert('Health record uploaded and encrypted successfully!')
        fetchRecords()
      } else {
        alert('Failed to upload record')
      }
    } catch (error) {
      console.error('Failed to upload record:', error)
      alert('Failed to upload record')
    } finally {
      setUploading(false)
    }
  }

  const getRecordType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop()
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return 'image'
    if (ext === 'pdf') return 'report'
    if (filename.toLowerCase().includes('lab')) return 'lab_result'
    if (filename.toLowerCase().includes('prescription')) return 'prescription'
    return 'report'
  }

  const downloadRecord = async (record: HealthRecord) => {
    if (!record.fileUrl) return
    try {
      const res = await fetch(`/api/health-records/${record.id}/download`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = record.title
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download record:', error)
      alert('Failed to download record')
    }
  }

  const shareRecord = async (record: HealthRecord) => {
    if (!record.fileUrl) return
    try {
      const res = await fetch(`/api/health-records/${record.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id })
      })
      if (res.ok) {
        const data = await res.json()
        navigator.clipboard.writeText(data.shareUrl)
        alert('Shareable link copied to clipboard!')
      }
    } catch (error) {
      console.error('Failed to share record:', error)
    }
  }

  const deleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return
    try {
      const res = await fetch(`/api/health-records/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchRecords()
      }
    } catch (error) {
      console.error('Failed to delete record:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cyan-500">Secure Cloud Health Records</h2>
        <Link href="/premium" className="text-sm text-cyan-500 hover:underline">
          Upgrade to Premium
        </Link>
      </div>

      {/* Upload Section */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Upload Health Records</h3>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileUpload}
            disabled={uploading}
            className="text-sm text-cyan-500"
          />
          {uploading && <span className="text-cyan-500">Uploading...</span>}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          All files are encrypted and stored securely (HIPAA compliant)
        </p>
      </div>

      {/* Records List */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">
          Your Health Records ({records.length})
        </h3>
        {records.length === 0 ? (
          <p className="text-cyan-500 text-center py-8">No records yet. Upload your first health record above.</p>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div key={record.id} className="p-4 bg-gray-50 rounded-lg border flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-cyan-500">{record.title}</div>
                  {record.description && (
                    <div className="text-sm text-cyan-500 mt-1">{record.description}</div>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {record.recordType}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-green-600">🔒 Encrypted</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {record.fileUrl && (
                    <>
                      <button
                        onClick={() => downloadRecord(record)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => shareRecord(record)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                      >
                        Share
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deleteRecord(record.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Storage Info */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Storage Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Total Records</div>
            <div className="text-2xl font-bold text-cyan-500">{records.length}</div>
            <div className="text-xs text-gray-500 mt-1">Unlimited storage</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Encryption</div>
            <div className="text-lg font-semibold text-cyan-500">AES-256</div>
            <div className="text-xs text-gray-500 mt-1">Bank-level security</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Compliance</div>
            <div className="text-lg font-semibold text-cyan-500">HIPAA</div>
            <div className="text-xs text-gray-500 mt-1">Fully compliant</div>
          </div>
        </div>
      </div>
    </div>
  )
}

