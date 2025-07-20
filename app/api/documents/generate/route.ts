import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { documentType, businessInfo, customRequirements, userId } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    // Use a simple model configuration
    const model = openai("gpt-4o-mini")

    // Build document generation prompt
    const systemPrompt = buildDocumentSystemPrompt(documentType, "free")
    const documentPrompt = buildDocumentPrompt(documentType, businessInfo, customRequirements, "free")

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: documentPrompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    return NextResponse.json({
      content: text,
      model: "gpt-4o-mini",
      message: `${documentType} generated successfully!`,
    })
  } catch (error) {
    console.error("Document Generation API Error:", error)
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 })
  }
}

function buildDocumentSystemPrompt(documentType: string, userTier: string): string {
  return `You are StartSmart AI's document generation system, specialized in creating professional business formation documents.

DOCUMENT EXPERTISE:
• Legal document structure and formatting
• State-specific requirements and variations
• Industry best practices and standards
• Compliance with federal and state regulations
• Professional legal language and terminology

QUALITY STANDARDS:
• Generate complete, professional documents
• Include all necessary sections and clauses
• Use proper legal formatting and structure
• Add appropriate disclaimers and notices
• Ensure compliance with general business law principles`
}

function buildDocumentPrompt(
  documentType: string,
  businessInfo: any,
  customRequirements?: string,
  userTier?: string,
): string {
  const businessContext = `
Business Information:
• Name: ${businessInfo.name || "Not specified"}
• Type: ${businessInfo.type || "Not specified"}
• State: ${businessInfo.state || "Not specified"}
• Industry: ${businessInfo.industry || "General"}
${customRequirements ? `• Custom Requirements: ${customRequirements}` : ""}
`

  switch (documentType.toLowerCase()) {
    case "operating agreement":
      return `${businessContext}

Generate a comprehensive LLC Operating Agreement that includes:

REQUIRED SECTIONS:
1. Company Formation and Purpose
2. Member Information and Ownership Percentages
3. Management Structure (Member-managed or Manager-managed)
4. Capital Contributions and Initial Investments
5. Profit and Loss Distribution
6. Transfer of Membership Interests
7. Meetings and Voting Procedures
8. Dissolution and Winding Up Procedures
9. Legal Disclaimers and Governing Law

Format as a complete, professional legal document with proper headings, numbering, and legal language.`

    case "articles of incorporation":
      return `${businessContext}

Generate comprehensive Articles of Incorporation that include:

REQUIRED SECTIONS:
1. Corporate Name and Registered Office Address
2. Purpose and Powers of the Corporation
3. Authorized Shares and Stock Structure
4. Registered Agent Information
5. Incorporator Information and Signatures
6. Duration of Corporation
7. Director Information (if required by state)
8. Legal Disclaimers

Format as official Articles of Incorporation suitable for state filing.`

    case "corporate bylaws":
      return `${businessContext}

Generate comprehensive Corporate Bylaws that include:

REQUIRED SECTIONS:
1. Corporate Purpose and Powers
2. Shareholders - Meetings, Notice, Voting, Proxies
3. Board of Directors - Composition, Powers, Meetings
4. Officers - Roles, Election, Duties, Removal
5. Stock Certificates and Transfer Procedures
6. Corporate Records and Inspection Rights
7. Amendment Procedures
8. Dissolution Procedures
9. Legal Disclaimers

Format as complete corporate bylaws with proper article and section numbering.`

    default:
      return `${businessContext}

Generate a professional ${documentType} document that includes all necessary sections, proper legal formatting, and appropriate disclaimers. Ensure the document is comprehensive and suitable for business use.`
  }
}
