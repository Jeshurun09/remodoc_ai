'use client'

import { useState, useEffect } from 'react'

interface ReportData {
  totalUsers: number
  totalDoctors: number
  totalPatients: number
  totalAppointments: number
  pendingDoctors: number
  verifiedDoctors: number
  activeHospitals: number
  totalPrescriptions: number
  totalMessages: number
  totalAILogs: number
  recentAppointments: any[]
  topDoctors: any[]
  appointmentStats: {
    pending: number
    confirmed: number
    completed: number
    cancelled: number
  }
}

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    fetchReports()
  }, [dateRange])

  const fetchReports = async () => {
    try {
      const response = await fetch(`/api/admin/reports?range=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data.reports)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    if (!reportData) return

    const reportText = `
RemoDoc System Report
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange === 'all' ? 'All Time' : `Last ${dateRange}`}

=== User Statistics ===
Total Users: ${reportData.totalUsers}
- Patients: ${reportData.totalPatients}
- Doctors: ${reportData.totalDoctors}
- Verified Doctors: ${reportData.verifiedDoctors}
- Pending Doctor Verifications: ${reportData.pendingDoctors}

=== System Activity ===
Total Appointments: ${reportData.totalAppointments}
- Pending: ${reportData.appointmentStats.pending}
- Confirmed: ${reportData.appointmentStats.confirmed}
- Completed: ${reportData.appointmentStats.completed}
- Cancelled: ${reportData.appointmentStats.cancelled}

Total Prescriptions: ${reportData.totalPrescriptions}
Total Messages: ${reportData.totalMessages}
Total AI Interactions: ${reportData.totalAILogs}
Active Hospitals: ${reportData.activeHospitals}
    `.trim()

    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `remodoc-report-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>
  }

  if (!reportData) {
    return <div className="text-center py-8">No report data available</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">System Reports</h2>
          <p className="text-[var(--foreground)]/70">Comprehensive system analytics and reports</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] bg-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={exportReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface border subtle-border rounded-lg p-6">
          <h3 className="text-sm font-medium text-[var(--foreground)]/70 mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">{reportData.totalUsers}</p>
          <p className="text-xs text-[var(--foreground)]/50 mt-1">
            {reportData.totalPatients} patients, {reportData.totalDoctors} doctors
          </p>
        </div>
        <div className="surface border subtle-border rounded-lg p-6">
          <h3 className="text-sm font-medium text-[var(--foreground)]/70 mb-2">Appointments</h3>
          <p className="text-3xl font-bold text-green-600">{reportData.totalAppointments}</p>
          <p className="text-xs text-[var(--foreground)]/50 mt-1">
            {reportData.appointmentStats.completed} completed
          </p>
        </div>
        <div className="surface border subtle-border rounded-lg p-6">
          <h3 className="text-sm font-medium text-[var(--foreground)]/70 mb-2">AI Interactions</h3>
          <p className="text-3xl font-bold text-purple-600">{reportData.totalAILogs}</p>
          <p className="text-xs text-[var(--foreground)]/50 mt-1">Total AI queries</p>
        </div>
        <div className="surface border subtle-border rounded-lg p-6">
          <h3 className="text-sm font-medium text-[var(--foreground)]/70 mb-2">Hospitals</h3>
          <p className="text-3xl font-bold text-orange-600">{reportData.activeHospitals}</p>
          <p className="text-xs text-[var(--foreground)]/50 mt-1">Active facilities</p>
        </div>
      </div>

      {/* Appointment Statistics */}
      <div className="surface border subtle-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Appointment Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{reportData.appointmentStats.pending}</p>
            <p className="text-sm text-[var(--foreground)]/70">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{reportData.appointmentStats.confirmed}</p>
            <p className="text-sm text-[var(--foreground)]/70">Confirmed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{reportData.appointmentStats.completed}</p>
            <p className="text-sm text-[var(--foreground)]/70">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{reportData.appointmentStats.cancelled}</p>
            <p className="text-sm text-[var(--foreground)]/70">Cancelled</p>
          </div>
        </div>
      </div>

      {/* Doctor Verification Status */}
      <div className="surface border subtle-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Doctor Verification Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--foreground)]/70 mb-1">Verified Doctors</p>
            <p className="text-2xl font-bold text-green-600">{reportData.verifiedDoctors}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--foreground)]/70 mb-1">Pending Verifications</p>
            <p className="text-2xl font-bold text-yellow-600">{reportData.pendingDoctors}</p>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="surface border subtle-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Activity Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[var(--foreground)]">Prescriptions Created</span>
            <span className="font-semibold text-[var(--foreground)]">{reportData.totalPrescriptions}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--foreground)]">Messages Sent</span>
            <span className="font-semibold text-[var(--foreground)]">{reportData.totalMessages}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--foreground)]">AI Interactions</span>
            <span className="font-semibold text-[var(--foreground)]">{reportData.totalAILogs}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

