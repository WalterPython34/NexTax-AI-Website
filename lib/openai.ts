import { generateText, streamText } from "ai"
import { openai } from "@ai-sdk/openai"

const model = openai("gpt-4o")

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface DocumentGenerationRequest {
  type: string
  businessInfo: any
  customFields?: Record<string, any>
}

export interface DocumentTemplate {
  name: string
  type: string
  description: string
  fields: string[]
  template: string
}

// Document Templates
export const documentTemplates: DocumentTemplate[] = [
  {
    name: 'LLC Operating Agreement',
    type: 'llc-operating-agreement',
    description: 'Comprehensive operating agreement for LLC formation',
    fields: ['businessName', 'state', 'members', 'managementStructure', 'capitalContributions'],
    template: `
# OPERATING AGREEMENT OF {{businessName}}, LLC

This Operating Agreement ("Agreement") is made effective as of {{effectiveDate}}, by and among the Members of {{businessName}}, LLC, a {{state}} limited liability company (the "Company").

## ARTICLE I - FORMATION

1.1 **Formation.** The Company was formed by filing Articles of Organization with the Secretary of State of {{state}} on {{formationDate}}.

1.2 **Name.** The name of the Company is {{businessName}}, LLC.

1.3 **Principal Place of Business.** The principal place of business of the Company shall be {{principalAddress}}.

## ARTICLE II - MEMBERS AND MEMBERSHIP INTERESTS

2.1 **Members.** The initial Members of the Company and their respective Membership Interests are as follows:

{{#each members}}
- {{name}}: {{percentage}}% membership interest
{{/each}}

2.2 **Capital Contributions.** The Members have made or agree to make the following initial capital contributions:

{{#each capitalContributions}}\
- {{this.memberName}}: ${{this.amount}} ({{this.type}})
{{/each}}

## ARTICLE III - MANAGEMENT

3.1 **Management Structure.** The Company shall be managed by {{managementStructure}}.

{{#if memberManaged}}
3.2 **Member Management.** All Members shall participate in the management of the Company. Decisions requiring Member approval shall be made by {{votingThreshold}} vote of the Members.
{{/if}}

{{#if managerManaged}}
3.3 **Manager Management.** The Company shall be managed by one or more Managers appointed by the Members. The initial Manager(s) are:

{{#each managers}}
- {{name}}
{{/each}}
{{/if}}

## ARTICLE IV - DISTRIBUTIONS

4.1 **Distributions.** Distributions shall be made to Members in proportion to their Membership Interests, unless otherwise determined by {{managementAuthority}}.

## ARTICLE V - BOOKS AND RECORDS

5.1 **Books and Records.** The Company shall maintain complete books and records of its business and financial affairs at its principal place of business.

## ARTICLE VI - DISSOLUTION

6.1 **Dissolution Events.** The Company shall be dissolved upon the occurrence of any of the following events:
- The unanimous consent of all Members
- The entry of a decree of judicial dissolution
- Any other event that makes it unlawful or impossible to carry on the business of the Company

This Agreement shall be binding upon the Members and their respective heirs, successors, and assigns.

IN WITNESS WHEREOF, the Members have executed this Agreement as of the date first written above.

{{#each members}}
_________________________
{{name}}, Member

{{/each}}
    `
  },
  {
    name: 'Corporate Bylaws',
    type: 'corporate-bylaws',
    description: 'Standard corporate bylaws for C-Corporation or S-Corporation',
    fields: ['corporationName', 'state', 'directors', 'officers', 'shares'],
    template: `
# BYLAWS OF {{corporationName}}

## ARTICLE I - OFFICES

**Section 1.1 Registered Office.** The registered office of the Corporation shall be located in the State of {{state}}.

**Section 1.2 Other Offices.** The Corporation may maintain other offices at such places as the Board of Directors may determine.

## ARTICLE II - SHAREHOLDERS

**Section 2.1 Annual Meeting.** An annual meeting of shareholders shall be held on {{annualMeetingDate}} of each year at {{meetingTime}}.

**Section 2.2 Special Meetings.** Special meetings of shareholders may be called by the Board of Directors or by shareholders holding at least {{specialMeetingThreshold}}% of the outstanding shares.

**Section 2.3 Notice.** Written notice of all meetings shall be given not less than {{noticeMinDays}} days nor more than {{noticeMaxDays}} days before the meeting.

**Section 2.4 Quorum.** A majority of the outstanding shares entitled to vote shall constitute a quorum.

## ARTICLE III - BOARD OF DIRECTORS

**Section 3.1 Number and Qualifications.** The number of directors shall be {{numberOfDirectors}}. Directors need not be shareholders or residents of {{state}}.

**Section 3.2 Initial Directors.** The initial directors are:

{{#each directors}}
- {{name}}
{{/each}}

**Section 3.3 Term of Office.** Directors shall hold office for {{directorTerm}} year(s) or until their successors are elected and qualified.

**Section 3.4 Regular Meetings.** Regular meetings of the Board shall be held {{boardMeetingFrequency}}.

**Section 3.5 Powers.** The Board of Directors shall have the power to manage the business and affairs of the Corporation.

## ARTICLE IV - OFFICERS

**Section 4.1 Officers.** The officers of the Corporation shall consist of a President, Secretary, and Treasurer, and such other officers as the Board may determine.

**Section 4.2 Initial Officers.** The initial officers are:

{{#each officers}}
- {{title}}: {{name}}
{{/each}}

**Section 4.3 President.** The President shall be the chief executive officer of the Corporation and shall have general supervision over the business and affairs of the Corporation.

**Section 4.4 Secretary.** The Secretary shall keep the minutes of all meetings and maintain the corporate records.

**Section 4.5 Treasurer.** The Treasurer shall have custody of all corporate funds and securities.

## ARTICLE V - STOCK
\
**Section 5.1 Authorized Stock.** The Corporation is authorized to issue {{authorizedShares}} shares of {{stockClass}} stock, par value ${{this.parValue}} per share.

**Section 5.2 Stock Certificates.** Shares shall be represented by certificates signed by the President and Secretary.

## ARTICLE VI - AMENDMENTS

These Bylaws may be amended by the affirmative vote of {{amendmentThreshold}} of the Board of Directors.

ADOPTED this {{adoptionDate}}.

_________________________
{{secretaryName}}, Secretary
    `
  },
  {
    name: 'Articles of Incorporation',
    type: 'articles-of-incorporation',
    description: 'Articles of Incorporation for corporation formation',
    fields: ['corporationName', 'state', 'purpose', 'shares', 'incorporator', 'registeredAgent'],
    template: `
# ARTICLES OF INCORPORATION OF {{corporationName}}

The undersigned incorporator hereby adopts the following Articles of Incorporation for the above-named corporation:

## ARTICLE I - NAME
The name of the corporation is {{corporationName}}.

## ARTICLE II - PURPOSE
The purpose for which this corporation is organized is {{purpose}}.

## ARTICLE III - DURATION
The period of duration of this corporation is perpetual.

## ARTICLE IV - CAPITAL STOCK\
The aggregate number of shares that the corporation shall have authority to issue is {{authorizedShares}} shares of {{stockClass}} stock, each with a par value of ${{this.parValue}}.

## ARTICLE V - REGISTERED OFFICE AND AGENT
The street address of the initial registered office is {{registeredOfficeAddress}}, and the name of the initial registered agent at such address is {{registeredAgentName}}.

## ARTICLE VI - INCORPORATOR
The name and address of the incorporator is:
{{incorporatorName}}
{{incorporatorAddress}}

## ARTICLE VII - DIRECTORS
The number of directors constituting the initial Board of Directors is {{numberOfDirectors}}, and the names and addresses of the initial directors are:

{{#each directors}}
{{name}}
{{address}}

{{/each}}

## ARTICLE VIII - LIABILITY
The personal liability of directors of the corporation is hereby eliminated to the fullest extent permitted by the {{state}} Business Corporation Act.

## ARTICLE IX - INDEMNIFICATION
The corporation shall indemnify its directors and officers to the fullest extent permitted by law.

IN WITNESS WHEREOF, the undersigned incorporator has executed these Articles of Incorporation on {{executionDate}}.

_________________________
{{incorporatorName}}, Incorporator
    `
  }
]

// AI Chat Functions
export async function generateChatResponse(messages: ChatMessage[], context?: any) {
  try {
    const systemPrompt = `You are StartSmart GPT, an expert AI business advisor specializing in business formation, tax planning, compliance, and growth strategies. You provide practical, actionable advice for entrepreneurs and small business owners.

Key areas of expertise:
- Business structure selection (LLC, Corporation, Partnership)
- Tax planning and optimization
- Compliance requirements and deadlines
- Document preparation and review
- Business growth strategies
- Regulatory requirements

Always provide specific, actionable advice and ask clarifying questions when needed. Be professional but approachable.

${context ? `Additional context: ${JSON.stringify(context)}` : ""}`

    const { text } = await generateText({
      model,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    return {
      success: true,
      response: text,
    }
  } catch (error: any) {
    console.error("Error generating chat response:", error)
    return {
      success: false,
      error: error.message || "Failed to generate response",
    }
  }
}

export async function streamChatResponse(messages: ChatMessage[], context?: any) {
  try {
    const systemPrompt = `You are StartSmart GPT, an expert AI business advisor specializing in business formation, tax planning, compliance, and growth strategies. You provide practical, actionable advice for entrepreneurs and small business owners.

Key areas of expertise:
- Business structure selection (LLC, Corporation, Partnership)
- Tax planning and optimization
- Compliance requirements and deadlines
- Document preparation and review
- Business growth strategies
- Regulatory requirements

Always provide specific, actionable advice and ask clarifying questions when needed. Be professional but approachable.

${context ? `Additional context: ${JSON.stringify(context)}` : ""}`

    const result = streamText({
      model,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    return result
  } catch (error: any) {
    console.error("Error streaming chat response:", error)
    throw error
  }
}

// Document Generation Functions
export async function generateDocument(request: DocumentGenerationRequest) {
  try {
    const template = documentTemplates.find((t) => t.type === request.type)

    if (!template) {
      throw new Error(`Template not found for type: ${request.type}`)
    }

    const prompt = `Generate a professional ${template.name} document with the following information:

Business Information:
${JSON.stringify(request.businessInfo, null, 2)}

${
  request.customFields
    ? `Custom Fields:
${JSON.stringify(request.customFields, null, 2)}`
    : ""
}

Please create a complete, legally sound document that includes all necessary sections and clauses. The document should be professional, comprehensive, and tailored to the specific business information provided.

Use proper legal formatting and include all standard provisions for this type of document.`

    const { text } = await generateText({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a legal document expert specializing in business formation documents. Generate professional, comprehensive legal documents based on the provided information.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    return {
      success: true,
      document: {
        title: template.name,
        type: request.type,
        content: text,
        template: template.name,
      },
    }
  } catch (error: any) {
    console.error("Error generating document:", error)
    return {
      success: false,
      error: error.message || "Failed to generate document",
    }
  }
}

// Business Analysis Functions
export async function analyzeBusinessStructure(businessInfo: any) {
  try {
    const prompt = `Analyze the following business information and provide a recommendation for the best business structure (LLC, S-Corp, C-Corp, Partnership, Sole Proprietorship):

Business Information:
- Industry: ${businessInfo.industry}
- Expected Annual Revenue: ${businessInfo.expectedRevenue}
- Number of Owners: ${businessInfo.numberOfOwners}
- Growth Plans: ${businessInfo.growthPlans}
- Tax Preferences: ${businessInfo.taxPreferences}
- Liability Concerns: ${businessInfo.liabilityConcerns}
- Investment Plans: ${businessInfo.investmentPlans}

Please provide:
1. Recommended business structure
2. Reasoning for the recommendation
3. Tax implications
4. Pros and cons
5. Alternative options to consider
6. Next steps for formation`

    const { text } = await generateText({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a business formation expert and tax advisor. Provide detailed, accurate analysis of business structures based on the specific needs and circumstances provided.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    return {
      success: true,
      analysis: text,
    }
  } catch (error: any) {
    console.error("Error analyzing business structure:", error)
    return {
      success: false,
      error: error.message || "Failed to analyze business structure",
    }
  }
}

// Compliance Analysis
export async function generateComplianceTasks(businessInfo: any) {
  try {
    const prompt = `Generate a comprehensive compliance checklist for a new business with the following information:

Business Information:
- Business Structure: ${businessInfo.businessType}
- Industry: ${businessInfo.industry}
- State: ${businessInfo.state}
- Number of Employees: ${businessInfo.employees || 0}
- Expected Revenue: ${businessInfo.expectedRevenue}

Please provide a detailed list of compliance tasks including:
1. Formation requirements
2. Tax registrations and filings
3. Licenses and permits needed
4. Ongoing compliance requirements
5. Deadlines and frequencies
6. Priority levels (High, Medium, Low)

Format as a structured list with specific deadlines where applicable.`

    const { text } = await generateText({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a compliance expert specializing in business formation and ongoing regulatory requirements. Provide comprehensive, accurate compliance guidance.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    return {
      success: true,
      tasks: text,
    }
  } catch (error: any) {
    console.error("Error generating compliance tasks:", error)
    return {
      success: false,
      error: error.message || "Failed to generate compliance tasks",
    }
  }
}

// Quick Response for Simple Questions
export async function generateQuickResponse(question: string, context?: any) {
  try {
    const { text } = await generateText({
      model,
      messages: [
        {
          role: "system",
          content: `You are StartSmart GPT, a business formation expert. Provide concise, helpful answers to business questions. Keep responses under 200 words unless more detail is specifically requested.
          
          ${context ? `Context: ${JSON.stringify(context)}` : ""}`,
        },
        {
          role: "user",
          content: question,
        },
      ],
    })

    return {
      success: true,
      response: text,
    }
  } catch (error: any) {
    console.error("Error generating quick response:", error)
    return {
      success: false,
      error: error.message || "Failed to generate response",
    }
  }
}

export default {
  generateChatResponse,
  streamChatResponse,
  generateDocument,
  analyzeBusinessStructure,
  generateComplianceTasks,
  generateQuickResponse,
  documentTemplates,
}

