export interface TierConfig {
  name: string
  limits: {
    chatMessages: number // per month
    documentsGenerated: number // per month
    complianceTracking: boolean
    emailReminders: boolean
    prioritySupport: boolean
  }
  features: string[]
}

export const TIER_CONFIGS: Record<string, TierConfig> = {
  free: {
    name: "Free",
    limits: {
      chatMessages: 10,
      documentsGenerated: 2,
      complianceTracking: false,
      emailReminders: false,
      prioritySupport: false,
    },
    features: ["Basic AI chat support", "2 document generations per month", "Basic business formation guidance"],
  },
  pro: {
    name: "Pro",
    limits: {
      chatMessages: 150,
      documentsGenerated: 25,
      complianceTracking: true,
      emailReminders: true,
      prioritySupport: false,
    },
    features: [
      "Advanced AI chat support",
      "25 document generations per month",
      "Compliance tracking and reminders",
      "Email notifications",
      "Priority document processing",
    ],
  },
  premium: {
    name: "Premium",
    limits: {
      chatMessages: -1, // unlimited
      documentsGenerated: -1, // unlimited
      complianceTracking: true,
      emailReminders: true,
      prioritySupport: true,
    },
    features: [
      "Unlimited AI chat support",
      "Unlimited document generations",
      "Advanced compliance tracking",
      "Priority email support",
      "Custom document templates",
      "Advanced business analytics",
    ],
  },
  enterprise: {
    name: "Enterprise",
    limits: {
      chatMessages: -1, // unlimited
      documentsGenerated: -1, // unlimited
      complianceTracking: true,
      emailReminders: true,
      prioritySupport: true,
    },
    features: [
      "Everything in Premium",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantees",
      "Advanced security features",
    ],
  },
}

export function getUserTier(subscriptionStatus: string): TierConfig {
  const normalizedStatus = subscriptionStatus?.toLowerCase() || "free"
  return TIER_CONFIGS[normalizedStatus] || TIER_CONFIGS.free
}

export function checkUsageLimit(
  currentUsage: number,
  limit: number,
  actionType: string,
): { allowed: boolean; message?: string } {
  if (limit === -1) {
    return { allowed: true } // unlimited
  }

  if (currentUsage >= limit) {
    return {
      allowed: false,
      message: `You've reached your monthly limit of ${limit} ${actionType}s. Please upgrade your plan to continue.`,
    }
  }

  return { allowed: true }
}

export function getRemainingUsage(currentUsage: number, limit: number): number | string {
  if (limit === -1) return "unlimited"
  return Math.max(0, limit - currentUsage)
}
