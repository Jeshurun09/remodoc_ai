import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Manage feature access for group members (moderator only)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { groupId, memberId, features } = body

    if (!groupId || !memberId || !features) {
      return NextResponse.json({ 
        error: 'groupId, memberId, and features array are required' 
      }, { status: 400 })
    }

    // Verify user is group moderator
    const group = await prisma.groupSubscription.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (group.moderatorId !== session.user.id) {
      return NextResponse.json({ error: 'Only moderator can manage features' }, { status: 403 })
    }

    // Verify member is in group
    const memberSubscription = await prisma.subscription.findUnique({
      where: { userId: memberId }
    })

    if (!memberSubscription || memberSubscription.groupId !== groupId) {
      return NextResponse.json({ 
        error: 'Member is not in this group' 
      }, { status: 400 })
    }

    // Update or create feature access records
    const updatedFeatures = await Promise.all(
      features.map((feature: { name: string; allowed: boolean }) =>
        prisma.groupFeatureAccess.upsert({
          where: {
            groupId_memberId_featureName: {
              groupId,
              memberId,
              featureName: feature.name
            }
          },
          update: {
            allowed: feature.allowed
          },
          create: {
            groupId,
            memberId,
            featureName: feature.name,
            allowed: feature.allowed
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      features: updatedFeatures
    })
  } catch (error: any) {
    console.error('Feature access error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update feature access' },
      { status: 500 }
    )
  }
}

/**
 * Get feature access for a group member
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const groupId = req.nextUrl.searchParams.get('groupId')
    const memberId = req.nextUrl.searchParams.get('memberId') || session.user.id

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    }

    // Get member's subscription and features
    const memberSubscription = await prisma.subscription.findUnique({
      where: { userId: memberId }
    })

    if (!memberSubscription || memberSubscription.groupId !== groupId) {
      return NextResponse.json({ 
        error: 'Member is not in this group' 
      }, { status: 404 })
    }

    const features = await prisma.groupFeatureAccess.findMany({
      where: {
        groupId,
        memberId
      }
    })

    // Get default features based on plan
    const allFeatures = {
      aiSymptomChecker: true,
      appointmentBooking: true,
      messaging: true,
      healthRecordStorage: true,
      vitalsTracking: true,
      appointmentHistory: true,
      advancedAnalytics: false,
      prioritySupport: false,
      prescriptionManagement: false,
      lifeStyleTracking: false,
      emergencyAlerts: true,
      familySharing: true
    }

    // Override with custom restrictions
    const customAccess: Record<string, boolean> = {}
    features.forEach((f: any) => {
      customAccess[f.featureName] = f.allowed
    })

    const finalAccess = {
      ...allFeatures,
      ...customAccess
    }

    return NextResponse.json({
      memberId,
      groupId,
      features: finalAccess,
      customRestrictions: features
    })
  } catch (error: any) {
    console.error('Get feature access error:', error)
    return NextResponse.json(
      { error: 'Failed to get feature access' },
      { status: 500 }
    )
  }
}
