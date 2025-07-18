import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const businessType = searchParams.get("businessType")

    const templates = await storage.getComplianceTemplates({
      category,
      businessType,
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching compliance templates:", error)
    return NextResponse.json({ message: "Failed to fetch compliance templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { businessId, templateId, customizations } = await request.json()

    if (!businessId || !templateId) {
      return NextResponse.json(
        {
          message: "Business ID and template ID are required",
        },
        { status: 400 },
      )
    }

    const complianceItems = await storage.applyComplianceTemplate(userId, {
      businessId,
      templateId,
      customizations: customizations || {},
    })

    return NextResponse.json({
      message: "Compliance template applied successfully",
      items: complianceItems,
    })
  } catch (error) {
    console.error("Error applying compliance template:", error)
    return NextResponse.json({ message: "Failed to apply compliance template" }, { status: 500 })
  }
}
