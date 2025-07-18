import { generateText, generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required")
}

export const openaiService = {
  async generateChatResponse(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    businessContext?: any,
    model = "gpt-4",
  ) {
    const systemPrompt = `You are StartSmart GPT, an AI business advisor specializing in business formation, compliance, and growth strategies. 

${
  businessContext
    ? `Business Context:
- Business Name: ${businessContext.businessName}
- Business Type: ${businessContext.businessType}
- Industry: ${businessContext.industry}
- State: ${businessContext.state}
- Description: ${businessContext.description || "Not provided"}
`
    : ""
}

Provide helpful, accurate advice about:
- Business formation (LLC, Corporation, S-Corp, etc.) for all 50 US states
- Tax implications and strategies
- Compliance requirements
- Document preparation
- Business growth strategies
- Legal considerations
- Market Research
- Collaborate on logos and new product ideas
- Helping with website landing page
- Sales & Marketing strategies


Always be professional, concise, and actionable in your responses.`

    const { text } = await generateText({
      model: openai(model),
      system: systemPrompt,
      messages,
    })

    return {
      content: text,
      metadata: {
        model,
        timestamp: new Date().toISOString(),
        businessContext: !!businessContext,
      },
    }
  },

  async generateDocument(documentType: string, businessProfile: any, additionalRequirements?: string) {
    const systemPrompt = `You are a legal document generator specializing in business formation documents. Generate professional, legally sound documents based on the provided business information.

Business Information:
- Business Name: ${businessProfile.businessName}
- Business Type: ${businessProfile.businessType}
- Industry: ${businessProfile.industry}
- State: ${businessProfile.state}
- Description: ${businessProfile.description || "Not provided"}

${additionalRequirements ? `Additional Requirements: ${additionalRequirements}` : ""}

Generate a complete ${documentType} document that is:
1. Legally compliant for ${businessProfile.state}
2. Appropriate for a ${businessProfile.businessType}
3. Professional and comprehensive
4. Ready for use with minimal modifications

Format the document with proper headings, sections, and legal language.`

    const { text } = await generateText({
      model: openai("gpt-4"),
      system: systemPrompt,
      prompt: `Generate a ${documentType} for the business described above.`,
    })

    return {
      content: text,
      metadata: {
        documentType,
        businessId: businessProfile.id,
        generatedAt: new Date().toISOString(),
        model: "gpt-4",
      },
    }
  },

  async generateBusinessAnalysis(businessProfile: any) {
    const analysisSchema = z.object({
      strengths: z.array(z.string()),
      opportunities: z.array(z.string()),
      recommendations: z.array(z.string()),
      complianceItems: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          category: z.enum(["tax_filing", "license_renewal", "annual_report", "permit", "registration", "other"]),
          priority: z.enum(["low", "medium", "high", "urgent"]),
          estimatedDueDate: z.string(),
        }),
      ),
      nextSteps: z.array(z.string()),
    })

    const { object } = await generateObject({
      model: openai("gpt-4"),
      schema: analysisSchema,
      prompt: `Analyze this business profile and provide strategic insights:

Business Name: ${businessProfile.businessName}
Business Type: ${businessProfile.businessType}
Industry: ${businessProfile.industry}
State: ${businessProfile.state}
Expected Revenue: ${businessProfile.expectedRevenue || "Not specified"}
Number of Employees: ${businessProfile.numberOfEmployees || "Not specified"}
Description: ${businessProfile.description || "Not provided"}

Provide a comprehensive business analysis including strengths, opportunities, recommendations, compliance requirements, and next steps.`,
    })

    return object
  },

  async generateConversationTitle(firstMessage: string) {
    const { text } = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt: `Generate a short, descriptive title (max 50 characters) for a business conversation that starts with: "${firstMessage.slice(0, 200)}..."`,
    })

    return text.replace(/['"]/g, "").slice(0, 50)
  },

  async generateComplianceReminder(complianceItem: any) {
    const { text } = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt: `Generate a professional reminder email content for this compliance item:
      
Title: ${complianceItem.title}
Description: ${complianceItem.description}
Due Date: ${complianceItem.dueDate}
Category: ${complianceItem.category}

The email should be professional, helpful, and include actionable next steps.`,
    })

    return text
  },
}

