import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const compliance = await storage.getUserCompliance(userId)
    return NextResponse.json(compliance)
  } catch (error) {
    console.error("Error fetching compliance:", error)
    return NextResponse.json({ message: "Failed to fetch compliance data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { businessId, complianceType, status, dueDate, notes } = await request.json()

    if (!businessId || !complianceType) {
      return NextResponse.json({ message: "Business ID and compliance type are required" }, { status: 400 })
    }

    const compliance = await storage.createComplianceItem({
      userId,
      businessId,
      complianceType,
      status: status || "pending",
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json(compliance)
  } catch (error) {
    console.error("Error creating compliance item:", error)
    return NextResponse.json({ message: "Failed to create compliance item" }, { status: 500 })
  }
}
