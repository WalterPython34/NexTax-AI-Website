import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const count = await storage.markAllNotificationsRead(userId)

    return NextResponse.json({
      message: "All notifications marked as read",
      count,
    })
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json({ message: "Failed to mark all notifications as read" }, { status: 500 })
  }
}
