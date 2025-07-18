import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { getUserProfile, getUserUsageCount, recordUsage, createDocument } from "@/lib/storage"
import { getUserTier, checkUsageLimit } from "@/lib/ai-usage-config"
import { getModelForTask } from "@/lib/ai-models"
import { db } from "@/lib/database"
import { documents } from "@/lib/schema"

export async function POST(request: NextRequest) {
  try {
    const { documentType, businessInfo, customRequirements, userId } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    // Get user profile and determine tier
    let userTier = "free"
    let currentUsage = 0

    if (userId) {
      try {
        const profile = await getUserProfile(userId)
        userTier = profile?.subscription_status || "free"
        currentUsage = await getUserUsageCount(userId, "document_generation", "monthly")
      } catch (error) {
        console.log("User profile not found, using free tier")
      }
    }

    // Check usage limits
    const tierConfig = getUserTier(userTier)
    const usageCheck = checkUsageLimit(currentUsage, tierConfig.limits.documentsGenerated, "document generation")

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

    // Get appropriate model for document generation
    const modelConfig = getModelForTask("document", userTier)
    const model = openai(modelConfig.modelId)

    // Build document generation prompt
    const systemPrompt = buildDocumentSystemPrompt(documentType, userTier)
    const documentPrompt = buildDocumentPrompt(documentType, businessInfo, customRequirements, userTier)

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: documentPrompt,
      maxTokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
    })

    // Save document to database
    let documentId = null
    if (userId) {
      try {
        const document = await createDocument({
          user_id: userId,
          title: `${documentType} - ${businessInfo.name || "Business"}`,
          type: documentType.toLowerCase().replace(/\s+/g, "_"),
          content: text,
          status: "generated",
          metadata: {
            business_info: businessInfo,
            custom_requirements: customRequirements,
            model_used: modelConfig.modelId,
            tier: userTier,
          },
        })
        documentId = document.id
      } catch (error) {
        console.error("Failed to save document:", error)
      }
    }

    // Record usage
    if (userId) {
      try {
        await recordUsage({
          user_id: userId,
          action_type: "document_generation",
          count: 1,
          metadata: {
            document_type: documentType,
            model: modelConfig.modelId,
            tier: userTier,
            document_id: documentId,
          },
        })
      } catch (error) {
        console.error("Failed to record usage:", error)
      }
    }

    // Save to database (you'll need to implement user authentication)
    const newDocument = await db
      .insert(documents)
      .values({
        documentType,
        title: `${documentType} - ${businessInfo.name}`,
        content: text,
        status: "draft",
        // userId: userId, // Add when you implement auth
        // businessProfileId: businessProfileId, // Add when you implement auth
      })
      .returning()

    return NextResponse.json({
      documentId: newDocument[0].id,
      content: text,
      model: modelConfig.modelId,
      tier: userTier,
      usage: {
        current: currentUsage + 1,
        limit: tierConfig.limits.documentsGenerated,
        remaining:
          tierConfig.limits.documentsGenerated === -1
            ? "unlimited"
            : Math.max(0, tierConfig.limits.documentsGenerated - currentUsage - 1),
      },
      message: `${documentType} generated successfully!`,
    })
  } catch (error) {
    console.error("Document Generation API Error:", error)
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 })
  }
}

function buildDocumentSystemPrompt(documentType: string, userTier: string): string {
  const basePrompt = `You are StartSmart AI's document generation system, specialized in creating professional business formation documents.

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
• Ensure compliance with general business law principles

${
  userTier !== "free"
    ? `
ADVANCED FEATURES (${userTier.toUpperCase()} TIER):
• Comprehensive customization based on specific requirements
• Industry-specific clauses and provisions
• Advanced legal structures and options
• Detailed explanatory comments
• Multiple format options and variations
`
    : `
FREE TIER LIMITATIONS:
• Basic document templates
• Standard clauses and provisions
• General business structures
• Recommend upgrade for advanced customization
`
}`

  return basePrompt
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

${
  userTier !== "free"
    ? `
ADVANCED CUSTOMIZATIONS:
• Industry-specific operational clauses
• Detailed buy-sell provisions
• Advanced tax election considerations
• Comprehensive dispute resolution procedures
• Detailed management duties and restrictions
`
    : ""
}

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

${
  userTier !== "free"
    ? `
ADVANCED FEATURES:
• Multiple classes of stock with different rights
• Detailed purpose clauses for specific industries
• Advanced corporate powers and limitations
• Comprehensive indemnification provisions
`
    : ""
}

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

${
  userTier !== "free"
    ? `
ADVANCED PROVISIONS:
• Detailed committee structures and powers
• Advanced voting procedures and requirements
• Comprehensive conflict of interest policies
• Detailed indemnification and insurance provisions
• Electronic meeting and voting procedures
`
    : ""
}

Format as complete corporate bylaws with proper article and section numbering.`

    default:
      return `${businessContext}

Generate a professional ${documentType} document that includes all necessary sections, proper legal formatting, and appropriate disclaimers. Ensure the document is comprehensive and suitable for business use.

${userTier !== "free" ? "Include advanced customizations and detailed provisions appropriate for the business type and industry." : "Provide a standard template with essential provisions."}`
  }
}

function generateDocumentContent(documentType: string, businessInfo: any) {
  // This is a simplified version - you'd want to use proper templates
  const templates = {
    "Operating Agreement": {
      title: `${businessInfo.name} LLC Operating Agreement`,
      sections: [
        "Formation and Purpose",
        "Members and Ownership",
        "Management Structure",
        "Financial Provisions",
        "Dissolution",
      ],
    },
    "Articles of Incorporation": {
      title: `Articles of Incorporation for ${businessInfo.name}`,
      sections: ["Corporate Name", "Registered Office", "Purpose", "Stock Authorization", "Incorporator Information"],
    },
    "Business Plan": {
      title: `Business Plan for ${businessInfo.name}`,
      sections: [
        "Executive Summary",
        "Company Description",
        "Market Analysis",
        "Financial Projections",
        "Implementation Timeline",
      ],
    },
  }

  return (
    templates[documentType as keyof typeof templates] || {
      title: documentType,
      sections: ["Content to be generated"],
    }
  )
}
