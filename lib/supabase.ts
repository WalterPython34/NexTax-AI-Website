import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client with service role key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Client-side auth helper
export const getUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// Check if user has StartSmartGPT access
export const hasStartSmartAccess = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single()

  return !error && data && (data.tier === "pro" || data.tier === "premium")
}

// Get user subscription details
export const getUserSubscription = async (userId: string) => {
  const { data, error } = await supabaseAdmin.from("user_subscriptions").select("*").eq("user_id", userId).single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching subscription:", error)
    return null
  }

  return data
}

// Database types
export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface UserSubscription {
  id: string
  user_id: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  tier: "free" | "pro" | "premium"
  questions_limit: number
  questions_used: number
  status: "active" | "canceled" | "past_due" | "incomplete"
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  title?: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  role: "user" | "assistant" | "system"
  content: string
  created_at: string
}

export interface BusinessProfile {
  id: string
  user_id: string
  business_name?: string
  business_type?: string
  industry?: string
  state?: string
  formation_status: string
  created_at: string
  updated_at: string
}
