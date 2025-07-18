import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notificationId } = await params
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const notification = await storage.getNotification(notificationId)
    if (!notification || notification.userId !== userId) {
      return NextResponse.json({ message: "Notification not found" }, { status: 404 })
    }

    const updatedNotification = await storage.updateNotification(notificationId, {
      isRead: true,
      readAt: new Date(),
    })

    return NextResponse.json(updatedNotification)
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ message: "Failed to mark notification as read" }, { status: 500 })
  }
}
