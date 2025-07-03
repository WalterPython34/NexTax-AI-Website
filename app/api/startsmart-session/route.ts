import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get user subscription details
    const { data: subscription, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching subscription:", error)
      return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
    }

    // Default to free tier if no subscription found
    const userSubscription = subscription || {
      tier: "free",
      questions_limit: 10,
      questions_used: 0,
      status: "active",
    }

    return NextResponse.json({
      subscription: userSubscription,
      canUseAI:
        userSubscription.questions_used < userSubscription.questions_limit || userSubscription.questions_limit === -1,
      questionsRemaining:
        userSubscription.questions_limit === -1
          ? "unlimited"
          : Math.max(0, userSubscription.questions_limit - userSubscription.questions_used),
    })
  } catch (error) {
    console.error("Session check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, action } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: "User ID and action required" }, { status: 400 })
    }

    if (action === "increment_questions") {
      // Increment question usage
      const { data, error } = await supabase
        .from("user_subscriptions")
        .update({
          questions_used: supabase.raw("questions_used + 1"),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select()
        .single()

      if (error) {
        console.error("Error incrementing questions:", error)
        return NextResponse.json({ error: "Failed to update usage" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        questionsUsed: data.questions_used,
        questionsRemaining:
          data.questions_limit === -1 ? "unlimited" : Math.max(0, data.questions_limit - data.questions_used),
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Session update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
