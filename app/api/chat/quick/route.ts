import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import { openaiService } from "@/lib/openai"

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { message, businessContext } = await request.json()

    if (!message) {
      return NextResponse.json({ message: "Message is required" }, { status: 400 })
    }

    // Get user's business profile for context
    let businessProfile = null
    if (!businessContext) {
      businessProfile = await storage.getUserBusinessProfile(userId)
    }

    const response = await openaiService.getQuickHelp(message, businessContext || businessProfile)

    return NextResponse.json({ response })
  } catch (error) {
    console.error("Error in quick chat:", error)
    return NextResponse.json({ message: "Failed to generate response" }, { status: 500 })
  }
}
