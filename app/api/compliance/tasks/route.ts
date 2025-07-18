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

    const tasks = await storage.getComplianceTasks(userId, { businessId, status })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching compliance tasks:", error)
    return NextResponse.json({ message: "Failed to fetch compliance tasks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { businessId, taskName, description, category, priority, dueDate, assignedTo, complianceType } =
      await request.json()

    if (!businessId || !taskName || !category) {
      return NextResponse.json(
        {
          message: "Business ID, task name, and category are required",
        },
        { status: 400 },
      )
    }

    const task = await storage.createComplianceTask({
      userId,
      businessId,
      taskName,
      description: description || "",
      category,
      priority: priority || "medium",
      status: "pending",
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || userId,
      complianceType: complianceType || "general",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error creating compliance task:", error)
    return NextResponse.json({ message: "Failed to create compliance task" }, { status: 500 })
  }
}
