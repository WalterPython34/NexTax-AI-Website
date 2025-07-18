import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { businessId } = await request.json()
    await storage.createDefaultProgressTasks(userId, businessId)

    return NextResponse.json({ message: "Progress tasks initialized successfully" })
  } catch (error) {
    console.error("Error initializing progress tasks:", error)
    return NextResponse.json({ message: "Failed to initialize progress tasks" }, { status: 500 })
  }
}
