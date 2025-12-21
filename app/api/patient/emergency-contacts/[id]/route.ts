import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  context: any
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    const params = context?.params
    const resolvedParams = await params
    const id = resolvedParams?.id

    const emergencyContact = await prisma.emergencyContact.findUnique({
      where: { id }
    })

    if (!emergencyContact) {
      return NextResponse.json({ error: 'Emergency contact not found' }, { status: 404 })
    }

    // Verify ownership
    if (emergencyContact.patientId !== patientProfile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ emergencyContact })
  } catch (error) {
    console.error('Error fetching emergency contact:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emergency contact' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  context: any
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, relationship, phone, email, notificationPreference, isPrimary } = body

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    const params = context?.params
    const resolvedParams = await params
    const id = resolvedParams?.id

    const emergencyContact = await prisma.emergencyContact.findUnique({
      where: { id }
    })

    if (!emergencyContact) {
      return NextResponse.json({ error: 'Emergency contact not found' }, { status: 404 })
    }

    // Verify ownership
    if (emergencyContact.patientId !== patientProfile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If setting as primary, unset other primary contacts
    if (isPrimary && !emergencyContact.isPrimary) {
      await prisma.emergencyContact.updateMany(
        { where: { patientId: patientProfile.id } },
        { isPrimary: false }
      )
    }

    const updated = await prisma.emergencyContact.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(relationship && { relationship }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(notificationPreference && { notificationPreference }),
        ...(isPrimary !== undefined && { isPrimary })
      }
    })

    return NextResponse.json({
      message: 'Emergency contact updated successfully',
      emergencyContact: updated
    })
  } catch (error: any) {
    console.error('Error updating emergency contact:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This contact already exists for this patient' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update emergency contact' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  context: any
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    const params = context?.params
    const resolvedParams = await params
    const id = resolvedParams?.id

    const emergencyContact = await prisma.emergencyContact.findUnique({
      where: { id }
    })

    if (!emergencyContact) {
      return NextResponse.json({ error: 'Emergency contact not found' }, { status: 404 })
    }

    // Verify ownership
    if (emergencyContact.patientId !== patientProfile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.emergencyContact.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Emergency contact deleted successfully' })
  } catch (error) {
    console.error('Error deleting emergency contact:', error)
    return NextResponse.json(
      { error: 'Failed to delete emergency contact' },
      { status: 500 }
    )
  }
}
