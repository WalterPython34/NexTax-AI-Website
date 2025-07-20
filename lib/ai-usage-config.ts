export interface SubscriptionTier {
  name: string
  limits: {
    chatMessages: number
    documentsGenerated: number
    apiCalls: number
  }
  features: string[]
}

export const AI_CHAT_TIERS: Record<string, SubscriptionTier> = {
  free: {
    name: "Free",
    limits: {
      chatMessages: 10,
      documentsGenerated: 2,
      apiCalls: 50,
    },
    features: ["Basic chat support", "Limited document generation"],
  },
  pro: {
    name: "Pro",
    limits: {
      chatMessages: 100,
      documentsGenerated: 20,
      apiCalls: 500,
    },
    features: ["Advanced chat support", "Priority document generation", "Email support"],
  },
  premium: {
    name: "Premium",
    limits: {
      chatMessages: 500,
      documentsGenerated: 100,
      apiCalls: 2000,
    },
    features: ["Unlimited chat support", "Advanced document generation", "Priority support", "Custom integrations"],
  },
  enterprise: {
    name: "Enterprise",
    limits: {
      chatMessages: -1, // Unlimited
      documentsGenerated: -1, // Unlimited
      apiCalls: -1, // Unlimited
    },
    features: ["Unlimited everything", "Dedicated support", "Custom features", "SLA guarantees"],
  },
}

export function getUserTier(subscriptionStatus: string): SubscriptionTier {
  return AI_CHAT_TIERS[subscriptionStatus] || AI_CHAT_TIERS.free
}

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

export function checkUsageLimit(
  currentUsage: number,
  limit: number,
  resourceType: string,
): { allowed: boolean; message?: string } {
  if (limit === -1) {
    return { allowed: true } // Unlimited
  }

  if (currentUsage >= limit) {
    return {
      allowed: false,
      message: `You've reached your monthly limit of ${limit} ${resourceType}. Please upgrade your plan to continue.`,
    }
  }

  return { allowed: true }
}

