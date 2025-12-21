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
    const devices = await prisma.iotDevice.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('Failed to fetch devices:', error)
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { deviceId, name, type, macAddress, dataTypes, manufacturer, timezone } = await req.json()

  if (!deviceId || !name || !type) {
    return NextResponse.json(
      { error: 'Missing required fields: deviceId, name, type' },
      { status: 400 }
    )
  }

  try {
    // Check if device already connected
    const existing = await prisma.iotDevice.findUnique({
      where: {
        userId_deviceId: {
          userId: session.user.id,
          deviceId
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Device already connected' },
        { status: 409 }
      )
    }

    const device = await prisma.iotDevice.create({
      data: {
        userId: session.user.id,
        deviceId,
        name,
        type,
        macAddress: macAddress || null,
        dataTypes: JSON.stringify(dataTypes || []),
        manufacturer: manufacturer || null,
        timezone: timezone || null,
        isConnected: true,
        lastSync: new Date()
      }
    })

    return NextResponse.json(
      { message: 'Device connected successfully', device },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to connect device:', error)
    return NextResponse.json({ error: 'Failed to connect device' }, { status: 500 })
  }
}
