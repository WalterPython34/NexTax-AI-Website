import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getUserSubscription } from "@/lib/startsmart-integration"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get user subscription info
    const subscription = await getUserSubscription(userId)

    if (!subscription) {
      // Create default free subscription for new users
      const { error } = await supabase.from("user_subscriptions").insert({
        user_id: userId,
        tier: "free",
        questions_used: 0,
        questions_limit: 10,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error creating user subscription:", error)
        return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
      }

      return NextResponse.json({
        tier: "free",
        questionsUsed: 0,
        questionsLimit: 10,
        features: ["basic_ai_chat", "progress_roadmap", "document_templates"],
      })
    }

    return NextResponse.json(subscription)
  } catch (error) {
    console.error("Error in startsmart-session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const subscription = await getUserSubscription(userId)

    if (!subscription) {
      return NextResponse.json({
        tier: "free",
        questionsUsed: 0,
        questionsLimit: 10,
        features: ["basic_ai_chat", "progress_roadmap", "document_templates"],
      })
    }

    return NextResponse.json(subscription)
  } catch (error) {
    console.error("Error in startsmart-session GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
