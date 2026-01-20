import { PrismaClient, SubscriptionPlan } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Check if a user has a premium subscription
 */
export async function userHasPremium(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  if (!subscription) return false
  return subscription.plan !== SubscriptionPlan.FREE && subscription.status === 'ACTIVE'
}

/**
 * Check if a user has a specific plan or higher
 */
export async function userHasPlan(userId: string, minPlan: SubscriptionPlan): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  if (!subscription) return false

  const planHierarchy: Record<SubscriptionPlan, number> = {
    FREE: 0,
    STUDENT: 1,
    INDIVIDUAL: 2,
    SMALL_GROUP: 3,
    FAMILY: 4,
  }

  return planHierarchy[subscription.plan] >= planHierarchy[minPlan] && subscription.status === 'ACTIVE'
}

/**
 * Check if user is group moderator
 */
export async function isGroupModerator(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId }
  })
  return subscription?.isGroupModerator ?? false
}

/**
 * Get group members for a moderator
 */
export async function getGroupMembers(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId }
  })

  if (!subscription?.groupId || !subscription.isGroupModerator) {
    return []
  }

  const members = await prisma.subscription.findMany({
    where: { groupId: subscription.groupId },
    include: { user: true }
  })

  return members
}

/**
 * Check if user has access to a specific feature
 */
export async function userHasFeatureAccess(userId: string, featureName: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId }
  })

  if (!subscription || subscription.status !== 'ACTIVE') {
    return false
  }

  // If not in a group, use default feature access
  if (!subscription.groupId) {
    const features = await getUserFeatureAccess(userId)
    return features[featureName as keyof typeof features] ?? false
  }

  // Check custom feature restrictions for group members
  const featureAccess = await prisma.groupFeatureAccess.findUnique({
    where: {
      groupId_memberId_featureName: {
        groupId: subscription.groupId,
        memberId: userId,
        featureName
      }
    }
  })

  // If there's a custom restriction, use it
  if (featureAccess) {
    return featureAccess.allowed
  }

  // Otherwise use default access for the plan
  const features = await getUserFeatureAccess(userId)
  return features[featureName as keyof typeof features] ?? false
}

/**
 * Get feature access level for a user
 */
export async function getUserFeatureAccess(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })

  const baseFeatures = {
    aiSymptomChecker: true,
    appointmentBooking: true,
    messaging: true,
    emergencyAlerts: true,
  }

  if (!subscription || subscription.status !== 'ACTIVE') {
    return baseFeatures
  }

  const premiumFeatures = {
    ...baseFeatures,
    healthRecordStorage: true,
    vitalsTracking: true,
    appointmentHistory: true,
  }

  const advancedFeatures = {
    ...premiumFeatures,
    advancedAnalytics: true,
    prioritySupport: true,
    prescriptionManagement: true,
    lifeStyleTracking: true,
    familySharing: true,
  }

  switch (subscription.plan) {
    case SubscriptionPlan.INDIVIDUAL:
    case SubscriptionPlan.STUDENT:
      return premiumFeatures
    case SubscriptionPlan.SMALL_GROUP:
    case SubscriptionPlan.FAMILY:
      return advancedFeatures
    default:
      return baseFeatures
  }
}

/**
 * Get plan change history for a user
 */
export async function getPlanChangeHistory(userId: string) {
  const aiLogs = await prisma.aILog.findMany({
    where: {
      userId,
      model: 'plan-change'
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  return aiLogs.map(log => ({
    timestamp: log.createdAt,
    details: log.output ? JSON.parse(log.output) : null
  }))
}

