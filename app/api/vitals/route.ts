import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const vitals = await prisma.vitalsData.findMany({
      where: { userId: session.user.id },
      orderBy: { recordedAt: 'desc' },
      take: 50
    })

    return NextResponse.json(vitals)
  } catch (error) {
    console.error('Failed to fetch vitals:', error)
    return NextResponse.json({ error: 'Failed to fetch vitals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    heartRate,
    spO2,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    temperature,
    glucose,
    deviceType,
    deviceName
  } = await req.json()

  try {
    const vitals = await prisma.vitalsData.create({
      data: {
        userId: session.user.id,
        heartRate,
        spO2,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        temperature,
        glucose,
        deviceType,
        deviceName
      }
    })

    return NextResponse.json(vitals)
  } catch (error) {
    console.error('Failed to save vitals:', error)
    return NextResponse.json({ error: 'Failed to save vitals' }, { status: 500 })
  }
}

