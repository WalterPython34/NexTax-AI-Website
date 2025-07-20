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

export const AI_CHAT_TIERS = TIER_CONFIGS

export function getModelForTier(tier: string): string {
  switch (tier) {
    case "premium":
    case "enterprise":
    case "pro":
      return "gpt-4"
    default:
      return "gpt-3.5-turbo"
  }
}

export type SubscriptionTier = keyof typeof TIER_CONFIGS

export function getUserTier(subscriptionStatus: string): TierConfig {
  const normalizedStatus = subscriptionStatus?.toLowerCase() || "free"
  return TIER_CONFIGS[normalizedStatus] || TIER_CONFIGS.free
}

export function checkUsageLimit(
  tier: SubscriptionTier,
  currentUsage: number,
): {
  canSend: boolean
  warningMessage?: string
  upgradeMessage?: string
} {
  const config = TIER_CONFIGS[tier]
  const limit = config.limits.chatMessages

  if (limit === -1) {
    return { canSend: true }
  }

  if (currentUsage >= limit) {
    return {
      canSend: false,
      upgradeMessage: `You've reached your monthly limit of ${limit} messages. Please upgrade your plan to continue.`,
    }
  }

  const remaining = limit - currentUsage
  if (remaining <= 5) {
    return {
      canSend: true,
      warningMessage: `You have ${remaining} messages remaining this month.`,
    }
  }

  return { canSend: true }
}

export function getRemainingUsage(currentUsage: number, limit: number): number | string {
  if (limit === -1) return "unlimited"
  return Math.max(0, limit - currentUsage)
}
