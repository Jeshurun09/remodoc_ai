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

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, name, address, city, state, zipCode, phone, latitude, longitude, emergency, specialties, active } = body

    if (!id) {
      return NextResponse.json({ error: 'Hospital ID is required' }, { status: 400 })
    }

    const hospital = await prisma.hospital.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(state && { state }),
        ...(zipCode && { zipCode }),
        ...(phone && { phone }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(emergency !== undefined && { emergency }),
        ...(active !== undefined && { active }),
        ...(specialties && {
          specialties: typeof specialties === 'string' ? specialties : JSON.stringify(specialties)
        })
      }
    })

    return NextResponse.json({ hospital })
  } catch (error) {
    console.error('Hospital update error:', error)
    return NextResponse.json(
      { error: 'Failed to update hospital' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Hospital ID is required' }, { status: 400 })
    }

    await prisma.hospital.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Hospital deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete hospital' },
      { status: 500 }
    )
  }
}

