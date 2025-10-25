import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { question, conversationHistory } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    // Use GPT-4o (latest model - note: GPT-5 is not yet released)
    const model = openai("gpt-4o")

    // Build system prompt for new entrepreneurs
    const systemPrompt = `You are StartSmartGPT, an expert business advisor created by NexTax.AI with 20+ years of Big 4 tax and business formation expertise.

CORE EXPERTISE:
• Business formation and entity selection (LLC, Corporation, Partnership, Sole Proprietorship)
• Tax strategy and optimization for new businesses
• State-specific compliance requirements across all 50 states
• Startup financial planning and cost analysis
• Legal requirements and regulatory compliance
• Business structure optimization for growth

YOUR ROLE:
You're helping NEW ENTREPRENEURS who are just starting their business journey. They need:
• Clear, actionable guidance without overwhelming jargon
• Specific recommendations tailored to their situation
• Step-by-step implementation advice
• Awareness of common pitfalls and how to avoid them
• Encouragement and confidence-building

RESPONSE STYLE:
• Professional yet approachable and encouraging
• Use clear structure with headings and bullet points
• Provide specific examples and real-world scenarios
• Always include concrete next steps
• Acknowledge when professional consultation is recommended
• Keep responses comprehensive but digestible (aim for 300-500 words)

IMPORTANT GUIDELINES:
• Focus on practical, implementable advice
• Explain WHY behind recommendations, not just WHAT
• Consider tax implications in all business decisions
• Highlight state-specific considerations when relevant
• Balance thoroughness with clarity
• End with clear action items

Remember: This is a DEMO experience. Provide valuable general guidance while noting that personalized advice requires understanding their specific business details, state, industry, and financial situation.`

    // Build conversation context
    const messages = conversationHistory || []
    const fullPrompt = `${messages.length > 0 ? `Previous conversation context:\n${messages.map((m: any) => `${m.role}: ${m.content}`).join("\n\n")}\n\n` : ""}New question from entrepreneur: ${question}`

    // Generate response using AI SDK
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: fullPrompt,
      maxTokens: 800,
      temperature: 0.7,
    })

    return NextResponse.json({
      response: text,
      model: "gpt-4o",
      success: true,
    })
  } catch (error: any) {
    console.error("StartSmart Demo API Error:", error)

    // Handle specific OpenAI errors
    if (error?.message?.includes("API key")) {
      return NextResponse.json({ error: "OpenAI API key is invalid or not configured properly." }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to generate response. Please try again." }, { status: 500 })
  }
}
