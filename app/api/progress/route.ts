import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const tasks = await storage.getUserProgressTasks(userId)
    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json({ message: "Failed to fetch progress" }, { status: 500 })
  }
}
