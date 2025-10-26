import { type NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"
import { getUserProfile, getUserUsageCount, recordUsage } from "@/lib/storage"
import { getUserTier, checkUsageLimit } from "@/lib/ai-usage-config"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { messages, userId, businessProfile } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    // Get user profile and determine tier
    let userTier = "free"
    let currentUsage = 0

    if (userId) {
      try {
        const profile = await getUserProfile(userId)
        userTier = profile?.subscriptionTier || "free"
        currentUsage = await getUserUsageCount(userId, "monthly")
      } catch (error) {
        console.log("User profile not found, using free tier")
      }
    }

    // Check usage limits
    const tierConfig = getUserTier(userTier)
    const usageCheck = checkUsageLimit(currentUsage, tierConfig.limits.chatMessages, "chat messages")

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: "Usage limit exceeded",
          message: usageCheck.message,
          upgradeRequired: true,
        },
        { status: 429 },
      )
    }

    // Select model based on tier
    let model
    switch (userTier) {
      case "premium":
      case "enterprise":
      case "pro":
        model = "gpt-4" // GPT-4 for Pro/Premium
        break
      default:
        model = "gpt-3.5-turbo" // Standard ChatGPT for Free
    }

    // Build sophisticated system prompt
    const systemPrompt = buildStartSmartSystemPrompt(userTier, businessProfile)

    // Build context-aware user message
    const contextualMessages = buildContextualMessages(messages, businessProfile, userTier)

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...contextualMessages,
      ],
      max_tokens: userTier === "free" ? 500 : 1500, // Longer responses for paid tiers
      temperature: 0.7,
    })

    const text = completion.choices[0]?.message?.content || "I'm having trouble responding right now. Please try again."

    // Record usage
    if (userId) {
      try {
        await recordUsage(userId, "chat_message", {
          model,
          tier: userTier,
          tokens_used: text.length,
        })
      } catch (error) {
        console.error("Failed to record usage:", error)
      }
    }

    return NextResponse.json({
      message: text,
      model,
      tier: userTier,
      usage: {
        current: currentUsage + 1,
        limit: tierConfig.limits.chatMessages,
        remaining:
          tierConfig.limits.chatMessages === -1
            ? "unlimited"
            : Math.max(0, tierConfig.limits.chatMessages - currentUsage - 1),
      },
    })
  } catch (error) {
    console.error("StartSmart Chat API Error:", error)
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 })
  }
}

function buildStartSmartSystemPrompt(userTier: string, businessProfile?: any): string {
  const basePrompt = `You are StartSmart AI, an expert business formation and startup advisor created by NexTax.AI.

CORE EXPERTISE AREAS:
• Entity formation (LLC, Corporation, Partnership, Sole Proprietorship)
• Tax setup and optimization strategies
• Legal requirements and compliance (federal, state, local)
• Financial planning and startup cost analysis
• Market research and business validation
• State-specific guidance for all 50 states
• Integration with authoritative resources (IRS, SBA, state portals)

PERSONALITY & APPROACH:
• Professional yet approachable and encouraging
• Provide specific, actionable advice
• Always include relevant next steps
• Reference authoritative sources when appropriate
• Acknowledge when professional consultation is needed

RESPONSE GUIDELINES:
• Be comprehensive but concise
• Use bullet points and clear structure
• Include specific examples when helpful
• Always end with clear next steps or recommendations
• For legal/tax matters, recommend consulting qualified professionals

${
  userTier !== "free"
    ? `
ADVANCED CAPABILITIES (${userTier.toUpperCase()} TIER):
• Provide detailed compliance roadmaps
• Generate comprehensive business plans
• Offer advanced tax optimization strategies
• Create detailed financial projections
• Provide industry-specific insights
• Offer multi-state expansion guidance
`
    : `
FREE TIER LIMITATIONS:
• Focus on essential startup guidance
• Provide basic entity formation advice
• Offer fundamental tax setup information
• Recommend upgrade for advanced features
`
}`

  // Add business context if available
  if (businessProfile) {
    return (
      basePrompt +
      `

BUSINESS CONTEXT:
• Business Name: ${businessProfile.business_name || "Not specified"}
• Entity Type: ${businessProfile.business_type || "Not specified"}
• Industry: ${businessProfile.industry || "Not specified"}
• State: ${businessProfile.state || "Not specified"}
• Formation Stage: ${businessProfile.formation_date ? "Formed" : "Planning"}

Tailor all responses to this specific business context and provide personalized recommendations.`
    )
  }

  return basePrompt
}

function buildContextualMessages(messages: any[], businessProfile?: any, userTier?: string) {
  return messages.map((msg: any) => {
    if (msg.role === "user" && businessProfile) {
      // Enhance user messages with business context
      return {
        role: msg.role,
        content: `Business Context: ${businessProfile.business_name || "My business"} is a ${businessProfile.business_type || "startup"} in ${businessProfile.state || "the US"}, operating in the ${businessProfile.industry || "general"} industry.

User Question: ${msg.content}

Please provide ${userTier === "free" ? "essential" : "comprehensive"} guidance tailored to my specific business situation.`,
      }
    }
    return {
      role: msg.role,
      content: msg.content,
    }
  })
}

