import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Set user as online
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        isOnline: true,
        lastSeen: new Date()
      }
    })

    return NextResponse.json({ message: 'User set as online' })
  } catch (error) {
    console.error('Failed to set user online:', error)
    return NextResponse.json({ error: 'Failed to update online status' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Set user as offline
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        isOnline: false,
        lastSeen: new Date()
      }
    })

    return NextResponse.json({ message: 'User set as offline' })
  } catch (error) {
    console.error('Failed to set user offline:', error)
    return NextResponse.json({ error: 'Failed to update online status' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') // 'DOCTOR' or 'PATIENT'

  try {
    let users

    if (role === 'DOCTOR') {
      // Get online doctors
      users = await prisma.user.findMany({
        where: {
          role: 'DOCTOR',
          doctorProfile: {
            verificationStatus: 'VERIFIED'
          }
        },
        select: {
          id: true,
          name: true,
          isOnline: true,
          lastSeen: true,
          doctorProfile: {
            select: {
              specialization: true
            }
          }
        }
      })
    } else if (role === 'PATIENT') {
      // Get online patients (for doctors to see)
      users = await prisma.user.findMany({
        where: {
          role: 'PATIENT'
        },
        select: {
          id: true,
          name: true,
          isOnline: true,
          lastSeen: true
        }
      })
    } else {
      return NextResponse.json({ error: 'Invalid role parameter' }, { status: 400 })
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Failed to fetch online users:', error)
    return NextResponse.json({ error: 'Failed to fetch online status' }, { status: 500 })
  }
}