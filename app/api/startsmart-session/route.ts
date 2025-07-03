import { type NextRequest, NextResponse } from "next/server"
import { createStartSmartSession } from "@/lib/startsmart-integration"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Verify user exists and is authenticated
    const { data: user, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 })
    }

    // Create session for StartSmart app
    const session = await createStartSmartSession(userId)

    if (!session.success) {
      return NextResponse.json({ error: session.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sessionToken: session.sessionToken,
      userData: session.userData,
    })
  } catch (error) {
    console.error("StartSmart session creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
