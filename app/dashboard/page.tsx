'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }

    if (status === 'authenticated' && session?.user?.role) {
      const role = session.user.role
      if (role === 'PATIENT') {
        router.replace('/dashboard/patient')
      } else if (role === 'DOCTOR') {
        router.replace('/dashboard/doctor')
      } else if (role === 'ADMIN') {
        router.replace('/dashboard/admin')
      }
    }
  }, [status, session?.user?.role, router, session?.user])

  return (
    <div className="page-shell flex items-center justify-center">
      <div className="text-xl">
        {status === 'loading' ? 'Loading…' : 'Redirecting…'}
      </div>
    </div>
  )
}

