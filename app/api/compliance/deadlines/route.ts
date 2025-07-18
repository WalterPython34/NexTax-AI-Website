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
    const days = Number.parseInt(searchParams.get("days") || "30")

    const deadlines = await storage.getUpcomingComplianceDeadlines(userId, {
      businessId,
      daysAhead: days,
    })

    return NextResponse.json(deadlines)
  } catch (error) {
    console.error("Error fetching compliance deadlines:", error)
    return NextResponse.json({ message: "Failed to fetch compliance deadlines" }, { status: 500 })
  }
}
