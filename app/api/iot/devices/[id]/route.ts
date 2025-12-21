import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  context: any
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = context?.params
    const resolvedParams = await params
    const id = resolvedParams?.id

    const device = await prisma.iotDevice.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    return NextResponse.json({ device })
  } catch (error) {
    console.error('Failed to fetch device:', error)
    return NextResponse.json({ error: 'Failed to fetch device' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  context: any
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, isConnected, syncInterval, battery, firmwareVersion } = body

  try {
    const params = context?.params
    const resolvedParams = await params
    const id = resolvedParams?.id

    const device = await prisma.iotDevice.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const updated = await prisma.iotDevice.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(isConnected !== undefined && { isConnected }),
        ...(syncInterval && { syncInterval }),
        ...(battery !== undefined && { battery }),
        ...(firmwareVersion && { firmwareVersion }),
        lastSync: isConnected === true ? new Date() : undefined
      }
    })

    return NextResponse.json({ message: 'Device updated', device: updated })
  } catch (error) {
    console.error('Failed to update device:', error)
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: any
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = context?.params
    const resolvedParams = await params
    const id = resolvedParams?.id

    const device = await prisma.iotDevice.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    await prisma.iotDevice.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Device disconnected' })
  } catch (error) {
    console.error('Failed to delete device:', error)
    return NextResponse.json({ error: 'Failed to disconnect device' }, { status: 500 })
  }
}
