'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) return null

  const role = session.user.role

  if (role === 'PATIENT') {
    router.push('/dashboard/patient')
    return null
  } else if (role === 'DOCTOR') {
    router.push('/dashboard/doctor')
    return null
  } else if (role === 'ADMIN') {
    router.push('/dashboard/admin')
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">Redirecting...</div>
    </div>
  )
}

