import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const complianceId = params.id
    const compliance = await storage.getComplianceItem(complianceId)

    if (!compliance || compliance.userId !== userId) {
      return NextResponse.json({ message: "Compliance item not found" }, { status: 404 })
    }

    return NextResponse.json(compliance)
  } catch (error) {
    console.error("Error fetching compliance item:", error)
    return NextResponse.json({ message: "Failed to fetch compliance item" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const complianceId = params.id
    const updates = await request.json()

    const compliance = await storage.getComplianceItem(complianceId)
    if (!compliance || compliance.userId !== userId) {
      return NextResponse.json({ message: "Compliance item not found" }, { status: 404 })
    }

    const updatedCompliance = await storage.updateComplianceItem(complianceId, {
      ...updates,
      updatedAt: new Date(),
    })

    return NextResponse.json(updatedCompliance)
  } catch (error) {
    console.error("Error updating compliance item:", error)
    return NextResponse.json({ message: "Failed to update compliance item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const complianceId = params.id
    const compliance = await storage.getComplianceItem(complianceId)

    if (!compliance || compliance.userId !== userId) {
      return NextResponse.json({ message: "Compliance item not found" }, { status: 404 })
    }

    await storage.deleteComplianceItem(complianceId)
    return NextResponse.json({ message: "Compliance item deleted successfully" })
  } catch (error) {
    console.error("Error deleting compliance item:", error)
    return NextResponse.json({ message: "Failed to delete compliance item" }, { status: 500 })
  }
}
