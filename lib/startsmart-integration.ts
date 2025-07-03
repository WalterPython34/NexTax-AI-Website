// StartSmart GPT Integration utilities
export interface StartSmartUser {
  id: string
  email: string
  subscription_tier: "free" | "pro" | "premium"
  created_at: string
  last_active: string
}

export interface StartSmartSession {
  user_id: string
  session_token: string
  expires_at: string
}

// Check if user has access to StartSmart features
export async function checkStartSmartAccess(userId: string): Promise<boolean> {
  try {
    // This will integrate with your Supabase user table
    // For now, return true for authenticated users
    return !!userId
  } catch (error) {
    console.error("Error checking StartSmart access:", error)
    return false
  }
}

// Get user's subscription tier
export async function getUserSubscriptionTier(userId: string): Promise<"free" | "pro" | "premium"> {
  try {
    // This will check the user's subscription in Supabase
    // For now, default to free
    return "free"
  } catch (error) {
    console.error("Error getting subscription tier:", error)
    return "free"
  }
}

// Create session for embedded app
export async function createStartSmartSession(userId: string): Promise<string | null> {
  try {
    // Generate session token for embedded app authentication
    const sessionToken = `ss_${userId}_${Date.now()}`

    // Store session in database with expiration
    // This would integrate with your Supabase sessions table

    return sessionToken
  } catch (error) {
    console.error("Error creating StartSmart session:", error)
    return null
  }
}
