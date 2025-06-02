import { type NextRequest, NextResponse } from "next/server"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { JWT } from "google-auth-library"
import { sendEmail, generateUserEmailHtml, generateAdminNotificationHtml } from "@/lib/email"

export async function POST(request: NextRequest) {
  console.log("🚀 API Route Called - submit-quiz")

  try {
    // Check environment variables first
    console.log("📋 Environment Variables Check:")
    console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "✅ Present" : "❌ Missing")
    console.log("GOOGLE_PRIVATE_KEY:", process.env.GOOGLE_PRIVATE_KEY ? "✅ Present" : "❌ Missing")
    console.log("GOOGLE_SHEET_ID:", process.env.GOOGLE_SHEET_ID ? "✅ Present" : "❌ Missing")

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is missing")
    }
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error("GOOGLE_PRIVATE_KEY is missing")
    }
    if (!process.env.GOOGLE_SHEET_ID) {
      throw new Error("GOOGLE_SHEET_ID is missing")
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

    const sheet = doc.sheetsByIndex[0]
    console.log("📝 Using sheet:", sheet.title)
    console.log("📏 Sheet has", sheet.rowCount, "rows and", sheet.columnCount, "columns")

    // Load the headers to see what columns exist
    await sheet.loadHeaderRow()
    console.log("📋 Sheet headers:", sheet.headerValues)

    const rowData = {
      Name: contactInfo.name,
      Email: contactInfo.email,
      "Phone Number": contactInfo.phone || "",
      Complexity: answers.complexity === "llc" ? "Prefer minimal paperwork" : "Comfortable with formalities",
      Ownership: answers.ownership === "llc" ? "Want flexibility" : "Plan to issue stock",
      Profit: answers.profit === "llc" ? "Under $60,000" : "Over $60,000",
      Taxes: answers.taxes === "llc" ? "Simple tax filing" : "Willing to run payroll",
      Growth: answers.growth === "llc" ? "Keep it simple" : "Build formal structure",
      Recommendation: results.recommendation,
      Confidence: `${results.confidence}%`,
      Summary: results.summary,
      "Time Stamp": new Date().toLocaleString(),
    }

    console.log("📝 Row data to add:", JSON.stringify(rowData, null, 2))

    console.log("➕ Adding row to sheet...")
    const newRow = await sheet.addRow(rowData)
    console.log("✅ Row added successfully! Row number:", newRow.rowNumber)

    // Send email to the user
    console.log("📧 Sending email to user:", contactInfo.email)
    const userEmailHtml = generateUserEmailHtml(contactInfo, results)
    const userEmailResult = await sendEmail({
      to: contactInfo.email,
      subject: `Your ${results.recommendation} Recommendation from NexTax.AI`,
      html: userEmailHtml,
    })
    console.log("📧 User email result:", userEmailResult)

    // Send notification to admin
    if (process.env.NOTIFICATION_EMAIL) {
      console.log("📧 Sending notification to admin:", process.env.NOTIFICATION_EMAIL)
      const adminEmailHtml = generateAdminNotificationHtml(contactInfo, results)
      const adminEmailResult = await sendEmail({
        to: process.env.NOTIFICATION_EMAIL,
        subject: `New Quiz Submission: ${contactInfo.name} - ${results.recommendation}`,
        html: adminEmailHtml,
      })
      console.log("📧 Admin notification result:", adminEmailResult)
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
