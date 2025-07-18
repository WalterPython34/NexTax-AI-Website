import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get("businessId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const reportType = searchParams.get("type") || "summary"

    const reportData = await storage.generateComplianceReport(userId, {
      businessId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      reportType,
    })

    return NextResponse.json(reportData)
  } catch (error) {
    console.error("Error generating compliance report:", error)
    return NextResponse.json({ message: "Failed to generate compliance report" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { businessId, reportType, filters, format } = await request.json()

    if (!businessId || !reportType) {
      return NextResponse.json(
        {
          message: "Business ID and report type are required",
        },
        { status: 400 },
      )
    }

    const report = await storage.createComplianceReport({
      userId,
      businessId,
      reportType,
      filters: filters || {},
      format: format || "json",
      status: "generating",
      createdAt: new Date(),
    })

    // In a real implementation, you might queue this for background processing
    const reportData = await storage.generateComplianceReport(userId, {
      businessId,
      reportType,
      filters,
    })

    const updatedReport = await storage.updateComplianceReport(report.id, {
      status: "completed",
      data: reportData,
      completedAt: new Date(),
    })

    return NextResponse.json(updatedReport)
  } catch (error) {
    console.error("Error creating compliance report:", error)
    return NextResponse.json({ message: "Failed to create compliance report" }, { status: 500 })
  }
}
