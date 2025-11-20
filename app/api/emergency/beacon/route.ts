import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmergencySMS } from '@/lib/sms'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { message, location } = body

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patientProfile: true }
    })

    if (!user || !user.patientProfile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    }

    const emergencyPhone = user.patientProfile.emergencyPhone || user.phone
    if (!emergencyPhone) {
      return NextResponse.json(
        { error: 'Emergency contact not configured' },
        { status: 400 }
      )
    }

    const emergencyMessage = message || 
      `Emergency alert from ${user.name}. Please respond immediately.`

    await sendEmergencySMS(emergencyPhone, emergencyMessage, location)

    return NextResponse.json({ success: true, message: 'Emergency beacon sent' })
  } catch (error) {
    console.error('Emergency beacon error:', error)
    return NextResponse.json(
      { error: 'Failed to send emergency beacon' },
      { status: 500 }
    )
  }
}

