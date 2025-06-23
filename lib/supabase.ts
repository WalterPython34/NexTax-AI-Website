import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client-side auth helper
export const getUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// Check if user has StartSmartGPT access
export const hasStartSmartAccess = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("product_type", "startsmart")
    .eq("status", "active")
    .single()

  return !error && data
}
