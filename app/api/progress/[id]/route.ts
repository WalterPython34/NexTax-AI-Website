import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const taskId = params.id
    const { status } = await request.json()

    const task = await storage.getProgressTask(taskId)
    if (!task || task.userId !== userId) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 })
    }

    const updatedTask = await storage.updateProgressTask(taskId, {
      status,
      completedAt: status === "completed" ? new Date() : null,
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Error updating progress:", error)
    return NextResponse.json({ message: "Failed to update progress" }, { status: 500 })
  }
}
