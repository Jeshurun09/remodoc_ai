import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // If no token, the authorized callback will handle redirect
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Role-based route protection
    const role = token.role as string | undefined

    if (!role) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Patient routes - only accessible by PATIENT role
    if (path.startsWith('/dashboard/patient')) {
      if (role !== 'PATIENT') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Doctor routes - only accessible by DOCTOR role
    if (path.startsWith('/dashboard/doctor')) {
      if (role !== 'DOCTOR') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Admin routes - only accessible by ADMIN role
    if (path.startsWith('/dashboard/admin')) {
      if (role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
}

