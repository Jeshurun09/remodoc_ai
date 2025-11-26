'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface DoctorProfile {
  id: string
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
  verifiedAt: string | null
  licenseNumber: string
  specialization: string
}

export default function VerificationStatus() {
  const { data: session } = useSession()
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      fetchDoctorProfile()
    }
  }, [session])

  const fetchDoctorProfile = async () => {
    try {
      const response = await fetch('/api/doctors/profile')
      if (response.ok) {
        const data = await response.json()
        setDoctorProfile(data.profile)
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="surface rounded-lg p-4 border subtle-border">
        <div className="text-center py-4">Loading verification status...</div>
      </div>
    )
  }

  if (!doctorProfile) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'Your account has been verified and you can access all features.'
      case 'PENDING':
        return 'Your account is pending admin verification. You will be notified once verified.'
      case 'REJECTED':
        return 'Your verification was rejected. Please contact support for assistance.'
      default:
        return ''
    }
  }

  return (
    <div className="surface rounded-lg p-6 border subtle-border shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            Verification Status
          </h3>
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                doctorProfile.verificationStatus
              )}`}
            >
              {doctorProfile.verificationStatus}
            </span>
            {doctorProfile.verifiedAt && (
              <span className="text-sm text-[var(--foreground)]/70">
                Verified on: {new Date(doctorProfile.verifiedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--foreground)]/70">
            {getStatusMessage(doctorProfile.verificationStatus)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t subtle-border">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]/70">License Number</p>
          <p className="text-sm text-[var(--foreground)]">{doctorProfile.licenseNumber}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]/70">Specialization</p>
          <p className="text-sm text-[var(--foreground)]">{doctorProfile.specialization}</p>
        </div>
      </div>
    </div>
  )
}

