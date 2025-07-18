import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const taskId = params.id
    const updates = await request.json()

    const task = await storage.getComplianceTask(taskId)
    if (!task || task.userId !== userId) {
      return NextResponse.json({ message: "Compliance task not found" }, { status: 404 })
    }

    const updatedTask = await storage.updateComplianceTask(taskId, {
      ...updates,
      updatedAt: new Date(),
      completedAt: updates.status === "completed" ? new Date() : task.completedAt,
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Error updating compliance task:", error)
    return NextResponse.json({ message: "Failed to update compliance task" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const taskId = params.id
    const task = await storage.getComplianceTask(taskId)

    if (!task || task.userId !== userId) {
      return NextResponse.json({ message: "Compliance task not found" }, { status: 404 })
    }

    await storage.deleteComplianceTask(taskId)
    return NextResponse.json({ message: "Compliance task deleted successfully" })
  } catch (error) {
    console.error("Error deleting compliance task:", error)
    return NextResponse.json({ message: "Failed to delete compliance task" }, { status: 500 })
  }
}
