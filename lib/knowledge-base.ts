import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Company knowledge base
const knowledgeBase = [
  {
    topic: "pricing",
    content:
      "StartSmart package costs $299 and includes business formation in 48 hours, EIN acquisition, and ongoing AI guidance. Advanced packages include Transfer Pricing GPT at $2,999/month and State Tax Nexus GPT at $799/month.",
  },
  {
    topic: "services",
    content:
      "NexTax.AI provides AI-powered business formation, tax compliance, multi-state nexus management, and custom AI tax solutions. We combine 20+ years of Big 4 tax expertise with cutting-edge AI.",
  },
  {
    topic: "business_formation",
    content:
      "We help form LLCs, S-Corps, and C-Corps in all 50 states. Our AI analyzes your business needs to recommend the optimal entity structure and state of formation.",
  },
  {
    topic: "contact",
    content:
      "Book a consultation through our website, use our live chat, or email us. For complex tax situations, we recommend scheduling a consultation with our expert team.",
  },
]

export async function getRelevantContext(query: string) {
  // Simple keyword matching (you could enhance with embeddings)
  const relevantInfo = knowledgeBase.filter(
    (item) =>
      query.toLowerCase().includes(item.topic) ||
      item.content.toLowerCase().includes(query.toLowerCase().split(" ")[0]),
  )

  return relevantInfo.map((item) => item.content).join("\n\n")
}

export async function generateCustomerServiceResponse(userMessage: string) {
  const context = await getRelevantContext(userMessage)

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: `You are the NexTax.AI customer service assistant. Use this company information to answer questions:

${context}

Guidelines:
- Be helpful and professional
- If you don't know something, say so and offer to connect them with an expert
- Always mention relevant services when appropriate
- For complex tax questions, recommend booking a consultation
- Keep responses concise but informative`,
    prompt: userMessage,
  })

  return text
}
