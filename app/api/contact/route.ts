import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  console.log("📨 Contact form submission received")

  try {
    const data = await request.json()
    const { name, email, company, subject, message, inquiryType, website, formLoadTime } = data

    console.log("📋 Contact form data:", data)

    // Honeypot check - if "website" field is filled, it's a bot
    if (website) {
      console.log("🤖 Bot detected via honeypot field")
      // Return success to fool the bot, but don't actually process
      return NextResponse.json({
        success: true,
        message: "Contact form submitted successfully",
      })
    }

    // Timing check - if form submitted in less than 3 seconds, likely a bot
    if (formLoadTime) {
      const submissionTime = Date.now()
      const timeDiff = submissionTime - parseInt(formLoadTime)
      if (timeDiff < 3000) {
        console.log("🤖 Bot detected via timing check (too fast)")
        return NextResponse.json({
          success: true,
          message: "Contact form submitted successfully",
        })
      }
    }

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Basic spam content detection
    const spamPatterns = [
      /^[a-zA-Z]{6,10}$/,  // Random letter strings like "bkbKkMjh"
      /^[A-Z][a-z]+[A-Z][a-z]+$/,  // CamelCase gibberish
    ]
    
    if (spamPatterns.some(pattern => pattern.test(subject)) || 
        spamPatterns.some(pattern => pattern.test(message))) {
      console.log("🤖 Bot detected via spam pattern")
      return NextResponse.json({
        success: true,
        message: "Contact form submitted successfully",
      })
    }

    // Send email notification
    const emailResult = await sendEmail({
      to: process.env.NOTIFICATION_EMAIL || "steven.morello@nextax.ai",
      subject: `Contact Form: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #64748b; }
            .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>New Contact Form Submission</h1>
          </div>
          <div class="content">
            <div class="field">
              <p class="label">Name:</p>
              <p>${name}</p>
            </div>
            <div class="field">
              <p class="label">Email:</p>
              <p>${email}</p>
            </div>
            <div class="field">
              <p class="label">Company:</p>
              <p>${company || "Not provided"}</p>
            </div>
            <div class="field">
              <p class="label">Inquiry Type:</p>
              <p>${inquiryType || "Not specified"}</p>
            </div>
            <div class="field">
              <p class="label">Subject:</p>
              <p>${subject}</p>
            </div>
            <div class="field">
              <p class="label">Message:</p>
              <p>${message}</p>
            </div>
          </div>
          <div class="footer">
            <p>This message was sent from the NexTax.AI contact form.</p>
          </div>
        </body>
        </html>
      `,
    })

    console.log("📧 Email result:", emailResult)

    if (!emailResult.success) {
      throw new Error(`Failed to send email: ${emailResult.error}`)
    }

    return NextResponse.json({
      success: true,
      message: "Contact form submitted successfully",
    })
  } catch (error: any) {
    console.error("❌ Contact form error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
