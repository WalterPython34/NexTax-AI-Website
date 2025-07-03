import { type NextRequest, NextResponse } from "next/server"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  console.log("🚀 API Route Called - submit-quiz")

  try {
    // Check environment variables first
    console.log("📋 Environment Variables Check:")
    console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "✅ Present" : "❌ Missing")
    console.log("GOOGLE_PRIVATE_KEY:", process.env.GOOGLE_PRIVATE_KEY ? "✅ Present" : "❌ Missing")
    console.log("GOOGLE_SHEET_ID:", process.env.GOOGLE_SHEET_ID ? "✅ Present" : "❌ Missing")
    console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✅ Present" : "❌ Missing")
    console.log("NOTIFICATION_EMAIL:", process.env.NOTIFICATION_EMAIL ? "✅ Present" : "❌ Missing")

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is missing")
    }
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error("GOOGLE_PRIVATE_KEY is missing")
    }
    if (!process.env.GOOGLE_SHEET_ID) {
      throw new Error("GOOGLE_SHEET_ID is missing")
    }
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing")
    }

    console.log("📨 Parsing request data...")
    const data = await request.json()
    console.log("📊 Received data:", JSON.stringify(data, null, 2))

    const { contactInfo, answers, results, timestamp } = data

    console.log("🔑 Setting up Google Auth...")
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    console.log("📊 Connecting to Google Spreadsheet...")
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth)

    console.log("📋 Loading spreadsheet info...")
    await doc.loadInfo()
    console.log("📄 Spreadsheet title:", doc.title)
    console.log("📊 Number of sheets:", doc.sheetCount)

    let sheet = doc.sheetsByIndex[0]
    if (!sheet) {
      sheet = await doc.addSheet({ title: "Quiz Responses" })
    }

    console.log("📝 Using sheet:", sheet.title)
    console.log("📐 Sheet has", sheet.rowCount, "rows and", sheet.columnCount, "columns")

    // Load the headers to see what columns exist
    await sheet.loadHeaderRow()
    console.log("📋 Sheet headers:", sheet.headerValues)

    // Add headers if this is the first row
    const rows = await sheet.getRows()
    if (rows.length === 0) {
      await sheet.setHeaderRow([
        "Timestamp",
        "Business Type",
        "Business Name",
        "State",
        "Owners",
        "Revenue",
        "Employees",
        "Industry",
        "Goals",
        "Timeline",
        "Email",
        "Phone",
        "Additional Info",
      ])
    }

    const rowData = {
      Timestamp: new Date().toISOString(),
      "Business Type": data.businessType || "",
      "Business Name": data.businessName || "",
      State: data.state || "",
      Owners: data.owners || "",
      Revenue: data.revenue || "",
      Employees: data.employees || "",
      Industry: data.industry || "",
      Goals: data.goals || "",
      Timeline: data.timeline || "",
      Email: data.email || "",
      Phone: data.phone || "",
      "Additional Info": data.additionalInfo || "",
    }

    console.log("📝 Row data to add:", JSON.stringify(rowData, null, 2))

    console.log("➕ Adding row to sheet...")
    const newRow = await sheet.addRow(rowData)
    console.log("✅ Row added successfully! Row number:", newRow.rowNumber)

    // Send email to the user
    console.log("📧 Sending email to user:", data.email)
    try {
      await resend.emails.send({
        from: "NextAx <noreply@nextax.ai>",
        to: [data.email],
        subject: "Thank you for your business assessment",
        html: `
          <h2>Thank you for completing our business assessment!</h2>
          <p>Hi ${data.businessName ? `there` : "there"},</p>
          <p>We've received your business assessment and our team will review your responses to provide personalized recommendations.</p>
          <p>You can expect to hear from us within 24 hours with:</p>
          <ul>
            <li>Recommended business structure</li>
            <li>Tax planning strategies</li>
            <li>Compliance requirements for your state</li>
            <li>Next steps to get started</li>
          </ul>
          <p>If you have any immediate questions, feel free to reply to this email or call us at (555) 123-4567.</p>
          <p>Best regards,<br>The NextAx Team</p>
        `,
      })
    } catch (emailError) {
      console.error("Email sending failed:", emailError)
      // Don't fail the entire request if email fails
    }

    // Send notification to admin
    if (process.env.NOTIFICATION_EMAIL && data.email) {
      console.log("📧 Sending notification to admin:", process.env.NOTIFICATION_EMAIL)
      try {
        await resend.emails.send({
          from: "NextAx <noreply@nextax.ai>",
          to: [process.env.NOTIFICATION_EMAIL],
          subject: "New Business Assessment Submission",
          html: `
            <h2>New Business Assessment Submission</h2>
            <p><strong>Business Name:</strong> ${data.businessName}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Business Type:</strong> ${data.businessType}</p>
            <p><strong>State:</strong> ${data.state}</p>
            <p><strong>Expected Revenue:</strong> ${data.revenue}</p>
            <p><strong>Timeline:</strong> ${data.timeline}</p>
            <hr>
            <p><strong>Goals:</strong></p>
            <p>${data.goals}</p>
            ${
              data.additionalInfo
                ? `
              <p><strong>Additional Information:</strong></p>
              <p>${data.additionalInfo}</p>
            `
                : ""
            }
          `,
        })
      } catch (emailError) {
        console.error("Admin email sending failed:", emailError)
        // Don't fail the entire request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Quiz data submitted successfully",
      rowNumber: newRow.rowNumber,
    })
  } catch (error: any) {
    console.error("❌ ERROR in submit-quiz:", error)
    console.error("❌ Error stack:", error.stack)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stack,
      },
      { status: 500 },
    )
  }
}
