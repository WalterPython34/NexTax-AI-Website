import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import { emailService } from "@/lib/email"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const notifications = await storage.getUserNotifications(userId, { unreadOnly, limit })
    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ message: "Failed to fetch notifications" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { type, title, message, priority, sendEmail, businessId } = await request.json()

    if (!type || !title || !message) {
      return NextResponse.json(
        {
          message: "Type, title, and message are required",
        },
        { status: 400 },
      )
    }

    const notification = await storage.createNotification({
      userId,
      businessId,
      type,
      title,
      message,
      priority: priority || "normal",
      isRead: false,
      createdAt: new Date(),
    })

    // Send email if requested
    if (sendEmail) {
      const user = await storage.getUser(userId)
      if (user?.email) {
        await emailService.sendNotificationEmail(user.email, {
          title,
          message,
          type,
          priority,
        })
      }
    }

    return NextResponse.json(notification)
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ message: "Failed to create notification" }, { status: 500 })
  }
}
