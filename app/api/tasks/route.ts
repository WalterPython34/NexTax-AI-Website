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
    const category = searchParams.get("category")
    const priority = searchParams.get("priority")

    const tasks = await storage.getUserTasks(userId, {
      businessId,
      status,
      category,
      priority,
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ message: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { businessId, title, description, category, priority, dueDate, assignedTo, tags } = await request.json()

    if (!title || !category) {
      return NextResponse.json(
        {
          message: "Title and category are required",
        },
        { status: 400 },
      )
    }

    const task = await storage.createTask({
      userId,
      businessId,
      title,
      description: description || "",
      category,
      priority: priority || "medium",
      status: "pending",
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || userId,
      tags: tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json({ message: "Failed to create task" }, { status: 500 })
  }
}
