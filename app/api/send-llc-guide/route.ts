import { type NextRequest, NextResponse } from "next/server"
import { sendLLCGuideEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("📧 Sending LLC guide to:", email, "Name:", name)

    // Send the email with the LLC vs S-Corp guide
    const result = await sendLLCGuideEmail(email, name || "there")

    if (!result.success) {
      throw new Error(result.error)
    }

    console.log("✅ LLC guide email sent successfully")

    return NextResponse.json({
      success: true,
      messageId: result.data?.id,
    })
  } catch (error: any) {
    console.error("❌ Error sending LLC guide email:", error)
    return NextResponse.json(
      {
        error: error.message || "An error occurred while sending the guide",
        success: false,
      },
      { status: 500 },
    )
  }
}
