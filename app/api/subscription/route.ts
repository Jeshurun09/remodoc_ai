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
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    })

    if (!subscription) {
      // Return free plan as default
      return NextResponse.json({
        plan: 'FREE',
        status: 'ACTIVE',
        startDate: new Date().toISOString()
      })
    }

    return NextResponse.json({
      plan: subscription.plan,
      status: subscription.status,
      startDate: subscription.startDate.toISOString(),
      endDate: subscription.endDate?.toISOString()
    })
  } catch (error) {
    console.error('Failed to fetch subscription:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan } = await req.json()

  if (!plan) {
    return NextResponse.json({ error: 'Plan is required' }, { status: 400 })
  }

  try {
    // Check if subscription exists
    const existing = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    })

    const planUpper = plan.toUpperCase().replace('-', '_')
    const endDate = planUpper === 'FREE' ? null : new Date()
    if (endDate) {
      endDate.setMonth(endDate.getMonth() + 1) // 1 month subscription
    }

    if (existing) {
      // Update existing subscription
      const subscription = await prisma.subscription.update({
        where: { userId: session.user.id },
        data: {
          plan: planUpper as any,
          status: planUpper === 'FREE' ? 'ACTIVE' : 'ACTIVE',
          endDate
        }
      })

      return NextResponse.json({ success: true, subscription })
    } else {
      // Create new subscription
      const subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          plan: planUpper as any,
          status: planUpper === 'FREE' ? 'ACTIVE' : 'ACTIVE',
          endDate
        }
      })

      return NextResponse.json({ success: true, subscription })
    }
  } catch (error) {
    console.error('Failed to create/update subscription:', error)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}

