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
  const doctorId = searchParams.get('doctorId')
  const patientId = searchParams.get('patientId')

  try {
    // Determine the other party's user ID
    let otherUserId: string | undefined

    if (session.user.role === 'DOCTOR' && patientId) {
      otherUserId = patientId
    } else if (session.user.role === 'PATIENT' && doctorId) {
      // For patients, doctorId is the doctorProfile.id, need to get the userId
      const doctor = await prisma.doctorProfile.findUnique({
        where: { id: doctorId },
        select: { userId: true }
      })
      otherUserId = doctor?.userId
    } else if (patientId) {
      otherUserId = patientId
    } else if (doctorId) {
      otherUserId = doctorId
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: otherUserId },
          { receiverId: session.user.id, senderId: otherUserId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { name: true, email: true } },
        receiver: { select: { name: true, email: true } }
      }
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { receiverId, content } = await req.json()

  if (!receiverId || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content
      },
      include: {
        sender: { select: { name: true } },
        receiver: { select: { name: true } }
      }
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('Failed to send message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
