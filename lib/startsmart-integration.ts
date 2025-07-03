import { supabaseAdmin } from "./supabase"
import type { UserSubscription } from "./supabase"

export class StartSmartIntegration {
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabaseAdmin.from("user_subscriptions").select("*").eq("user_id", userId).single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching subscription:", error)
        return null
      }

      return data || null
    } catch (error) {
      console.error("Error in getUserSubscription:", error)
      return null
    }
  }

  static async createOrUpdateSubscription(subscription: Partial<UserSubscription>): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from("user_subscriptions")
        .upsert(
          {
            ...subscription,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        )
        .select()
        .single()

      if (error) {
        console.error("Error upserting subscription:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error in createOrUpdateSubscription:", error)
      return null
    }
  }

  static async incrementQuestionUsage(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from("user_subscriptions")
        .update({
          questions_used: supabaseAdmin.raw("questions_used + 1"),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      if (error) {
        console.error("Error incrementing questions:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in incrementQuestionUsage:", error)
      return false
    }
  }

  static async resetMonthlyUsage(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from("user_subscriptions")
        .update({
          questions_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      if (error) {
        console.error("Error resetting monthly usage:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in resetMonthlyUsage:", error)
      return false
    }
  }

  static canUseAI(subscription: UserSubscription): boolean {
    if (subscription.status !== "active") {
      return false
    }

    // Unlimited for premium
    if (subscription.questions_limit === -1) {
      return true
    }

    // Check if under limit
    return subscription.questions_used < subscription.questions_limit
  }

  static getQuestionsRemaining(subscription: UserSubscription): number | "unlimited" {
    if (subscription.questions_limit === -1) {
      return "unlimited"
    }

    return Math.max(0, subscription.questions_limit - subscription.questions_used)
  }

  static getTierLimits(tier: "free" | "pro" | "premium"): { questions: number; features: string[] } {
    switch (tier) {
      case "free":
        return {
          questions: 10,
          features: ["Basic AI chat", "Progress roadmap", "Document templates", "Basic compliance tracking"],
        }
      case "pro":
        return {
          questions: 150,
          features: [
            "Advanced AI chat",
            "AI document generation",
            "Full knowledge hub",
            "Smart compliance center",
            "100+ AI prompts",
            "Email support",
          ],
        }
      case "premium":
        return {
          questions: -1, // unlimited
          features: [
            "Unlimited AI chat",
            "Premium document suite",
            "Executive business plans",
            "Full compliance automation",
            "250+ AI prompts",
            "1-on-1 consultations",
            "Priority support",
          ],
        }
      default:
        return { questions: 10, features: [] }
    }
  }
}

export default StartSmartIntegration
