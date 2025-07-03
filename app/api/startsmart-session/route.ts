import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get user subscription
    const { data: subscription, error } = await supabaseAdmin
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error) {
      console.error("Error fetching subscription:", error)
      return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error("Error in startsmart-session GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, action, ...updates } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    if (action === "increment_questions") {
      // Increment question count
      const { data, error } = await supabaseAdmin
        .from("user_subscriptions")
        .select("questions_used")
        .eq("user_id", userId)
        .single()

      if (error) {
        console.error("Error fetching current questions:", error)
        return NextResponse.json({ error: "Failed to fetch current usage" }, { status: 500 })
      }

      const newCount = (data.questions_used || 0) + 1

      const { error: updateError } = await supabaseAdmin
        .from("user_subscriptions")
        .update({ questions_used: newCount })
        .eq("user_id", userId)

      if (updateError) {
        console.error("Error updating question count:", updateError)
        return NextResponse.json({ error: "Failed to update usage" }, { status: 500 })
      }

      return NextResponse.json({ success: true, questions_used: newCount })
    }

    // General update
    const { error } = await supabaseAdmin.from("user_subscriptions").update(updates).eq("user_id", userId)

    if (error) {
      console.error("Error updating subscription:", error)
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in startsmart-session PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
