export interface UsageLimits {
  chatMessages: number
  documentsGenerated: number
  complianceChecks: number
  aiAnalysis: number
}

export interface UserTier {
  name: string
  limits: UsageLimits
  resetPeriod: "daily" | "weekly" | "monthly"
}

export const USER_TIERS: Record<string, UserTier> = {
  free: {
    name: "Free",
    limits: {
      chatMessages: 10,
      documentsGenerated: 2,
      complianceChecks: 5,
      aiAnalysis: 3,
    },
    resetPeriod: "daily",
  },
  basic: {
    name: "Basic",
    limits: {
      chatMessages: 100,
      documentsGenerated: 10,
      complianceChecks: 25,
      aiAnalysis: 15,
    },
    resetPeriod: "monthly",
  },
  premium: {
    name: "Premium",
    limits: {
      chatMessages: 500,
      documentsGenerated: 50,
      complianceChecks: 100,
      aiAnalysis: 75,
    },
    resetPeriod: "monthly",
  },
  enterprise: {
    name: "Enterprise",
    limits: {
      chatMessages: -1, // unlimited
      documentsGenerated: -1,
      complianceChecks: -1,
      aiAnalysis: -1,
    },
    resetPeriod: "monthly",
  },
}

export function getUserTier(subscriptionStatus?: string): UserTier {
  switch (subscriptionStatus) {
    case "basic":
      return USER_TIERS.basic
    case "premium":
      return USER_TIERS.premium
    case "enterprise":
      return USER_TIERS.enterprise
    default:
      return USER_TIERS.free
  }
}

export function checkUsageLimit(
  currentUsage: number,
  limit: number,
  action: string,
): { allowed: boolean; message?: string } {
  if (limit === -1) {
    return { allowed: true } // unlimited
  }

  if (currentUsage >= limit) {
    return {
      allowed: false,
      message: `You've reached your ${action} limit. Please upgrade your plan to continue.`,
    }
  }

  return { allowed: true }
}

export function getUsagePercentage(current: number, limit: number): number {
  if (limit === -1) return 0 // unlimited
  return Math.min((current / limit) * 100, 100)
}

export function getModelForTier(tier: SubscriptionTier): string {
  return AI_CHAT_TIERS[tier].model
}
