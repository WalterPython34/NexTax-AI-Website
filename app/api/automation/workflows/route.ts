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
    const status = searchParams.get("status")

    const workflows = await storage.getUserWorkflows(userId, { businessId, status })
    return NextResponse.json(workflows)
  } catch (error) {
    console.error("Error fetching workflows:", error)
    return NextResponse.json({ message: "Failed to fetch workflows" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { businessId, name, description, templateId, customizations, schedule } = await request.json()

    if (!businessId || !name) {
      return NextResponse.json(
        {
          message: "Business ID and name are required",
        },
        { status: 400 },
      )
    }

    const workflow = await storage.createWorkflow({
      userId,
      businessId,
      name,
      description: description || "",
      templateId,
      customizations: customizations || {},
      schedule: schedule || null,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json(workflow)
  } catch (error) {
    console.error("Error creating workflow:", error)
    return NextResponse.json({ message: "Failed to create workflow" }, { status: 500 })
  }
}
