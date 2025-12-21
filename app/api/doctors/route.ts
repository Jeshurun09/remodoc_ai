import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch verified doctors first without user relation to avoid join issues
    const doctorProfiles = await prisma.doctorProfile.findMany({
      where: { 
        verificationStatus: 'VERIFIED'
      }
    })

    // Then fetch users for each doctor, handling missing users gracefully
    const doctorsWithUsers = await Promise.all(
      doctorProfiles.map(async (doctor) => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: doctor.userId }
          })
          return { ...doctor, user }
        } catch (error) {
          // If user doesn't exist, return null
          console.warn(`User not found for doctor ${doctor.id}: ${doctor.userId}`)
          return { ...doctor, user: null }
        }
      })
    )

    // Filter out doctors without users and sort
    const validDoctors = doctorsWithUsers
      .filter((doctor) => doctor.user !== null)
      .sort((a, b) => {
        const nameA = a.user?.name || ''
        const nameB = b.user?.name || ''
        return nameA.localeCompare(nameB)
      })

    return NextResponse.json({
      doctors: validDoctors.map((doctor) => ({
        id: doctor.id,
        userId: doctor.userId,
        name: doctor.user?.name || 'Unknown',
        email: doctor.user?.email || '',
        specialization: doctor.specialization,
        currentInstitution: doctor.currentInstitution
      }))
    })
  } catch (error: any) {
    console.error('Doctors list error:', error)
    const errorMessage = error?.message || 'Failed to fetch doctors'
    return NextResponse.json(
      { error: errorMessage },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

