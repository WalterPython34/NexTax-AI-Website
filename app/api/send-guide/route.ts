import { type NextRequest, NextResponse } from "next/server"
import { emailService } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    console.log("[v0] Sending Tax-First Launch Guide to:", email)

    const result = await emailService.sendTaxFirstGuideEmail(email)

    if (!result.success) {
      console.error("[v0] Failed to send guide:", result.error)
      return NextResponse.json({ error: result.error || "Failed to send guide" }, { status: 500 })
    }

    console.log("[v0] Guide sent successfully to:", email)

    return NextResponse.json({ success: true, message: "Guide sent successfully" })
  } catch (error: any) {
    console.error("[v0] Error in send-guide API:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
