import { NextResponse } from "next/server"
import { emailService } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { email, totalCost, businessType } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Send notification email to admin
    await emailService.sendNotificationEmail(
      email,
      `New Calculator Lead: ${businessType}`,
      `
        <h2>New Startup Cost Calculator Lead</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Business Type:</strong> ${businessType}</p>
        <p><strong>Total Estimated Cost:</strong> $${totalCost.toLocaleString()}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      `,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error capturing calculator lead:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
