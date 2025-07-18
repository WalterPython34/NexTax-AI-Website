export type SubscriptionTier = "free" | "starter" | "professional" | "enterprise"

export interface UsageLimits {
  maxMessages: number
  maxDocuments: number
  description: string
  model: string
}

export const AI_CHAT_TIERS: Record<SubscriptionTier, UsageLimits> = {
  free: {
    maxMessages: 10,
    maxDocuments: 2,
    description: "Basic AI assistance with limited usage",
    model: "gpt-3.5-turbo",
  },
  starter: {
    maxMessages: 100,
    maxDocuments: 10,
    description: "Enhanced AI assistance for growing businesses",
    model: "gpt-4",
  },
  professional: {
    maxMessages: 500,
    maxDocuments: 50,
    description: "Professional AI assistance with priority support",
    model: "gpt-4",
  },
  enterprise: {
    maxMessages: -1, // unlimited
    maxDocuments: -1, // unlimited
    description: "Unlimited AI assistance with dedicated support",
    model: "gpt-4",
  },
}

export function checkUsageLimit(tier: SubscriptionTier, currentUsage: number) {
  const limits = AI_CHAT_TIERS[tier]

  if (limits.maxMessages === -1) {
    return {
      canSend: true,
      warningMessage: null,
      upgradeMessage: null,
    }
  }

  const remaining = limits.maxMessages - currentUsage
  const isNearLimit = remaining <= 5
  const isAtLimit = remaining <= 0

  if (isAtLimit) {
    return {
      canSend: false,
      warningMessage: null,
      upgradeMessage: `You've reached your ${limits.maxMessages} message limit for this month. Upgrade to continue using StartSmart GPT.`,
    }
  }

  if (isNearLimit) {
    return {
      canSend: true,
      warningMessage: `You have ${remaining} messages remaining this month.`,
      upgradeMessage: null,
    }
  }

  return {
    canSend: true,
    warningMessage: null,
    upgradeMessage: null,
  }
}

export function getModelForTier(tier: SubscriptionTier): string {
  return AI_CHAT_TIERS[tier].model
}
