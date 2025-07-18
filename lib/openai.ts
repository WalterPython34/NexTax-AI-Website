import { openai } from "@ai-sdk/openai"
import { generateText, streamText } from "ai"
import type { BusinessProfile, DocumentGenerationRequest } from "./schema"

// Initialize OpenAI with your API key
const model = openai("gpt-4o")

export async function generateBusinessDocument(
  request: DocumentGenerationRequest,
  businessProfile: BusinessProfile,
): Promise<string> {
  const { type, custom_requirements } = request

  const systemPrompt = `You are a legal document generator specializing in business formation documents. 
  Generate professional, legally sound documents based on the provided business information.
  Always include standard legal disclaimers and ensure compliance with general business law principles.`

  let documentPrompt = ""

  switch (type) {
    case "operating_agreement":
      documentPrompt = `Generate a comprehensive LLC Operating Agreement for ${businessProfile.business_name}, 
      a ${businessProfile.business_type} formed in ${businessProfile.state}. 
      Industry: ${businessProfile.industry}.
      ${custom_requirements ? `Additional requirements: ${custom_requirements}` : ""}
      
      Include sections for:
      - Company formation and purpose
      - Member information and ownership
      - Management structure
      - Capital contributions
      - Profit and loss distribution
      - Transfer of membership interests
      - Dissolution procedures
      - Legal disclaimers`
      break

    case "bylaws":
      documentPrompt = `Generate comprehensive Corporate Bylaws for ${businessProfile.business_name}, 
      a ${businessProfile.business_type} formed in ${businessProfile.state}.
      Industry: ${businessProfile.industry}.
      ${custom_requirements ? `Additional requirements: ${custom_requirements}` : ""}
      
      Include sections for:
      - Corporate purpose and powers
      - Shareholders meetings and voting
      - Board of directors structure
      - Officer roles and responsibilities
      - Stock certificates and transfers
      - Amendment procedures
      - Legal disclaimers`
      break

    case "articles":
      documentPrompt = `Generate Articles of Incorporation for ${businessProfile.business_name}, 
      a ${businessProfile.business_type} to be formed in ${businessProfile.state}.
      Industry: ${businessProfile.industry}.
      ${custom_requirements ? `Additional requirements: ${custom_requirements}` : ""}
      
      Include:
      - Corporate name and registered address
      - Purpose of corporation
      - Authorized shares and stock structure
      - Registered agent information
      - Incorporator information
      - Duration of corporation
      - Legal disclaimers`
      break

    default:
      throw new Error(`Unsupported document type: ${type}`)
  }

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: documentPrompt,
    maxTokens: 4000,
  })

  return text
}

export async function generateChatResponse(
  message: string,
  context?: {
    businessProfile?: BusinessProfile
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
  },
) {
  const systemPrompt = `You are StartSmart GPT, an AI business advisor specializing in business formation, 
  compliance, and tax planning. You provide helpful, accurate advice while always recommending users 
  consult with qualified professionals for specific legal and tax matters.
  
  Your expertise includes:
  - Business entity selection (LLC, Corporation, Partnership)
  - State-specific formation requirements
  - Tax implications and strategies
  - Compliance and regulatory requirements
  - Business planning and structure
  
  Always be helpful, professional, and include appropriate disclaimers about seeking professional advice.`

  let contextPrompt = message

  if (context?.businessProfile) {
    contextPrompt = `Business Context: ${context.businessProfile.business_name} is a ${context.businessProfile.business_type} 
    in ${context.businessProfile.state}, operating in the ${context.businessProfile.industry} industry.
    
    User Question: ${message}`
  }

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(context?.conversationHistory || []),
    { role: "user" as const, content: contextPrompt },
  ]

  return streamText({
    model,
    messages,
    maxTokens: 1000,
  })
}

export async function generateQuickResponse(question: string, context: string) {
  const systemPrompt = `You are StartSmart GPT, providing quick, helpful answers about business formation and compliance. 
  Keep responses concise but informative. Always include a disclaimer about consulting professionals.`

  const contextPrompts = {
    general: "General business formation question",
    llc: "Question about LLC formation and management",
    corporation: "Question about corporate formation and management",
    tax: "Question about business tax implications",
    compliance: "Question about business compliance requirements",
  }

  const fullPrompt = `Context: ${contextPrompts[context as keyof typeof contextPrompts] || contextPrompts.general}
  
  Question: ${question}`

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: fullPrompt,
    maxTokens: 500,
  })

  return text
}

export async function analyzeBusinessStructure(businessInfo: {
  industry: string
  expectedRevenue: string
  numberOfOwners: number
  state: string
  goals: string[]
}) {
  const systemPrompt = `You are a business structure analyst. Analyze the provided business information 
  and recommend the most suitable business entity type with detailed reasoning.`

  const prompt = `Analyze this business and recommend the optimal structure:
  
  Industry: ${businessInfo.industry}
  Expected Annual Revenue: ${businessInfo.expectedRevenue}
  Number of Owners: ${businessInfo.numberOfOwners}
  State: ${businessInfo.state}
  Business Goals: ${businessInfo.goals.join(", ")}
  
  Provide:
  1. Recommended entity type (LLC, S-Corp, C-Corp, Partnership)
  2. Confidence level (1-100%)
  3. Key reasons for recommendation
  4. Tax implications
  5. Compliance requirements
  6. Alternative options to consider`

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt,
    maxTokens: 1500,
  })

  return text
}

export async function generateComplianceChecklist(businessProfile: BusinessProfile) {
  const systemPrompt = `You are a business compliance expert. Generate a comprehensive compliance 
  checklist based on the business profile provided.`

  const prompt = `Generate a compliance checklist for:
  
  Business: ${businessProfile.business_name}
  Type: ${businessProfile.business_type}
  State: ${businessProfile.state}
  Industry: ${businessProfile.industry}
  Formation Date: ${businessProfile.formation_date || "Recently formed"}
  
  Include:
  - Federal tax obligations
  - State-specific requirements
  - Industry-specific compliance
  - Annual filing requirements
  - Ongoing maintenance tasks
  - Important deadlines
  
  Format as a structured checklist with priorities and due dates where applicable.`

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt,
    maxTokens: 2000,
  })

  return text
}
