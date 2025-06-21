// Updated knowledge base with better error handling
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

const knowledgeBase = [
  {
    keywords: ["pricing", "cost", "price", "how much"],
    response:
      "Our StartSmart package costs $299 and includes business formation in 48 hours, EIN acquisition, and ongoing AI guidance. We also offer advanced packages like Transfer Pricing GPT ($2,999/month) and State Tax Nexus GPT ($799/month).",
  },
  {
    keywords: ["services", "what do you do", "help", "nextax"],
    response:
      "NexTax.AI provides AI-powered business formation, tax compliance, and multi-state nexus management. We combine 20+ years of Big 4 tax expertise with cutting-edge AI to help businesses launch and scale efficiently.",
  },
  {
    keywords: ["business formation", "llc", "corporation", "entity"],
    response:
      "We help form LLCs, S-Corps, and C-Corps in all 50 states. Our AI analyzes your business needs to recommend the optimal entity structure and state of formation. Everything is completed in 48 hours.",
  },
  {
    keywords: ["contact", "consultation", "talk", "speak"],
    response:
      "You can book a consultation through our website, use this chat, or contact our expert team directly. For complex tax situations, we recommend scheduling a consultation with our specialists.",
  },
]

export function getSimpleResponse(userMessage: string): string {
  const message = userMessage.toLowerCase()

  for (const item of knowledgeBase) {
    if (item.keywords.some((keyword) => message.includes(keyword))) {
      return item.response
    }
  }

  return "Thanks for your question! I can help you with information about our services, pricing, business formation, and tax solutions. For specific questions, I'd recommend booking a consultation with our expert team through our website."
}

export async function generateCustomerServiceResponse(userMessage: string) {
  // First check if we have an API key
  if (!process.env.OPENAI_API_KEY) {
    console.log("No OpenAI API key found, using simple responses")
    return getSimpleResponse(userMessage)
  }

  try {
    console.log("Attempting to use OpenAI API...")

    const { text } = await generateText({
      model: openai("gpt-4o-mini"), // Using cheaper model for testing
      system: `You are the NexTax.AI customer service assistant. 

Company Information:
- NexTax.AI offers AI-powered tax solutions and business formation
- StartSmart package: $299 - Business formation in 48 hours
- Advanced packages: Transfer Pricing GPT ($2,999/month), State Tax Nexus GPT ($799/month)
- 20+ years Big 4 tax expertise built into our AI

Services:
- Business formation (LLC, S-Corp, C-Corp) in all 50 states
- Tax compliance and optimization
- Multi-state tax nexus management
- Custom AI tax solutions

Guidelines:
- Be helpful and professional
- Keep responses concise but informative
- For complex tax questions, recommend booking a consultation
- Always mention relevant services when appropriate`,
      prompt: userMessage,
    })

    console.log("OpenAI API call successful")
    return text
  } catch (error) {
    console.error("OpenAI API error:", error)
    // Fallback to simple responses if API fails
    return getSimpleResponse(userMessage)
  }
}

  return text
}
