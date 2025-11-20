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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tracking = await prisma.lifestyleTracking.findMany({
      where: {
        userId: session.user.id,
        date: { gte: today }
      },
      orderBy: { date: 'desc' },
      take: 7
    })

    return NextResponse.json(tracking)
  } catch (error) {
    console.error('Failed to fetch lifestyle tracking:', error)
    return NextResponse.json({ error: 'Failed to fetch lifestyle tracking' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sleepHours, hydration, steps, activityMinutes, notes } = await req.json()

  try {
    const tracking = await prisma.lifestyleTracking.create({
      data: {
        userId: session.user.id,
        sleepHours,
        hydration,
        steps,
        activityMinutes,
        notes
      }
    })

    return NextResponse.json(tracking)
  } catch (error) {
    console.error('Failed to save lifestyle tracking:', error)
    return NextResponse.json({ error: 'Failed to save lifestyle tracking' }, { status: 500 })
  }
}

