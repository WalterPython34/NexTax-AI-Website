import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, getUserSubscription } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { userId, question } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get user subscription
    const subscription = await getUserSubscription(userId)

    if (!subscription) {
      // Create free tier subscription for new users
      const { data: newSub, error } = await supabaseAdmin
        .from("user_subscriptions")
        .insert({
          user_id: userId,
          tier: "free",
          questions_limit: 10,
          questions_used: 0,
          status: "active",
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating subscription:", error)
        return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
      }

      return NextResponse.json({
        canAsk: true,
        questionsUsed: 0,
        questionsLimit: 10,
        tier: "free",
      })
    }

    // Check if user can ask questions
    const canAsk = subscription.tier === "premium" || subscription.questions_used < subscription.questions_limit

    return NextResponse.json({
      canAsk,
      questionsUsed: subscription.questions_used,
      questionsLimit: subscription.questions_limit,
      tier: subscription.tier,
    })
  } catch (error) {
    console.error("Session check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Increment question count
    const { data, error } = await supabaseAdmin
      .from("user_subscriptions")
      .update({
        questions_used: supabaseAdmin.raw("questions_used + 1"),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating question count:", error)
      return NextResponse.json({ error: "Failed to update count" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Question count update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
