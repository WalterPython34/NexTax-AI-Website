import { Resend } from "resend"

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY)

type SendEmailOptions = {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  // Now we can use your verified nextax.ai domain!
  const defaultFrom = process.env.NOTIFICATION_EMAIL || "hello@nextax.ai"

  try {
    const { data, error } = await resend.emails.send({
      from: from || `NexTax.AI <${defaultFrom}>`,
      to,
      subject,
      html,
    })

    if (error) {
      console.error("❌ Email sending failed:", error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log("✅ Email sent successfully:", data)
    return { success: true, data }
  } catch (error: any) {
    console.error("❌ Email sending error:", error)
    return { success: false, error: error.message }
  }
}

export function generateUserEmailHtml(contactInfo: any, results: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .recommendation { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
        .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
        .button { background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Your Business Structure Recommendation</h1>
      </div>
      <div class="content">
        <p>Hello ${contactInfo.name},</p>
        <p>Thank you for completing our Business Structure Quiz. Based on your responses, we've prepared a personalized recommendation for your business.</p>
        
        <div class="recommendation">
          <h2>Recommendation: ${results.recommendation}</h2>
          <p><strong>Confidence:</strong> ${results.confidence}%</p>
          <p>${results.summary}</p>
        </div>
        
        <h3>What This Means For You</h3>
        <p>Based on your answers about business complexity, ownership structure, expected profits, tax preferences, and growth plans, ${
          results.recommendation === "LLC"
            ? "an LLC structure offers you the flexibility and simplicity that aligns with your business goals."
            : "an S-Corporation structure provides the formal structure and potential tax benefits that align with your business goals."
        }</p>
        
        <h3>Next Steps</h3>
        <p>Ready to form your business? Our StartSmart service can have your ${results.recommendation} set up and ready to operate in just 48 hours.</p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://nextax.ai/pricing" class="button">Launch Your Business Now</a>
        </p>
        
        <p>If you have any questions about your recommendation or need personalized advice, feel free to reply to this email or schedule a consultation with one of our business formation experts.</p>
        
        <p>Best regards,<br>The NexTax.AI Team</p>
      </div>
      <div class="footer">
        <p>© 2024 NexTax.AI. All rights reserved.</p>
        <p>123 Market Street, Suite 500, San Francisco, CA 94105</p>
      </div>
    </body>
    </html>
  `
}

export function generateAdminNotificationHtml(contactInfo: any, results: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #0f172a; color: white; padding: 15px; text-align: center; }
        .content { padding: 20px; }
        .section { margin-bottom: 20px; }
        .label { font-weight: bold; color: #64748b; }
        .data-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .data-table th { background-color: #f1f5f9; text-align: left; padding: 8px; }
        .data-table td { border-bottom: 1px solid #e2e8f0; padding: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>New Business Structure Quiz Submission</h2>
      </div>
      <div class="content">
        <div class="section">
          <p class="label">Contact Information:</p>
          <table class="data-table">
            <tr>
              <th>Name</th>
              <td>${contactInfo.name}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>${contactInfo.email}</td>
            </tr>
            <tr>
              <th>Phone</th>
              <td>${contactInfo.phone || "Not provided"}</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <p class="label">Quiz Results:</p>
          <table class="data-table">
            <tr>
              <th>Recommendation</th>
              <td>${results.recommendation}</td>
            </tr>
            <tr>
              <th>Confidence</th>
              <td>${results.confidence}%</td>
            </tr>
            <tr>
              <th>Summary</th>
              <td>${results.summary}</td>
            </tr>
          </table>
        </div>
        
        <p>This lead has been added to the Google Sheet and should be followed up with within 24 hours.</p>
      </div>
    </body>
    </html>
  `
}
