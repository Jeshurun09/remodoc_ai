import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SubscriptionPlan } from '@prisma/client'

/**
 * Create or manage a group subscription (moderator only)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, plan = SubscriptionPlan.FAMILY, maxMembers = 5, groupId, memberId, featureName, allowed } = body

    // Create new group subscription
    if (action === 'create') {
      // Check if user already has a group
      const existingGroup = await prisma.groupSubscription.findUnique({
        where: { moderatorId: session.user.id }
      })

      if (existingGroup) {
        return NextResponse.json({ error: 'User already has an active group' }, { status: 400 })
      }

      // Validate plan is group plan
      if (![SubscriptionPlan.SMALL_GROUP, SubscriptionPlan.FAMILY].includes(plan)) {
        return NextResponse.json({ error: 'Plan must be SMALL_GROUP or FAMILY' }, { status: 400 })
      }

      // Create group subscription
      const group = await prisma.groupSubscription.create({
        data: {
          plan,
          maxMembers,
          moderatorId: session.user.id,
          status: 'TRIAL'
        }
      })

      // Update moderator's subscription to point to group
      await prisma.subscription.upsert({
        where: { userId: session.user.id },
        update: {
          groupId: group.id,
          isGroupModerator: true,
          plan
        },
        create: {
          userId: session.user.id,
          groupId: group.id,
          isGroupModerator: true,
          plan
        }
      })

      return NextResponse.json({
        success: true,
        group: {
          id: group.id,
          plan: group.plan,
          maxMembers: group.maxMembers,
          status: group.status
        }
      })
    }

    // Add member to group
    if (action === 'add-member') {
      if (!groupId) {
        return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
      }

      const group = await prisma.groupSubscription.findUnique({
        where: { id: groupId },
        include: { members: true }
      })

      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }

      // Check if user is moderator
      if (group.moderatorId !== session.user.id) {
        return NextResponse.json({ error: 'Only moderator can add members' }, { status: 403 })
      }

      // Check group size
      if (group.members.length >= group.maxMembers) {
        return NextResponse.json({ 
          error: `Group is full (${group.maxMembers} members max)` 
        }, { status: 400 })
      }

      // Check if member exists
      const memberUser = await prisma.user.findUnique({
        where: { email: memberId } // or userId if passed directly
      })

      if (!memberUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Add member to group
      const updatedSubscription = await prisma.subscription.upsert({
        where: { userId: memberUser.id },
        update: {
          groupId,
          plan: group.plan
        },
        create: {
          userId: memberUser.id,
          groupId,
          plan: group.plan
        }
      })

      return NextResponse.json({
        success: true,
        member: {
          id: memberUser.id,
          email: memberUser.email,
          name: memberUser.name
        },
        subscription: updatedSubscription
      })
    }

    // Remove member from group
    if (action === 'remove-member') {
      if (!groupId || !memberId) {
        return NextResponse.json({ error: 'groupId and memberId are required' }, { status: 400 })
      }

      const group = await prisma.groupSubscription.findUnique({
        where: { id: groupId }
      })

      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }

      // Check if user is moderator
      if (group.moderatorId !== session.user.id) {
        return NextResponse.json({ error: 'Only moderator can remove members' }, { status: 403 })
      }

      // Remove member
      await prisma.subscription.update({
        where: { userId: memberId },
        data: {
          groupId: null,
          plan: SubscriptionPlan.FREE
        }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Group subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to manage group subscription' },
      { status: 500 }
    )
  }
}

/**
 * Get group subscription details
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      include: {
        group: {
          include: {
            members: true,
            features: true
          }
        }
      }
    })

    if (!subscription?.group) {
      return NextResponse.json({ error: 'No group subscription found' }, { status: 404 })
    }

    return NextResponse.json({
      group: {
        id: subscription.group.id,
        plan: subscription.group.plan,
        maxMembers: subscription.group.maxMembers,
        memberCount: subscription.group.members.length,
        isModerator: subscription.isGroupModerator,
        members: subscription.group.members.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          email: m.user?.email,
          isModerated: m.isGroupModerator
        })),
        features: subscription.group.features
      }
    })
  } catch (error: any) {
    console.error('Get group subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to get group subscription' },
      { status: 500 }
    )
  }
}
