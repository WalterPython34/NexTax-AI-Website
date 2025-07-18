import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import { openaiService } from "@/lib/openai"
import { checkUsageLimit, getModelForTier, type SubscriptionTier } from "@/lib/ai-usage-config"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Verify conversation ownership
    const conversation = await storage.getConversation(conversationId)
    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 })
    }

    const messages = await storage.getConversationMessages(conversationId)
    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ message: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Verify conversation ownership
    const conversation = await storage.getConversation(conversationId)
    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 })
    }

    const { content } = await request.json()
    if (!content) {
      return NextResponse.json({ message: "Message content is required" }, { status: 400 })
    }

    // Get user and check subscription tier
    const user = await storage.getUser(userId)
    const subscriptionTier = (user?.subscriptionTier || "free") as SubscriptionTier

    // Check current usage for this month
    const currentUsage = await storage.getUserCurrentUsage(userId)
    const usageCheck = checkUsageLimit(subscriptionTier, currentUsage.messageCount)

    if (!usageCheck.canSend) {
      return NextResponse.json(
        {
          message: usageCheck.upgradeMessage,
          usage: currentUsage,
          tier: subscriptionTier,
          canUpgrade: true,
        },
        { status: 429 },
      )
    }

    // Save user message
    const userMessage = await storage.createMessage({
      conversationId,
      role: "user",
      content,
    })

    // Track usage for this message
    const currentMonth = new Date().toISOString().slice(0, 7)
    await storage.createOrUpdateUsage(userId, currentMonth, 1, 0)

    // Get business context if available
    let businessContext
    if (conversation.businessId) {
      businessContext = await storage.getBusinessProfile(conversation.businessId)
    }

    // Get conversation history for context
    const messages = await storage.getConversationMessages(conversationId)
    const chatHistory = messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }))

    // Use tier-appropriate model for AI response
    const model = getModelForTier(subscriptionTier)
    const aiResponse = await openaiService.generateChatResponse(chatHistory, businessContext, model)

    // Save AI message
    const aiMessage = await storage.createMessage({
      conversationId,
      role: "assistant",
      content: aiResponse.content,
      metadata: aiResponse.metadata,
    })

    // Update conversation title if this is the first exchange
    if (messages.length <= 1) {
      const title = await openaiService.generateConversationTitle(content)
      await storage.updateConversationTitle(conversationId, title)
    }

    return NextResponse.json({ userMessage, aiMessage })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ message: "Failed to send message" }, { status: 500 })
  }
}
