// AI Chat usage limits configuration by subscription tier
export const AI_CHAT_TIERS = {
  free: {
    label: "Free Tier",
    maxMessages: 10,
    description: "Get started with essential startup advice and AI support. Limit of 10 messages per month.",
    upgradeCta: "Upgrade to Pro for more AI help",
    model: "gpt-3.5-turbo",
    tokenEstimatePerMessage: 500,
  },
  pro: {
    label: "Pro Tier ($29/month)",
    maxMessages: 150,
    description: "Access up to 150 monthly AI chats with business planning, compliance, and automation help.",
    softCapWarningAt: 120,
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    tokenEstimatePerMessage: 500,
    upgradeCta: "Need more? Upgrade to Premium for unlimited access",
  },
  premium: {
    label: "Premium Tier ($79/month)",
    maxMessages: "unlimited" as const,
    softCap: 1500,
    description:
      "Unlimited AI Chat support with advanced tools and longer sessions. Fair usage cap of 1,500 messages/month.",
    softCapWarningAt: 1350,
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    tokenEstimatePerMessage: 500,
    warningMessage: "You're approaching your monthly usage cap. Continued high usage may require rate-limiting.",
  },
} as const

export type SubscriptionTier = keyof typeof AI_CHAT_TIERS

export function checkUsageLimit(
  tier: SubscriptionTier,
  currentUsage: number,
): {
  canSend: boolean
  warningMessage?: string
  upgradeMessage?: string
} {
  const config = AI_CHAT_TIERS[tier]

  if (tier === "premium") {
    const premiumConfig = config as typeof AI_CHAT_TIERS.premium
    if (currentUsage >= premiumConfig.softCap) {
      return {
        canSend: false,
        upgradeMessage: premiumConfig.warningMessage,
      }
    }
    if (currentUsage >= premiumConfig.softCapWarningAt) {
      return {
        canSend: true,
        warningMessage: premiumConfig.warningMessage,
      }
    }
    return { canSend: true }
  }

  // For free and pro tiers with hard limits
  const tierConfig = config as typeof AI_CHAT_TIERS.free | typeof AI_CHAT_TIERS.pro
  if (currentUsage >= tierConfig.maxMessages) {
    return {
      canSend: false,
      upgradeMessage: `You've reached your AI message limit for the month. ${tierConfig.upgradeCta}.`,
    }
  }

  // Show warning when approaching limit
  const warningThreshold =
    tier === "pro"
      ? (tierConfig as typeof AI_CHAT_TIERS.pro).softCapWarningAt!
      : Math.floor(tierConfig.maxMessages * 0.8)
  if (currentUsage >= warningThreshold) {
    return {
      canSend: true,
      warningMessage: `You have ${tierConfig.maxMessages - currentUsage} AI messages remaining this month.`,
    }
  }

  return { canSend: true }
}

export function getModelForTier(tier: SubscriptionTier): string {
  return AI_CHAT_TIERS[tier].model
}

