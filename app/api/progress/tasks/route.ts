import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, category, dueDate, source } = body

    if (!title || !category) {
      return NextResponse.json({ message: "Title and category are required" }, { status: 400 })
    }

    const task = await storage.createProgressTask({
      userId,
      taskName: title,
      description: description || "",
      category: category.toLowerCase(),
      status: "pending",
      dueDate: dueDate ? new Date(dueDate) : null,
      orderIndex: 0,
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error creating progress task:", error)
    return NextResponse.json({ message: "Failed to create progress task" }, { status: 500 })
  }
}
