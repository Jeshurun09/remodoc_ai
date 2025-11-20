'use client'

import { useState, useEffect } from 'react'

export default function Analytics() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      const data = await response.json()
      if (response.ok) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>
  }

  if (!analytics) {
    return <div className="text-center py-8">No analytics data available</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
        <p className="text-gray-600">System statistics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-blue-600 mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-blue-900">{analytics.totalUsers || 0}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-green-600 mb-2">Total Doctors</h3>
          <p className="text-3xl font-bold text-green-900">{analytics.totalDoctors || 0}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-purple-600 mb-2">Total Patients</h3>
          <p className="text-3xl font-bold text-purple-900">{analytics.totalPatients || 0}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-orange-600 mb-2">Total Appointments</h3>
          <p className="text-3xl font-bold text-orange-900">{analytics.totalAppointments || 0}</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Pending Doctor Verifications: {analytics.pendingDoctors || 0}
        </h3>
        <p className="text-sm text-yellow-700">
          Review and verify pending doctor registrations in the Doctor Verification tab.
        </p>
      </div>
    </div>
  )
}

