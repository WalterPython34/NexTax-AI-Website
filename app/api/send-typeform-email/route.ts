import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email, name, sessionId } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("📧 Sending typeform email to:", email, "Name:", name)

    // Send the immediate email with questionnaire link AND LLC guide
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .urgent { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .step { background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
          .button { background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 5px; }
          .button-secondary { background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 Let's Get Your Business Started!</h1>
        </div>
        <div class="content">
          <p>Hello ${name || "there"},</p>
          
          <p>Thank you for choosing StartSmart! Your payment has been processed and we're ready to get your business legally formed and operating within 48 hours.</p>
          
          <div class="urgent">
            <h3>⚠️ IMPORTANT: Complete These 2 Steps Now</h3>
            <p><strong>Time is critical!</strong> To ensure we can deliver your business formation within 48 hours, please complete both steps below immediately:</p>
          </div>
          
          <div class="step">
            <h3>📋 Step 1: Download Your Structure Guide (2 minutes)</h3>
            <p>Before filling out the questionnaire, download our comprehensive LLC vs S-Corporation guide to ensure you're choosing the optimal structure for your business.</p>
            <p><strong>Why this matters:</strong> Once you complete the questionnaire, we'll prepare your SS-4 form for your chosen structure. This guide helps you make the right choice the first time.</p>
            <p style="text-align: center;">
              <a href="https://nextax.ai/resources/llc-vs-scorp-guide.pdf" class="button-secondary">📄 Download Structure Guide</a>
            </p>
          </div>
          
          <div class="step">
            <h3>📝 Step 2: Complete Your Business Questionnaire (3-5 minutes)</h3>
            <p>After reviewing the guide above, complete our detailed questionnaire so we can prepare your business formation documents.</p>
            <p><strong>What happens next:</strong> You'll receive your completed SS-4 form within 2-3 minutes of submission!</p>
            <p style="text-align: center;">
              <a href="https://form.typeform.com/to/hybbpz1Z" class="button">📝 Complete Questionnaire Now</a>
            </p>
          </div>
          
          <div class="urgent">
            <h3>⏰ Timeline Reminder:</h3>
            <ul>
              <li><strong>Now:</strong> Download guide & complete questionnaire</li>
              <li><strong>Within 3 minutes:</strong> Receive your SS-4 form to sign</li>
              <li><strong>Within 24 hours:</strong> Business formation begins</li>
              <li><strong>Within 48 hours:</strong> Business ready to operate!</li>
            </ul>
          </div>
          
          <p>Questions? Reply to this email or schedule a call with our team:</p>
          <p style="text-align: center;">
            <a href="https://calendly.com/steven-morello-nextax" class="button">📅 Schedule a Call</a>
          </p>
          
          <p>We're excited to help you launch your business!</p>
          
          <p>Best regards,<br>The StartSmart Team</p>
        </div>
        <div class="footer">
          <p>© 2024 NexTax.AI. All rights reserved.</p>
          <p>121 W Main St, Brighton MI 48116 | support@nextax.ai</p>
        </div>
      </body>
      </html>
    `

    // Send the combined email
    const result = await sendEmail({
      to: email,
      subject: "🚀 URGENT: Complete These 2 Steps to Start Your Business (48-Hour Formation)",
      html,
      attachments: [
        {
          filename: "LLC-vs-SCorp-Guide.pdf",
          path: `${process.env.NEXT_PUBLIC_SITE_URL || "https://nextax.ai"}/resources/llc-vs-scorp-guide.pdf`,
        },
      ],
    })

    if (!result.success) {
      throw new Error(result.error)
    }

    console.log("✅ Typeform email with LLC guide sent successfully")

    return NextResponse.json({
      success: true,
      messageId: result.data?.id,
    })
  } catch (error: any) {
    console.error("❌ Error sending typeform email:", error)
    return NextResponse.json(
      {
        error: error.message || "An error occurred while sending the email",
        success: false,
      },
      { status: 500 },
    )
  }
}
