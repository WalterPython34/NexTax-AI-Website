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

    const templates = await storage.getAutomationTemplates({
      category,
      businessType,
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching automation templates:", error)
    return NextResponse.json({ message: "Failed to fetch automation templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { name, description, category, businessType, triggers, actions, conditions } = await request.json()

    if (!name || !category || !triggers || !actions) {
      return NextResponse.json(
        {
          message: "Name, category, triggers, and actions are required",
        },
        { status: 400 },
      )
    }

    const template = await storage.createAutomationTemplate({
      userId,
      name,
      description: description || "",
      category,
      businessType: businessType || "general",
      triggers,
      actions,
      conditions: conditions || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error creating automation template:", error)
    return NextResponse.json({ message: "Failed to create automation template" }, { status: 500 })
  }
}
