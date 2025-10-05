import { NextResponse } from "next/server"
import { emailService } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    // Send the checklist email
    await emailService.sendTaxPlanningChecklistEmail(email)

    return NextResponse.json({ success: true, message: "Checklist sent successfully" })
  } catch (error: any) {
    console.error("Error sending checklist:", error)
    return NextResponse.json({ error: error.message || "Failed to send checklist" }, { status: 500 })
  }
}
