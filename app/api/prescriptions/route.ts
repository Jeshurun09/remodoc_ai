import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patientId')

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { doctorProfile: true, patientProfile: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let whereClause: any = {}
    
    if (session.user.role === 'DOCTOR' && user.doctorProfile) {
      whereClause.doctorId = user.doctorProfile.id
      if (patientId) {
        whereClause.patientId = patientId
      }
    } else if (session.user.role === 'PATIENT' && user.patientProfile) {
      whereClause.patientId = user.patientProfile.id
    } else if (patientId) {
      whereClause.patientId = patientId
    }

    const prescriptions = await prisma.prescription.findMany({
      where: whereClause,
      include: {
        doctor: {
          include: {
            user: { select: { name: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map to include patient info for doctors
    const result = await Promise.all(
      prescriptions.map(async (prescription: any) => {
        if (session.user.role === 'DOCTOR') {
          const patient = await prisma.patientProfile.findUnique({
            where: { id: prescription.patientId },
            include: { user: { select: { name: true, email: true } } }
          })
          return {
            ...prescription,
            patient: patient ? { user: patient.user } : null
          }
        }
        return prescription
      })
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch prescriptions:', error)
    return NextResponse.json({ error: 'Failed to fetch prescriptions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'DOCTOR') {
    return NextResponse.json({ error: 'Only doctors can create prescriptions' }, { status: 403 })
  }

  const { patientId, medication, dosage, instructions, startDate, endDate } = await req.json()

  if (!patientId || !medication || !dosage || !instructions || !startDate) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { doctorProfile: true }
    })

    if (!user || !user.doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })
    }

    // Verify patient exists
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
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
      },
      include: {
        doctor: {
          include: {
            user: { select: { name: true, email: true } }
          }
        }
      }
    })

    return NextResponse.json(prescription)
  } catch (error) {
    console.error('Failed to create prescription:', error)
    return NextResponse.json({ error: 'Failed to create prescription' }, { status: 500 })
  }
}
