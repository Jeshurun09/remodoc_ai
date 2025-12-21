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
 * Get feature access level for a user
 */
export async function getUserFeatureAccess(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })

  const baseFeatures = {
    aiSymptomChecker: true,
    appointmentBooking: true,
    messaging: true,
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
