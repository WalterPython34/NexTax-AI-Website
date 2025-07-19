import OpenAI from "openai"
import type { BusinessProfile, DocumentGenerationRequest } from "./schema"

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
})

export class OpenAIService {
  // Fast generation for automation tools - optimized for speed
  async generateFastContent(prompt: string, maxTokens = 1500): Promise<string> {
    try {
      console.log("Generating fast content with optimized settings...")

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini", // Faster, cheaper model
        messages: [
          {
            role: "system",
            content:
              "You are a business automation expert. Generate concise, professional, actionable content. Format output as requested without markdown formatting unless specified.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.3, // Lower temperature for consistent, focused output
      })

      return response.choices[0]?.message?.content || ""
    } catch (error) {
      console.error("Fast generation error:", error)
      throw new Error(`Fast generation failed: ${error.message}`)
    }
  }

  async generateChatResponse(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    businessContext?: BusinessProfile | null,
    model = "gpt-4o",
  ): Promise<{
    content: string
    metadata?: any
  }> {
    try {
      const businessContextStr = businessContext
        ? `Business Context: ${businessContext.businessName} - ${businessContext.businessType} in ${businessContext.industry} (${businessContext.state})`
        : ""

      const systemPrompt = `You are StartSmart AI, an expert business formation and startup advisor created by NexTax.AI. You help entrepreneurs with:

- Business entity formation (LLC, Corporation, etc.)
- Tax setup and compliance guidance
- Legal requirements and documentation
- Financial planning and budgeting
- Market research and validation
- State-specific business requirements
- EIN applications and tax registrations
- Operating agreements and legal documents

You are personable, insightful, and provide step-by-step guidance. Always offer practical, actionable advice with specific next steps. Include relevant warnings about compliance issues and deadlines.

${businessContextStr}

Key capabilities you should highlight:
- State-specific guidance for all 50 states
- Document generation for legal and financial needs
- Real-time compliance and deadline tracking
- Integration with authoritative resources (IRS, SBA, state portals)

Provide detailed, helpful responses with specific action items where appropriate. Use emojis to make responses more engaging and structure information clearly with bullet points or numbered lists when helpful.`

      const response = await openaiClient.chat.completions.create({
        model: model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 1000,
        temperature: 0.7,
      })

      return {
        content:
          response.choices[0].message.content ||
          "I apologize, but I couldn't generate a response at this time. Please try again.",
        metadata: {
          model: model,
          tokens: response.usage?.total_tokens,
        },
      }
    } catch (error) {
      console.error("OpenAI API error:", error)
      throw new Error("Failed to generate AI response: " + (error as Error).message)
    }
  }

  async generateConversationTitle(firstMessage: string): Promise<string> {
    try {
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Generate a short, descriptive title (max 6 words) for a startup consultation based on the user's first message. Focus on the main topic or business need.",
          },
          {
            role: "user",
            content: firstMessage,
          },
        ],
        max_tokens: 20,
        temperature: 0.3,
      })

      return response.choices[0].message.content || "Business Consultation"
    } catch (error) {
      console.error("Error generating conversation title:", error)
      return "Business Consultation"
    }
  }

  async generateDocument(
    type: string,
    businessProfile?: BusinessProfile | null,
    customData?: any,
  ): Promise<{ title: string; content: string }> {
    try {
      // Handle specialized document types with their dedicated functions
      if (type === "chart_accounts") {
        const chartData = customData || {
          businessType: businessProfile?.businessType || "General Business",
          complexityLevel: "standard",
          trackInventory: false,
          includeStatementMapping: true,
        }
        const content = await this.generateChartOfAccounts(chartData)
        const title = this.generateDocumentTitle(type, businessProfile?.businessName)
        return { title, content }
      }

      if (type === "budget_template") {
        const expenseData = customData || {
          businessType: businessProfile?.businessType || "General Business",
          includeCategories: true,
          includeBudget: true,
          timeframe: "monthly",
        }
        const content = await this.generateExpenseTracker(expenseData)
        const title = this.generateDocumentTitle(type, businessProfile?.businessName)
        return { title, content }
      }

      // Handle other document types with generic approach
      const documentPrompts = {
        operating_agreement: "Generate a comprehensive LLC Operating Agreement",
        business_plan: "Create a detailed business plan with executive summary",
        ss4_form: "Generate step-by-step guidance for completing IRS Form SS-4 (EIN application)",
        pitch_deck: "Create a startup pitch deck outline with key slides",
        lean_canvas: "Generate a Lean Canvas business model template",
        articles_incorporation: "Generate Articles of Incorporation template",
        bylaws: "Create corporate bylaws template",
        executive_summary: "Create an executive summary for business plan",
      }

      const prompt = documentPrompts[type as keyof typeof documentPrompts] || `Generate a ${type} document`

      const businessContext = businessProfile
        ? `Business Context: ${businessProfile.businessName} - ${businessProfile.businessType} in ${businessProfile.industry} (${businessProfile.state})`
        : "General business context"

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a legal and business document expert. Generate professional, comprehensive documents for startups. Include proper formatting, required sections, and state-specific information where applicable. Always include disclaimers about legal review being recommended. ${businessContext}`,
          },
          {
            role: "user",
            content: `${prompt}. Make it detailed, professional, and actionable. Include all necessary sections and provisions. ${customData ? `Additional requirements: ${JSON.stringify(customData)}` : ""}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      })

      const content = response.choices[0].message.content || "Document generation failed"
      const title = this.generateDocumentTitle(type, businessProfile?.businessName)

      return { title, content }
    } catch (error) {
      console.error("Error generating document:", error)
      throw new Error("Failed to generate document: " + (error as Error).message)
    }
  }

  async getQuickHelp(question: string, context?: any): Promise<string> {
    try {
      const contextStr = context ? `Context: ${JSON.stringify(context)}` : ""

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are StartSmart AI. Provide quick, actionable answers to startup questions. Be concise but helpful. Use emojis to make responses engaging.",
          },
          {
            role: "user",
            content: `${question}\n${contextStr}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.5,
      })

      return response.choices[0].message.content || "I couldn't provide help at this time. Please try again."
    } catch (error) {
      console.error("Error getting quick help:", error)
      throw new Error("Failed to get AI assistance: " + (error as Error).message)
    }
  }

  async generateExpenseTracker(trackerData: any): Promise<string> {
    const {
      businessType,
      expenseCategories = [],
      includeBudgetTargets = false,
      trackPaymentMethods = false,
      monthlySummaries = false,
      customCategories = "",
    } = trackerData

    // Parse custom categories
    const additionalCategories = customCategories
      ? customCategories
          .split(",")
          .map((cat: string) => cat.trim())
          .filter(Boolean)
      : []

    const allCategories = [...expenseCategories, ...additionalCategories]

    const prompt = `Generate an Excel-formatted expense tracker for a ${businessType} business with the following specifications:

BUSINESS TYPE: ${businessType}
EXPENSE CATEGORIES: ${allCategories.join(", ")}
INCLUDE BUDGET TARGETS: ${includeBudgetTargets ? "Yes" : "No"}
TRACK PAYMENT METHODS: ${trackPaymentMethods ? "Yes" : "No"}
MONTHLY SUMMARIES: ${monthlySummaries ? "Yes" : "No"}

Create a comprehensive expense tracking spreadsheet with these requirements:

1. HEADER ROW with these columns (adjust based on options):
   - Date
   - Description
   - Category (dropdown list)
   - Amount
   ${trackPaymentMethods ? "- Payment Method (Cash/Credit Card/Check/Bank Transfer)" : ""}
   ${includeBudgetTargets ? "- Budget Target" : ""}
   - Notes

2. PRE-POPULATED CATEGORIES:
   ${allCategories.map((cat) => `- ${cat}`).join("\n   ")}

3. SAMPLE ENTRIES (5-10 realistic examples for ${businessType}):
   - Include realistic expenses for this business type
   - Use appropriate amounts for the industry
   - Demonstrate category usage

Format as tab-separated values (TSV) that can be imported into Excel. Include column headers as the first row.

CRITICAL FORMATTING RULES:
- Return ONLY the TSV data, no explanations or markdown formatting
- DO NOT include Excel formulas (no =SUM, =AVERAGE, etc.)
- Use plain text values only 
- For calculated fields, show the actual calculated result as a number
- Use simple currency symbols like $ followed by numbers
- Separate all columns with TAB characters only
- Each row should end with a line break

Example format:
Date    Description     Category        Amount  Payment Method
2025-01-01      Office supplies Office Supplies 25.99   Credit Card
2025-01-02      Software license        Software        99.00   Bank Transfer`

    try {
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content:
              "You are an expert business expense tracking specialist. Generate professional, industry-specific expense trackers in TSV format. CRITICAL: Return ONLY the TSV data with no markdown formatting, no code blocks, no explanations. Start directly with the header row.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      })

      return response.choices[0].message.content || "Error generating expense tracker"
    } catch (error) {
      console.error("Error generating expense tracker:", error)
      throw new Error("Failed to generate expense tracker")
    }
  }

  async generateChartOfAccounts(chartData: any): Promise<string> {
    try {
      const prompt = `Create a comprehensive Chart of Accounts for a ${chartData.businessType} business with ${chartData.complexityLevel} complexity level.

BUSINESS DETAILS:
- Business Type: ${chartData.businessType}
- Complexity Level: ${chartData.complexityLevel}
- Track Inventory: ${chartData.trackInventory ? "Yes" : "No"}
- Include Statement Mapping: ${chartData.includeStatementMapping ? "Yes" : "No"}
- Additional Requirements: ${chartData.additionalRequirements || "None specified"}

Please create a detailed Chart of Accounts that includes:
1. Account Number (sequential numbering system)
2. Account Name
3. Account Type (Asset, Liability, Equity, Income, Expense)
${chartData.includeStatementMapping ? "4. Financial Statement (Balance Sheet, Income Statement, Cash Flow)" : ""}

FORMAT AS A PROFESSIONAL EXCEL-STYLE TABLE:

CRITICAL FORMATTING RULES:
- Use plain text formatting only - NO markdown symbols
- Format as tab-separated values for easy Excel import
- DO NOT include Excel formulas (no =SUM, =VLOOKUP, etc.)
- Use only plain text values and numbers
- Include clear column headers as the first row
- Use standard accounting numbering (1000s for Assets, 2000s for Liabilities, etc.)
- Sort by account number
- Separate all columns with TAB characters only
- Each row should end with a line break

Example format:
Account Number  Account Name    Account Type    Financial Statement
1000    Cash    Asset   Balance Sheet
1100    Accounts Receivable     Asset   Balance Sheet
2000    Accounts Payable        Liability       Balance Sheet

The chart should follow GAAP accounting principles and be suitable for small to medium businesses.`

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content:
              "You are a certified public accountant (CPA) and financial systems expert who creates comprehensive, GAAP-compliant charts of accounts for businesses. Generate detailed, industry-specific account structures in TSV format. CRITICAL: Return ONLY the TSV data with no markdown formatting, no code blocks, no explanations. Start directly with the header row.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 2500,
        temperature: 0.1,
      })

      const generatedContent = response.choices[0].message.content || "Error generating chart of accounts"

      // Add professional disclaimer for AI-generated financial documents
      const disclaimer = `

DISCLAIMER
This Chart of Accounts is AI-generated for informational purposes only and should not be considered as professional accounting advice. Before implementing this chart of accounts:

1. Review with your certified public accountant (CPA) or financial advisor
2. Ensure compliance with your local accounting standards and regulations  
3. Customize account names and numbers to fit your specific business needs
4. Verify that all necessary accounts for your industry are included
5. Consider your accounting software's specific requirements and limitations

NexTax.AI and this AI-generated content do not constitute professional accounting, legal, or tax advice. Always consult with qualified professionals for your specific business accounting needs.

For professional assistance with your Chart of Accounts setup, contact NexTax.AI at info@nextax.ai`

      return generatedContent + disclaimer
    } catch (error) {
      console.error("Error generating chart of accounts:", error)
      throw new Error("Failed to generate chart of accounts")
    }
  }

  private generateDocumentTitle(type: string, businessName?: string): string {
    const titles = {
      operating_agreement: `${businessName || "Business"} Operating Agreement`,
      business_plan: `${businessName || "Business"} Plan`,
      ss4_form: "EIN Application Guide",
      pitch_deck: `${businessName || "Business"} Pitch Deck`,
      lean_canvas: `${businessName || "Business"} Lean Canvas`,
      budget_template: `${businessName || "Business"} Budget Template`,
      articles_incorporation: `${businessName || "Business"} Articles of Incorporation`,
      bylaws: `${businessName || "Business"} Corporate Bylaws`,
      chart_accounts: `${businessName || "Business"} Chart of Accounts`,
      executive_summary: `${businessName || "Business"} Executive Summary`,
    }

    return titles[type as keyof typeof titles] || `${businessName || "Business"} Document`
  }
}

export const openaiService = new OpenAIService()

// Initialize OpenAI with your API key
const model = "gpt-4o"

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

  const { text } = await openaiService.generateFastContent(documentPrompt)

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

  const response = await openaiService.generateChatResponse(messages, context?.businessProfile)

  return response.content
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

  const { text } = await openaiService.generateFastContent(fullPrompt, 500)

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

  const { text } = await openaiService.generateFastContent(prompt, 1500)

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

  const { text } = await openaiService.generateFastContent(prompt, 2000)

  return text
}
