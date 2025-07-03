import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for browser usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Auth helpers
export async function getUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// User subscription helpers
export async function getUserSubscription(userId: string) {
  const { data, error } = await supabase.from("user_subscriptions").select("*").eq("user_id", userId).single()

  if (error) {
    console.error("Error fetching subscription:", error)
    return null
  }

  return data
}

export async function createUserSubscription(userId: string, tier = "free") {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      tier,
      status: "active",
      questions_used: 0,
      questions_limit: tier === "free" ? 10 : tier === "pro" ? 150 : -1,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating subscription:", error)
    return null
  }

  return data
}

export async function updateUserSubscription(userId: string, updates: any) {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    console.error("Error updating subscription:", error)
    return null
  }

  return data
}
