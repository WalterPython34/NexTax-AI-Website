import { supabase } from "./supabase"

export interface UserSubscription {
  tier: "free" | "pro" | "premium"
  questionsUsed: number
  questionsLimit: number
  features: string[]
}

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const { data, error } = await supabase.from("user_subscriptions").select("*").eq("user_id", userId).single()

    if (error) {
      console.error("Error fetching user subscription:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getUserSubscription:", error)
    return null
  }
}

export async function updateQuestionUsage(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("increment_questions_used", {
      user_id: userId,
    })

    if (error) {
      console.error("Error updating question usage:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateQuestionUsage:", error)
    return false
  }
}

export async function canUserAskQuestion(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId)

  if (!subscription) {
    return false
  }

  if (subscription.tier === "premium") {
    return true // Unlimited for premium
  }

  return subscription.questionsUsed < subscription.questionsLimit
}

export function getFeatureAccess(tier: "free" | "pro" | "premium") {
  const features = {
    free: ["basic_ai_chat", "progress_roadmap", "document_templates", "featured_resources"],
    pro: [
      "extended_ai_chat",
      "ai_document_generation",
      "compliance_center",
      "full_knowledge_hub",
      "prompt_playground_100",
    ],
    premium: [
      "unlimited_ai_chat",
      "advanced_business_plans",
      "priority_support",
      "multi_entity_management",
      "prompt_playground_250",
    ],
  }

  return features[tier] || features.free
}
