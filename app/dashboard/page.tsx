'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [hasRedirected, setHasRedirected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') {
      return
    }

    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }

    // If authenticated, check for role
    if (status === 'authenticated') {
      // If role exists, redirect immediately
      if (session?.user?.role && !hasRedirected) {
        const role = session.user.role
        setHasRedirected(true)
        
        if (role === 'PATIENT') {
          router.replace('/dashboard/patient')
        } else if (role === 'DOCTOR') {
          router.replace('/dashboard/doctor')
        } else if (role === 'ADMIN') {
          router.replace('/dashboard/admin')
        } else {
          // Invalid role
          console.error('Invalid role:', role)
          router.replace('/login')
        }
        return
      }

      // If no role but authenticated, wait a bit and check again
      if (!session?.user?.role && retryCount < 5) {
        const timer = setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, 300)
        return () => clearTimeout(timer)
      }

      // If still no role after retries, force page reload to refresh session
      if (!session?.user?.role && retryCount >= 5) {
        console.error('Session missing role after retries, reloading page')
        window.location.reload()
        return
      }
    }
  }, [status, session, router, hasRedirected, retryCount])

  return (
    <div className="page-shell flex items-center justify-center">
      <div className="text-xl">
        {status === 'loading' ? 'Loading…' : 'Redirecting…'}
      </div>
    </div>
  )
}

