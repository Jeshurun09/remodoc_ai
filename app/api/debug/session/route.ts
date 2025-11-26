import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Fetch the current session (if any) using the same NextAuth options
    const session = await getServerSession(authOptions)

    // Run a trivial Prisma query so we can tell whether the DB is reachable
    const [userCount, patientCount, doctorCount] = await Promise.all([
      prisma.user.count(),
      prisma.patientProfile.count(),
      prisma.doctorProfile.count()
    ])

    return NextResponse.json({
      ok: true,
      session,
      stats: {
        userCount,
        patientCount,
        doctorCount
      }
    })
  } catch (error) {
    console.error('[Debug Session] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    )
  }
}


