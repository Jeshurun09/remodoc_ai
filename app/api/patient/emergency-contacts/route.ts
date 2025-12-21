import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        emergencyContacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }]
        }
      }
    })

    if (!patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      emergencyContacts: patientProfile.emergencyContacts
    })
  } catch (error) {
    console.error('Error fetching emergency contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emergency contacts' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, relationship, phone, email, notificationPreference, isPrimary } = body

    // Validation
    if (!name || !relationship) {
      return NextResponse.json(
        { error: 'Name and relationship are required' },
        { status: 400 }
      )
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'At least phone or email must be provided' },
        { status: 400 }
      )
    }

    if (!['EMAIL', 'PHONE', 'BOTH'].includes(notificationPreference)) {
      return NextResponse.json(
        { error: 'Invalid notification preference' },
        { status: 400 }
      )
    }

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    // If this is set as primary, unset other primary contacts
    if (isPrimary) {
      await prisma.emergencyContact.updateMany(
        { where: { patientId: patientProfile.id } },
        { isPrimary: false }
      )
    }

    const emergencyContact = await prisma.emergencyContact.create({
      data: {
        patientId: patientProfile.id,
        name,
        relationship,
        phone: phone || null,
        email: email || null,
        notificationPreference,
        isPrimary: isPrimary || false,
        verified: false
      }
    })

    return NextResponse.json({
      message: 'Emergency contact created successfully',
      emergencyContact
    })
  } catch (error: any) {
    console.error('Error creating emergency contact:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This contact already exists for this patient' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create emergency contact' },
      { status: 500 }
    )
  }
}
