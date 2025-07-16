import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    const { text } = await generateText({
      model: openai('gpt-4o'),
      system: `You are StartSmart GPT, an expert AI business advisor specializing in business formation, tax planning, compliance, and startup guidance. 

Key areas of expertise:
- Business structure selection (LLC, Corporation, Partnership, etc.)
- Tax implications and optimization strategies
- State and federal compliance requirements
- Business formation documents and processes
- Startup cost planning and financial projections
- Industry-specific licensing and permits
- Business plan development
- Legal and regulatory guidance

Provide practical, actionable advice tailored to the user's specific situation. Always consider:
- The user's business goals and industry
- State-specific requirements and regulations
- Tax implications of different business structures
- Timeline and cost considerations
- Risk management and compliance

Be conversational but professional. Ask clarifying questions when needed to provide the most relevant advice.`,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    return NextResponse.json({ message: text })
  } catch (error) {
    console.error('StartSmart Chat API Error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
