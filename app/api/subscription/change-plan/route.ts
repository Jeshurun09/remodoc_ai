import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SubscriptionPlan } from '@prisma/client'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { newPlan, prorationPolicy } = body

    // Validate plan
    if (!Object.values(SubscriptionPlan).includes(newPlan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Prevent downgrade during active subscription
    const planHierarchy: Record<SubscriptionPlan, number> = {
      FREE: 0,
      STUDENT: 1,
      INDIVIDUAL: 2,
      SMALL_GROUP: 3,
      FAMILY: 4,
    }

    const currentLevel = planHierarchy[subscription.plan as SubscriptionPlan]
    const newLevel = planHierarchy[newPlan as SubscriptionPlan]

    // Calculate prorated amount
    let proratedAmount = 0
    if (newLevel > currentLevel && prorationPolicy === 'charge_difference') {
      // Calculate refund/charge based on remaining days
      const now = new Date()
      const daysRemaining = subscription.endDate 
        ? Math.ceil((subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 30
      
      // Plan pricing (example - customize based on your pricing)
      const pricing: Record<SubscriptionPlan, number> = {
        FREE: 0,
        STUDENT: 2999, // KES 29.99
        INDIVIDUAL: 9999, // KES 99.99
        SMALL_GROUP: 19999, // KES 199.99
        FAMILY: 29999, // KES 299.99
      }

      const currentPrice = pricing[subscription.plan as SubscriptionPlan]
      const newPrice = pricing[newPlan as SubscriptionPlan]
      const dailyDifference = (newPrice - currentPrice) / 30
      proratedAmount = Math.ceil(dailyDifference * daysRemaining)
    }

    // Update subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { userId: session.user.id },
      data: {
        plan: newPlan as SubscriptionPlan,
        updatedAt: new Date()
      }
    })

    // Log plan change
    await prisma.aILog.create({
      data: {
        userId: session.user.id,
        inputType: 'text',
        input: `Plan change: ${subscription.plan} -> ${newPlan}`,
        output: JSON.stringify({ 
          fromPlan: subscription.plan, 
          toPlan: newPlan,
          proratedAmount,
          timestamp: new Date().toISOString()
        }),
        latency: 0,
        model: 'plan-change'
      }
    })

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      proratedAmount,
      message: `Plan changed from ${subscription.plan} to ${newPlan}${proratedAmount > 0 ? `. Additional charge: KES ${(proratedAmount / 100).toFixed(2)}` : ''}`
    })
  } catch (error: any) {
    console.error('Plan change error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to change plan' },
      { status: 500 }
    )
  }
}

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
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Get available plans for upgrade/downgrade
    const planHierarchy: Record<SubscriptionPlan, number> = {
      FREE: 0,
      STUDENT: 1,
      INDIVIDUAL: 2,
      SMALL_GROUP: 3,
      FAMILY: 4,
    }

    const currentLevel = planHierarchy[subscription.plan as SubscriptionPlan]
    const availablePlans = Object.entries(planHierarchy)
      .filter(([_, level]) => level !== currentLevel)
      .map(([plan]) => plan)

    return NextResponse.json({
      currentPlan: subscription.plan,
      availablePlans,
      canUpgrade: availablePlans.some(p => planHierarchy[p as SubscriptionPlan] > currentLevel),
      canDowngrade: availablePlans.some(p => planHierarchy[p as SubscriptionPlan] < currentLevel)
    })
  } catch (error: any) {
    console.error('Get plan options error:', error)
    return NextResponse.json(
      { error: 'Failed to get plan options' },
      { status: 500 }
    )
  }
}
