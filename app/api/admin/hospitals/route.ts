import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hospitals = await prisma.hospital.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ hospitals })
  } catch (error) {
    console.error('Hospitals fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hospitals' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, address, city, state, zipCode, phone, latitude, longitude, emergency, specialties } = body

    const hospital = await prisma.hospital.create({
      data: {
        name,
        address,
        city,
        state,
        zipCode,
        phone,
        latitude,
        longitude,
        emergency: emergency || false,
        specialties: typeof specialties === 'string' ? specialties : JSON.stringify(specialties || [])
      }
    })

    return NextResponse.json({ hospital })
  } catch (error) {
    console.error('Hospital creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create hospital' },
      { status: 500 }
    )
  }
}

