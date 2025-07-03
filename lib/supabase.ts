import { createClient } from "@supabase/supabase-js"

// Safe environment variable access with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Only create clients if we have the required environment variables
let supabase: any = null
let supabaseAdmin: any = null

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
} catch (error) {
  console.warn("Failed to initialize Supabase client:", error)
}

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  }
} catch (error) {
  console.warn("Failed to initialize Supabase admin client:", error)
}

export { supabase, supabaseAdmin }

// Helper functions with safety checks
export async function getUser() {
  if (!supabase) {
    console.warn("Supabase client not initialized")
    return null
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) throw error
    return user
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

export async function getUserSubscription(userId: string) {
  if (!supabaseAdmin) {
    console.warn("Supabase admin client not initialized")
    return null
  }

  try {
    const { data, error } = await supabaseAdmin.from("user_subscriptions").select("*").eq("user_id", userId).single()

    if (error && error.code !== "PGRST116") throw error
    return data
  } catch (error) {
    console.error("Error getting user subscription:", error)
    return null
  }
}

export async function createUserSubscription(userId: string, email: string) {
  if (!supabaseAdmin) {
    console.warn("Supabase admin client not initialized")
    return null
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        email: email,
        tier: "free",
        status: "active",
        questions_used: 0,
        questions_limit: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error creating user subscription:", error)
    return null
  }
}

export async function updateUserSubscription(userId: string, updates: any) {
  if (!supabaseAdmin) {
    console.warn("Supabase admin client not initialized")
    return null
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("user_subscriptions")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error updating user subscription:", error)
    return null
  }
}
