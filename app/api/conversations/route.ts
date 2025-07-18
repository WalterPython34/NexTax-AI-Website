import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const conversations = await storage.getUserConversations(userId)
    return NextResponse.json(conversations)
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json({ message: "Failed to fetch conversations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const conversationData = { ...body, userId }
    const conversation = await storage.createConversation(conversationData)

    return NextResponse.json(conversation)
  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json({ message: "Failed to create conversation" }, { status: 500 })
  }
}
