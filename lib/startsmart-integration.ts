// StartSmart GPT Integration Utilities
import { supabase } from "./supabase"

export interface StartSmartUser {
  id: string
  email: string
  firstName: string
  lastName: string
  subscriptionTier: "free" | "starter" | "growth"
  hasAccess: boolean
}

export async function getStartSmartUserData(userId: string): Promise<StartSmartUser | null> {
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (profileError) throw profileError

    // Check subscription status
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("product_type", "startsmart")
      .eq("status", "active")
      .single()

    const subscriptionTier = subscription?.price_tier || "free"
    const hasAccess = true // Everyone gets at least free access

    return {
      id: userId,
      email: profile.email,
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      subscriptionTier,
      hasAccess,
    }
  } catch (error) {
    console.error("Error fetching StartSmart user data:", error)
    return null
  }
}

export async function createStartSmartSession(userId: string) {
  try {
    const userData = await getStartSmartUserData(userId)
    if (!userData) throw new Error("User not found")

    // Create a secure session token for the embedded app
    const sessionToken = btoa(
      JSON.stringify({
        userId,
        tier: userData.subscriptionTier,
        timestamp: Date.now(),
        // Add any other data your Replit app needs
      }),
    )

    return {
      success: true,
      sessionToken,
      userData,
    }
  } catch (error) {
    console.error("Error creating StartSmart session:", error)
    return {
      success: false,
      error: "Failed to create session",
    }
  }
}
