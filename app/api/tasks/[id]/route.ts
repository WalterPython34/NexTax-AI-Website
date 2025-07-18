import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const taskId = params.id
    const task = await storage.getTask(taskId)

    if (!task || task.userId !== userId) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json({ message: "Failed to fetch task" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const taskId = params.id
    const updates = await request.json()

    const task = await storage.getTask(taskId)
    if (!task || task.userId !== userId) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 })
    }

    const updatedTask = await storage.updateTask(taskId, {
      ...updates,
      updatedAt: new Date(),
      completedAt: updates.status === "completed" ? new Date() : task.completedAt,
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ message: "Failed to update task" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const taskId = params.id
    const task = await storage.getTask(taskId)

    if (!task || task.userId !== userId) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 })
    }

    await storage.deleteTask(taskId)
    return NextResponse.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ message: "Failed to delete task" }, { status: 500 })
  }
}
