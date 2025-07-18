import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import { checkUsageLimit, AI_CHAT_TIERS, type SubscriptionTier } from "@/lib/ai-usage-config"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const user = await storage.getUser(userId)
    const subscriptionTier = (user?.subscriptionTier || "free") as SubscriptionTier
    const currentUsage = await storage.getUserCurrentUsage(userId)
    const usageCheck = checkUsageLimit(subscriptionTier, currentUsage.messageCount)

    return NextResponse.json({
      tier: subscriptionTier,
      usage: currentUsage,
      limits: {
        maxMessages: AI_CHAT_TIERS[subscriptionTier].maxMessages,
        description: AI_CHAT_TIERS[subscriptionTier].description,
      },
      canSend: usageCheck.canSend,
      warningMessage: usageCheck.warningMessage,
      upgradeMessage: usageCheck.upgradeMessage,
    })
  } catch (error) {
    console.error("Error fetching user usage:", error)
    return NextResponse.json({ message: "Failed to fetch user usage" }, { status: 500 })
  }
}
