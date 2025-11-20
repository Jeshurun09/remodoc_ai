'use client'

import { useState, useEffect } from 'react'

interface AILog {
  id: string
  inputType: string
  input: string
  output: string
  model: string
  tokensUsed: number | null
  latency: number | null
  createdAt: string
  user: {
    name: string
    email: string
  }
}

export default function AILogs() {
  const [logs, setLogs] = useState<AILog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/ai-logs')
      const data = await response.json()
      if (response.ok) {
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading logs...</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Usage Logs</h2>
        <p className="text-gray-600">Monitor Gemini AI usage and performance</p>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No logs available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {log.user.name} ({log.user.email})
                  </h3>
                  <p className="text-sm text-gray-600">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {log.inputType}
                  </span>
                  {log.latency && (
                    <p className="text-xs text-gray-500 mt-1">{log.latency}ms</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Input:</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {log.input.substring(0, 200)}...
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Model:</p>
                  <p className="text-sm text-gray-600">{log.model}</p>
                  {log.tokensUsed && (
                    <p className="text-xs text-gray-500 mt-1">
                      {log.tokensUsed} tokens
                    </p>
                  )}
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  View Full Output
                </summary>
                <pre className="mt-2 bg-gray-50 p-4 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(JSON.parse(log.output || '{}'), null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

