import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export const openaiService = {
  async generateDocument(documentType: string, businessProfile: any, businessData: any) {
    const prompts = {
      business_plan: `Generate a comprehensive business plan for a ${businessProfile?.businessType || "business"} called "${businessProfile?.businessName || "New Business"}". Include executive summary, market analysis, financial projections, and operational plan.`,

      operating_agreement: `Create an LLC Operating Agreement for "${businessProfile?.businessName || "New LLC"}" with the following details:
        - Business Type: ${businessProfile?.businessType || "General Business"}
        - State: ${businessProfile?.state || "Delaware"}
        - Members: ${businessData?.members || "Single Member"}
        Include all standard clauses for management, distributions, and member rights.`,

      bylaws: `Generate Corporate Bylaws for "${businessProfile?.businessName || "New Corporation"}" including:
        - Shareholder meeting procedures
        - Board of directors structure
        - Officer roles and responsibilities
        - Stock transfer procedures`,

      partnership_agreement: `Create a Partnership Agreement for "${businessProfile?.businessName || "New Partnership"}" with:
        - Partner details and contributions
        - Profit/loss sharing arrangements
        - Management structure
        - Dissolution procedures`,

      chart_of_accounts: `Generate a Chart of Accounts in CSV format for a ${businessProfile?.businessType || "business"}. Include account numbers, names, types (Asset, Liability, Equity, Income, Expense), and descriptions. Format as CSV with headers: Account Number,Account Name,Account Type,Description`,

      expense_tracker: `Create an expense tracking template in CSV format for a ${businessProfile?.businessType || "business"}. Include sample entries with headers: Date,Description,Category,Amount,Payment Method,Budget Target,Notes`,
    }

    const prompt =
      prompts[documentType as keyof typeof prompts] ||
      `Generate a ${documentType} document for ${businessProfile?.businessName || "the business"}.`

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        system:
          "You are a professional business document generator. Create detailed, legally-informed documents that are practical and comprehensive. For CSV formats, ensure proper formatting with quoted strings where necessary.",
      })

      return {
        title: `${documentType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} - ${businessProfile?.businessName || "Generated Document"}`,
        content: text,
      }
    } catch (error) {
      console.error("Error generating document:", error)
      throw new Error("Failed to generate document")
    }
  },

  async generateChatResponse(message: string, context: any = {}) {
    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: message,
        system: `You are StartSmart GPT, an AI assistant specializing in business formation and compliance. You help entrepreneurs start and manage their businesses by providing expert guidance on:
        - Business structure selection (LLC, Corporation, Partnership, etc.)
        - Legal compliance and requirements
        - Tax implications and strategies
        - Document preparation and filing
        - Ongoing business management
        
        Provide practical, actionable advice while noting when users should consult with legal or tax professionals for specific situations.`,
      })

      return text
    } catch (error) {
      console.error("Error generating chat response:", error)
      throw new Error("Failed to generate response")
    }
  },
}
