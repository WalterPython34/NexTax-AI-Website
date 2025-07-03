import { type NextRequest, NextResponse } from "next/server"
import { createStartSmartSession } from "@/lib/startsmart-integration"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Verify user exists in Supabase
    const { data: user, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 })
    }

    // Create session for StartSmart app
    const sessionToken = await createStartSmartSession(userId)

    if (!sessionToken) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
    }

    return NextResponse.json({
      sessionToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    })
  } catch (error) {
    console.error("StartSmart session creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

