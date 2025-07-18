import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { email, firstName, lastName } = await request.json()

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    // Import leadTracking dynamically to avoid circular dependencies
    const { leadTracking } = await import("@/lib/leadTracking")
    await leadTracking.addManualLead(email, firstName, lastName)

    return NextResponse.json({ message: "Lead added successfully" })
  } catch (error) {
    console.error("Manual lead creation failed:", error)
    return NextResponse.json({ message: "Failed to add lead" }, { status: 500 })
  }
}
