'use client'

import { useState, useEffect } from 'react'

interface SystemConfig {
  id: string
  key: string
  value: string
  updatedAt: string
  updatedBy?: string
}

export default function SystemConfiguration() {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    key: '',
    value: ''
  })
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/admin/config')
      if (response.ok) {
        const data = await response.json()
        setConfigs(data.configs || [])
      }
    } catch (error) {
      console.error('Error fetching configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (config: SystemConfig) => {
    setEditingConfig(config)
    setFormData({
      key: config.key,
      value: config.value
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    try {
      const url = '/api/admin/config'
      const method = editingConfig ? 'PATCH' : 'POST'
      const body = editingConfig
        ? { id: editingConfig.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: editingConfig ? 'Configuration updated' : 'Configuration created' })
        setShowForm(false)
        setEditingConfig(null)
        setFormData({ key: '', value: '' })
        fetchConfigs()
        setTimeout(() => setMessage(null), 3000)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save configuration' })
      }
    } catch (error) {
      console.error('Error saving config:', error)
      setMessage({ type: 'error', text: 'Failed to save configuration' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return
    try {
      const response = await fetch(`/api/admin/config?id=${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchConfigs()
      }
    } catch (error) {
      console.error('Error deleting config:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading configuration...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">System Configuration</h2>
          <p className="text-[var(--foreground)]/70">Manage system settings and configuration</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Configuration
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="surface border subtle-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            {editingConfig ? 'Edit Configuration' : 'Add New Configuration'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Key</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                required
                disabled={!!editingConfig}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent disabled:opacity-50"
                placeholder="e.g., MAX_APPOINTMENTS_PER_DAY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Value</label>
              <textarea
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
                placeholder="Configuration value"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingConfig ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingConfig(null)
                  setFormData({ key: '', value: '' })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {configs.length === 0 ? (
          <div className="text-center py-12 surface rounded-lg border subtle-border">
            <p className="text-[var(--foreground)]/70">No configurations found</p>
          </div>
        ) : (
          configs.map((config) => (
            <div
              key={config.id}
              className="surface border subtle-border rounded-lg p-4 flex justify-between items-start"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--foreground)] mb-1">{config.key}</h3>
                <p className="text-sm text-[var(--foreground)]/70 mb-1">{config.value}</p>
                <p className="text-xs text-[var(--foreground)]/50">
                  Updated: {new Date(config.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(config)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

