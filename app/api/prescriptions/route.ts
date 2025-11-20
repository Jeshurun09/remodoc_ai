import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { patientId, medication, dosage, instructions, startDate, endDate } = body

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { doctorProfile: true }
    })

    if (!user || !user.doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })
    }

    const prescription = await prisma.prescription.create({
      data: {
        doctorId: user.doctorProfile.id,
        patientId,
        medication,
        dosage,
        instructions,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null
      }
    })

    return NextResponse.json({ prescription })
  } catch (error) {
    console.error('Prescription creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create prescription' },
      { status: 500 }
    )
  }
}

