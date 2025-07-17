import OpenAI from "openai";
import type { Message, BusinessProfile } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export class OpenAIService {
  // Fast generation for automation tools - optimized for speed
  async generateFastContent(prompt: string, maxTokens: number = 1500): Promise<string> {
    try {
      console.log('Generating fast content with optimized settings...');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Faster, cheaper model
        messages: [
          { 
            role: "system", 
            content: "You are a business automation expert. Generate concise, professional, actionable content. Format output as requested without markdown formatting unless specified."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3, // Lower temperature for consistent, focused output
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Fast generation error:", error);
      throw new Error(`Fast generation failed: ${error.message}`);
    }
  }

  async generateChatResponse(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    businessContext?: BusinessProfile | null,
    model: string = "gpt-4o"
  ): Promise<{
    content: string;
    metadata?: any;
  }> {
    try {
      const businessContextStr = businessContext ? 
        `Business Context: ${businessContext.businessName} - ${businessContext.businessType} in ${businessContext.industry} (${businessContext.state})` :
        "";

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

Provide detailed, helpful responses with specific action items where appropriate. Use emojis to make responses more engaging and structure information clearly with bullet points or numbered lists when helpful.`;

      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      return {
        content: response.choices[0].message.content || "I apologize, but I couldn't generate a response at this time. Please try again.",
        metadata: {
          model: model,
          tokens: response.usage?.total_tokens
        }
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error("Failed to generate AI response: " + (error as Error).message);
    }
  }

  async generateConversationTitle(firstMessage: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Generate a short, descriptive title (max 6 words) for a startup consultation based on the user's first message. Focus on the main topic or business need."
          },
          {
            role: "user",
            content: firstMessage
          }
        ],
        max_tokens: 20,
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Business Consultation";
    } catch (error) {
      console.error("Error generating conversation title:", error);
      return "Business Consultation";
    }
  }

  async generateDocument(
    type: string, 
    businessProfile?: BusinessProfile | null, 
    customData?: any
  ): Promise<{ title: string; content: string }> {
    try {
      // Handle specialized document types with their dedicated functions
      if (type === "chart_accounts") {
        const chartData = customData || {
          businessType: businessProfile?.businessType || "General Business",
          complexityLevel: "standard",
          trackInventory: false,
          includeStatementMapping: true
        };
        const content = await this.generateChartOfAccounts(chartData);
        const title = this.generateDocumentTitle(type, businessProfile?.businessName);
        return { title, content };
      }

      if (type === "budget_template") {
        const expenseData = customData || {
          businessType: businessProfile?.businessType || "General Business",
          includeCategories: true,
          includeBudget: true,
          timeframe: "monthly"
        };
        const content = await this.generateExpenseTracker(expenseData);
        const title = this.generateDocumentTitle(type, businessProfile?.businessName);
        return { title, content };
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
        executive_summary: "Create an executive summary for business plan"
      };

      const prompt = documentPrompts[type as keyof typeof documentPrompts] || `Generate a ${type} document`;
      
      const businessContext = businessProfile ? 
        `Business Context: ${businessProfile.businessName} - ${businessProfile.businessType} in ${businessProfile.industry} (${businessProfile.state})` :
        "General business context";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a legal and business document expert. Generate professional, comprehensive documents for startups. Include proper formatting, required sections, and state-specific information where applicable. Always include disclaimers about legal review being recommended. ${businessContext}`
          },
          {
            role: "user",
            content: `${prompt}. Make it detailed, professional, and actionable. Include all necessary sections and provisions. ${customData ? `Additional requirements: ${JSON.stringify(customData)}` : ''}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || "Document generation failed";
      const title = this.generateDocumentTitle(type, businessProfile?.businessName);

      return { title, content };
    } catch (error) {
      console.error("Error generating document:", error);
      throw new Error("Failed to generate document: " + (error as Error).message);
    }
  }

  async getQuickHelp(question: string, context?: any): Promise<string> {
    try {
      const contextStr = context ? `Context: ${JSON.stringify(context)}` : '';
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are StartSmart AI. Provide quick, actionable answers to startup questions. Be concise but helpful. Use emojis to make responses engaging."
          },
          {
            role: "user",
            content: `${question}\n${contextStr}`
          }
        ],
        max_tokens: 300,
        temperature: 0.5,
      });

      return response.choices[0].message.content || "I couldn't provide help at this time. Please try again.";
    } catch (error) {
      console.error("Error getting quick help:", error);
      throw new Error("Failed to get AI assistance: " + (error as Error).message);
    }
  }

  async analyzeBusinessIdea(businessProfile: BusinessProfile): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Analyze the business idea and provide insights on market opportunity, competitive landscape, and recommendations. Respond in JSON format with sections for strengths, challenges, opportunities, and next_steps."
          },
          {
            role: "user",
            content: `Analyze this business: ${businessProfile.businessName} - ${businessProfile.description} in ${businessProfile.industry} (${businessProfile.state})`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
        temperature: 0.6,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error("Error analyzing business idea:", error);
      throw new Error("Failed to analyze business idea: " + (error as Error).message);
    }
  }

  async generateCorporateBylaws(bylawsData: any): Promise<string> {
    try {
      const officers = bylawsData.officers || [];
      const officersInfo = officers.join(', ');

      const prompt = `Generate comprehensive Corporate Bylaws based on the following information:

Corporation Name: ${bylawsData.corporation_name}
State of Incorporation: ${bylawsData.state_of_incorporation}
Principal Office Address: ${bylawsData.principal_office_address}

Shareholder Meeting Provisions:
- Annual Meeting: ${bylawsData.annual_meeting_month_day}
- Special Meeting Threshold: ${bylawsData.special_meeting_percent}% of shareholders can call special meetings
- Meeting Notice Period: ${bylawsData.shareholder_notice_days} days advance notice required

Board of Directors:
- Number of Directors: ${bylawsData.number_of_directors}
- Director Term Length: ${bylawsData.director_term_years} year(s)
- Board Meeting Frequency: ${bylawsData.board_meeting_frequency}

Officers and Administration:
- Officer Positions: ${officersInfo}
- Fiscal Year End: ${bylawsData.fiscal_year_end}
- Amendment Vote Threshold: ${bylawsData.amendment_vote_threshold}% shareholder approval required

Certification Details:
- Certification Date: ${bylawsData.certification_day} of ${bylawsData.certification_month_year}
- Certifying Secretary: ${bylawsData.secretary_name}

Please generate complete, professional Corporate Bylaws that include all standard provisions:

ARTICLE I - OFFICES
ARTICLE II - SHAREHOLDERS
ARTICLE III - BOARD OF DIRECTORS  
ARTICLE IV - OFFICERS
ARTICLE V - STOCK
ARTICLE VI - INDEMNIFICATION
ARTICLE VII - GENERAL PROVISIONS
ARTICLE VIII - AMENDMENTS

IMPORTANT FORMATTING REQUIREMENTS:
- Use plain text formatting only - NO markdown symbols like ** or ##
- Do NOT use bold markers (**text**) or any markdown formatting
- Use CAPITAL LETTERS for article headers and emphasis instead of markdown
- Use proper legal formatting with numbered articles and sections
- Include all specific details provided above
- Reference the correct state laws for ${bylawsData.state_of_incorporation}
- Include standard corporate governance provisions and procedures
- Format as a clean, professional legal document ready for Word/PDF conversion
- Include proper signature blocks and certification language

The document should be comprehensive, legally sound, and ready for corporate use with clean, plain text formatting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a corporate legal document specialist who creates professional Corporate Bylaws. Generate comprehensive, properly formatted legal documents using PLAIN TEXT ONLY - no markdown formatting, no ** symbols, no ## headers. Use CAPITAL LETTERS for article headers and emphasis. Follow standard corporate legal conventions and state requirements with clean, professional formatting suitable for Word/PDF conversion."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      });

      const generatedContent = response.choices[0].message.content || "Error generating corporate bylaws";
      
      // Add professional disclaimer for AI-generated legal documents
      const disclaimer = `

DISCLAIMER

This Corporate Bylaws document was generated using AI based on information provided by the user. It is intended for general informational and planning purposes only. This document does not constitute financial, legal, tax, or investment advice.

Users are strongly encouraged to consult with a certified accountant, attorney, or business advisor before making any financial or strategic decisions based on this document. NexTax.AI and its affiliates are not responsible for any decisions made based on the contents of this document.`;

      return generatedContent + disclaimer;
    } catch (error) {
      console.error("Error generating corporate bylaws:", error);
      throw new Error("Failed to generate corporate bylaws");
    }
  }

  async generateArticlesOfIncorporation(articlesData: any): Promise<string> {
    try {
      const directors = articlesData.directors || [];
      const directorsInfo = directors.map((director: any, index: number) => 
        `Director ${index + 1}: ${director.name}, ${director.street_address}, ${director.city}, ${director.state} ${director.zip_code}`
      ).join('\n');

      const prompt = `Generate comprehensive Articles of Incorporation based on the following information:

Corporation Name: ${articlesData.corporation_name}
State of Incorporation: ${articlesData.state_of_incorporation}
Duration: ${articlesData.duration}
Business Purpose: ${articlesData.purpose}

Registered Agent: ${articlesData.registered_agent.name}
Registered Office: ${articlesData.registered_agent.street_address}, ${articlesData.registered_agent.city}, ${articlesData.registered_agent.state} ${articlesData.registered_agent.zip_code}

${articlesData.principal_office.street_address ? `Principal Office: ${articlesData.principal_office.street_address}, ${articlesData.principal_office.city}, ${articlesData.principal_office.state} ${articlesData.principal_office.zip_code}` : ''}

Authorized Shares: ${articlesData.authorized_shares.number_of_shares} shares of ${articlesData.authorized_shares.class} with par value of $${articlesData.authorized_shares.par_value} per share

Incorporator: ${articlesData.incorporator.name}
Incorporator Address: ${articlesData.incorporator.street_address}, ${articlesData.incorporator.city}, ${articlesData.incorporator.state} ${articlesData.incorporator.zip_code}

${directors.length > 0 ? `Initial Directors:\n${directorsInfo}` : 'Initial Directors: Not specified'}

Legal Provisions:
- Limitation of liability for directors: ${articlesData.limitation_of_liability ? 'Included' : 'Not included'}
- Indemnification for officers and directors: ${articlesData.indemnification ? 'Included' : 'Not included'}

${articlesData.additional_provisions ? `Additional Provisions: ${articlesData.additional_provisions}` : ''}

Execution Date: ${articlesData.execution_date}
Execution Month/Year: ${articlesData.execution_month_year}

${articlesData.notarization_required ? `Notarization Required: Yes\nNotary: ${articlesData.notary_details.notary_name}\nCounty: ${articlesData.notary_details.county}` : 'Notarization Required: No'}

Please generate complete, professional Articles of Incorporation that include all standard provisions:
1. Corporate Name and Purpose
2. Duration
3. Registered Office and Agent
4. Authorized Capital Stock
5. Incorporator Information
6. Initial Directors (if provided)
7. Legal Provisions and Limitations
8. Execution and Filing Requirements

IMPORTANT FORMATTING REQUIREMENTS:
- Use plain text formatting only - NO markdown symbols like ** or ##
- Do NOT use bold markers (**text**) or any markdown formatting
- Use CAPITAL LETTERS for article headers and emphasis instead of markdown
- Use proper legal formatting with numbered articles and sections
- Include specific details provided above
- Reference the correct state laws for ${articlesData.state_of_incorporation}
- Include standard corporate legal clauses and protections
- Format as a clean, professional legal document ready for Word/PDF conversion

The document should be ready for state filing and attorney review with clean, plain text formatting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a corporate legal document specialist who creates professional Articles of Incorporation. Generate comprehensive, properly formatted legal documents using PLAIN TEXT ONLY - no markdown formatting, no ** symbols, no ## headers. Use CAPITAL LETTERS for article headers and emphasis. Follow standard corporate legal conventions and state requirements with clean, professional formatting suitable for Word/PDF conversion."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      });

      const generatedContent = response.choices[0].message.content || "Error generating articles of incorporation";
      
      // Add professional disclaimer for AI-generated legal documents
      const disclaimer = `

DISCLAIMER

This Articles of Incorporation document was generated using AI based on information provided by the user. It is intended for general informational and planning purposes only. This document does not constitute financial, legal, tax, or investment advice.

Users are strongly encouraged to consult with a certified accountant, attorney, or business advisor before making any financial or strategic decisions based on this document. NexTax.AI and its affiliates are not responsible for any decisions made based on the contents of this document.`;

      return generatedContent + disclaimer;
    } catch (error) {
      console.error("Error generating articles of incorporation:", error);
      throw new Error("Failed to generate articles of incorporation");
    }
  }

  async generateOperatingAgreement(agreementData: any): Promise<string> {
    try {
      const members = agreementData.members || [];
      const membersInfo = members.map((member: any, index: number) => 
        `Member ${index + 1}: ${member.name}, ${member.ownership_percentage}% ownership, $${member.capital_contribution} contribution`
      ).join('\n');

      const prompt = `Generate a comprehensive LLC Operating Agreement based on the following information:

LLC Name: ${agreementData.llc_name}
State of Formation: ${agreementData.state_of_formation}
Formation Date: ${agreementData.formation_date}
Agreement Date: ${agreementData.agreement_date}
Registered Office: ${agreementData.registered_office_address}
Registered Agent: ${agreementData.registered_agent_name}
Management Structure: ${agreementData.management_structure}
Tax Election: ${agreementData.tax_election}
Financial Institution: ${agreementData.financial_institution || 'To be determined'}
Valuation Method: ${agreementData.valuation_method}
Dissolution Terms: ${agreementData.dissolution_terms}

Members:
${membersInfo}

Authorized Signatories: ${agreementData.authorized_signatories?.join(', ') || 'To be determined'}

Please generate a complete, professional LLC Operating Agreement that includes all standard provisions:
1. Formation and Purpose
2. Members and Membership Interests
3. Capital Contributions
4. Management Structure
5. Distributions and Allocations
6. Transfer Restrictions
7. Books and Records
8. Tax Matters
9. Dissolution
10. General Provisions

IMPORTANT FORMATTING REQUIREMENTS:
- Use plain text formatting only - NO markdown symbols like ** or ##
- Do NOT use bold markers (**text**) or any markdown formatting
- Use CAPITAL LETTERS for section headers and emphasis instead of markdown
- Use proper legal formatting with numbered sections and subsections
- Include specific percentages, amounts, and names provided
- Reference the correct state laws for ${agreementData.state_of_formation}
- Include standard legal clauses and protections
- Format as a clean, professional legal document ready for Word/PDF conversion

The document should be ready for attorney review and execution with clean, plain text formatting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a legal document specialist who creates professional LLC Operating Agreements. Generate comprehensive, properly formatted legal documents using PLAIN TEXT ONLY - no markdown formatting, no ** symbols, no ## headers. Use CAPITAL LETTERS for section headers and emphasis. Follow standard legal conventions and state requirements with clean, professional formatting suitable for Word/PDF conversion."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      });

      const generatedContent = response.choices[0].message.content || "Error generating operating agreement";
      
      // Add professional disclaimer for AI-generated legal documents
      const disclaimer = `

DISCLAIMER

This Operating Agreement document was generated using AI based on information provided by the user. It is intended for general informational and planning purposes only. This document does not constitute financial, legal, tax, or investment advice.

Users are strongly encouraged to consult with a certified accountant, attorney, or business advisor before making any financial or strategic decisions based on this document. NexTax.AI and its affiliates are not responsible for any decisions made based on the contents of this document.`;

      return generatedContent + disclaimer;
    } catch (error) {
      console.error("Error generating operating agreement:", error);
      throw new Error("Failed to generate operating agreement");
    }
  }

  async generateExecutiveSummary(summaryData: any): Promise<string> {
    try {
      const prompt = `Create a compelling, investor-ready Executive Summary based on the following company information. Write in a professional, engaging tone that captures the company's strengths, market opportunity, and investment potential. Use plain text format without markdown:

Company Information:
- Company: ${summaryData.companyName}
- Industry: ${summaryData.industry}
- Location: ${summaryData.location}
- Founded: ${summaryData.foundingYear}
- Mission: ${summaryData.missionStatement}

Problem & Solution:
- Problem: ${summaryData.coreProblem}
- Solution: ${summaryData.solutionDescription}
- Differentiators: ${summaryData.keyDifferentiators?.filter((d: string) => d.trim()).join(', ')}

Market Opportunity:
- Target Market: ${summaryData.targetMarket}
- Market Size: ${summaryData.marketSize}
- Growth Rate: ${summaryData.growthRate || 'Not specified'}

Business Model:
- Revenue Model: ${summaryData.businessModel}
- Pricing Strategy: ${summaryData.pricingStrategy}
- Revenue Streams: ${summaryData.revenueStreams?.filter((s: string) => s.trim()).join(', ')}

Competitive Landscape:
- Competitive Advantages: ${summaryData.competitiveAdvantages?.filter((a: string) => a.trim()).join(', ')}
- Key Competitors: ${summaryData.keyCompetitors?.filter((c: string) => c.trim()).join(', ')}

Traction & Milestones:
${summaryData.tractionMilestones?.filter((m: string) => m.trim()).map((m: string) => `- ${m}`).join('\n')}

Financial Information:
- Current Revenue: ${summaryData.financials?.currentRevenue || 'Not disclosed'}
- Projected Revenue: ${summaryData.financials?.projectedRevenue || 'Not specified'}
- Funding Raised: ${summaryData.financials?.fundingRaised || 'None'}
- Funding Sought: ${summaryData.financials?.fundingSought || 'Not specified'}
- Use of Funds: ${summaryData.financials?.fundUse || 'Not specified'}

Team:
${summaryData.team?.filter((member: any) => member.name && member.title).map((member: any) => `- ${member.name}, ${member.title}: ${member.background}`).join('\n')}

Call to Action: ${summaryData.callToAction}
Contact: ${summaryData.contactEmail}

Please create a professional Executive Summary that follows this structure:
1. Company Overview (compelling opening paragraph)
2. Problem Statement (market need and pain points)
3. Solution (product/service description and value proposition)
4. Market Opportunity (addressable market and growth potential)
5. Business Model (revenue generation and pricing)
6. Competitive Advantage (differentiation and positioning)
7. Traction & Milestones (achievements and proof points)
8. Financial Snapshot (revenue, funding, and projections)
9. Team (key personnel and expertise)
10. Call to Action (investment ask and next steps)

Write in a confident, data-driven tone that emphasizes the opportunity and potential. Make it compelling for investors while being factual and specific. Use the exact company information provided and weave it into a cohesive narrative.

IMPORTANT FORMATTING REQUIREMENTS:
- Use plain text formatting only - NO markdown symbols like ** or ##
- Do NOT use bold markers (**text**) or any markdown formatting
- Use CAPITAL LETTERS for section headers instead of markdown
- Use proper business document formatting with clear sections
- Include specific details provided above
- Format as a clean, professional business document ready for Word/PDF conversion

The document should be ready for investor presentations and business use with clean, plain text formatting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a business writing expert that creates compelling executive summaries for startups. Generate professional, investor-ready documents that effectively communicate business opportunity and potential using PLAIN TEXT ONLY - no markdown formatting, no ** symbols, no ## headers. Use CAPITAL LETTERS for section headers and emphasis. Follow standard business document conventions with clean, professional formatting suitable for Word/PDF conversion."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.4
      });

      const generatedContent = response.choices[0].message.content || "Error generating executive summary";
      
      // Add professional disclaimer for AI-generated business documents
      const disclaimer = `

DISCLAIMER

This Executive Summary was generated using AI based on information provided by the user. It is intended for general informational and planning purposes only. This document does not constitute financial, legal, tax, or investment advice.

Users are strongly encouraged to consult with a certified accountant, attorney, or business advisor before making any financial or strategic decisions based on this plan. NexTax.AI and its affiliates are not responsible for any decisions made based on the contents of this document.`;

      return generatedContent + disclaimer;
    } catch (error) {
      console.error("Error generating executive summary:", error);
      throw new Error("Failed to generate executive summary");
    }
  }

  async generateBusinessPlan(planData: any): Promise<string> {
    try {
      const prompt = `Create a comprehensive, professional Business Plan based on the following detailed company information. Write in a structured, investor-ready format that thoroughly covers all aspects of the business. Use plain text format without markdown:

COMPANY OVERVIEW:
- Company: ${planData.company_name}
- Industry: ${planData.industry}
- Location: ${planData.location}
- Plan Date: ${planData.plan_date}
- Business Structure: ${planData.business_structure}
- Mission: ${planData.mission_statement}
- Vision: ${planData.vision_statement}
- Founding Story: ${planData.founding_story}

CORE VALUES & OBJECTIVES:
- Core Values: ${planData.core_values?.filter((v: string) => v.trim()).join(', ')}
- Key Objectives: ${planData.key_objectives?.filter((o: string) => o.trim()).join(', ')}

INDUSTRY ANALYSIS:
- Industry Overview: ${planData.industry_overview}

MARKET ANALYSIS:
- Target Market: ${planData.target_market}
- Demographics: ${planData.demographics}
- Geographic Details: ${planData.geographics || 'Not specified'}
- Psychographics: ${planData.psychographics || 'Not specified'}
- Market Needs: ${planData.market_needs}
- Market Share Goal: ${planData.market_share_goal}
- Competitive Landscape: ${planData.competitive_landscape?.filter((c: string) => c.trim()).join(', ')}

PRODUCTS & SERVICES:
- Product/Service Description: ${planData.product_description}
- Key Features: ${planData.key_features?.filter((f: string) => f.trim()).join(', ')}
- Product Benefits: ${planData.product_benefits}
- Unique Selling Proposition: ${planData.unique_selling_proposition}
- Development Stage: ${planData.development_stage}
- Future Offerings: ${planData.future_offerings?.filter((o: string) => o.trim()).join(', ')}

MARKETING & SALES:
- Market Positioning: ${planData.positioning}
- Marketing Channels: ${planData.marketing_channels?.filter((c: string) => c.trim()).join(', ')}
- Sales Strategy: ${planData.sales_strategy}
- Customer Acquisition Cost: ${planData.customer_acquisition_cost || 'Not specified'}
- Retention Strategy: ${planData.retention_strategy}
- Sales Metrics: ${planData.sales_metrics?.filter((m: string) => m.trim()).join(', ')}

BUSINESS MODEL:
- Revenue Streams: ${planData.revenue_streams?.filter((r: string) => r.trim()).join(', ')}
- Pricing Strategy: ${planData.pricing_strategy}
- Cost Structure: ${planData.cost_structure || 'Not specified'}
- Scalability: ${planData.scalability || 'Not specified'}

COMPETITIVE ANALYSIS:
- Competitor Analysis: ${planData.competitor_analysis?.filter((c: string) => c.trim()).join(' | ')}
- Barriers to Entry: ${planData.barriers_to_entry?.filter((b: string) => b.trim()).join(', ')}

OPERATIONS:
- Operations Location: ${planData.operations_location}
- Facilities & Technology: ${planData.facilities_technology}
- Team Structure: ${planData.team_structure || 'Not specified'}
- Key Processes: ${planData.key_processes?.filter((p: string) => p.trim()).join(', ')}
- Suppliers & Partners: ${planData.suppliers_partners?.filter((p: string) => p.trim()).join(', ')}

MILESTONES:
${planData.milestones?.filter((m: string) => m.trim()).map((m: string) => `- ${m}`).join('\n')}

MANAGEMENT TEAM:
${planData.management_team?.filter((member: any) => member.name && member.title).map((member: any) => `- ${member.name}, ${member.title}: ${member.background}`).join('\n')}

ADVISORS:
${planData.advisors?.filter((a: string) => a.trim()).map((a: string) => `- ${a}`).join('\n')}

HIRING PLAN:
${planData.hiring_plan || 'Not specified'}

FINANCIAL PROJECTIONS:
- Year 1 Revenue: ${planData.revenue_projections?.year_1 || 'Not specified'}
- Year 3 Revenue: ${planData.revenue_projections?.year_3 || 'Not specified'}
- Major Expenses: ${planData.expenses?.filter((e: string) => e.trim()).join(', ')}
- Break-Even Point: ${planData.break_even_point}

FUNDING:
- Funding Required: ${planData.funding_required}
- Fund Use: ${planData.fund_use?.filter((f: string) => f.trim()).join(', ')}

FINANCIAL ASSUMPTIONS:
${planData.financial_assumptions?.filter((a: string) => a.trim()).map((a: string) => `- ${a}`).join('\n')}

EXIT STRATEGY:
- Exit Strategy: ${planData.exit_strategy}
- Investor ROI: ${planData.investor_roi}

APPENDICES:
${planData.appendices?.filter((a: string) => a.trim()).map((a: string) => `- ${a}`).join('\n')}

Please create a comprehensive Business Plan that follows this structure:
1. EXECUTIVE SUMMARY
2. COMPANY DESCRIPTION
3. MARKET ANALYSIS
4. ORGANIZATION & MANAGEMENT
5. PRODUCTS OR SERVICES
6. MARKETING & SALES STRATEGY
7. FUNDING REQUEST
8. FINANCIAL PROJECTIONS
9. COMPETITIVE ANALYSIS
10. OPERATIONS PLAN
11. MILESTONES & TIMELINE
12. EXIT STRATEGY
13. APPENDICES

Write in a professional, detailed, and investor-ready tone that demonstrates deep understanding of the business opportunity. Include specific data points, strategic insights, and actionable information. Make it compelling for investors, partners, and stakeholders while being comprehensive and thorough.

IMPORTANT FORMATTING REQUIREMENTS:
- Use plain text formatting only - NO markdown symbols like ** or ##
- Do NOT use bold markers (**text**) or any markdown formatting
- Use CAPITAL LETTERS for section headers instead of markdown
- Use proper business document formatting with clear sections and subsections
- Include specific details and data provided above
- Format as a clean, professional business document ready for Word/PDF conversion
- Create a detailed, comprehensive plan that covers all aspects thoroughly

The document should be ready for investor presentations, bank loan applications, and strategic business use with clean, plain text formatting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a business strategy consultant and plan writer who creates comprehensive, investor-ready business plans. Generate detailed, professionally structured business documents that effectively communicate business opportunity, strategy, and financial potential using PLAIN TEXT ONLY - no markdown formatting, no ** symbols, no ## headers. Use CAPITAL LETTERS for section headers and emphasis. Follow standard business plan conventions with clean, professional formatting suitable for Word/PDF conversion."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      });

      const generatedContent = response.choices[0].message.content || "Error generating business plan";
      
      // Add professional disclaimer for AI-generated business documents
      const disclaimer = `

DISCLAIMER

This Business Plan was generated using AI based on information provided by the user. It is intended for general informational and planning purposes only. This document does not constitute financial, legal, tax, or investment advice.

Users are strongly encouraged to consult with a certified accountant, attorney, or business advisor before making any financial or strategic decisions based on this plan. NexTax.AI and its affiliates are not responsible for any decisions made based on the contents of this document.`;

      return generatedContent + disclaimer;
    } catch (error) {
      console.error("Error generating business plan:", error);
      throw new Error("Failed to generate business plan");
    }
  }

  async generateExpenseTracker(trackerData: any): Promise<string> {
    const { 
      businessType, 
      expenseCategories = [], 
      includeBudgetTargets = false, 
      trackPaymentMethods = false, 
      monthlySummaries = false,
      customCategories = ""
    } = trackerData;

    // Parse custom categories
    const additionalCategories = customCategories 
      ? customCategories.split(',').map((cat: string) => cat.trim()).filter(Boolean)
      : [];

    const allCategories = [...expenseCategories, ...additionalCategories];

    const prompt = `Generate an Excel-formatted expense tracker for a ${businessType} business with the following specifications:

BUSINESS TYPE: ${businessType}
EXPENSE CATEGORIES: ${allCategories.join(', ')}
INCLUDE BUDGET TARGETS: ${includeBudgetTargets ? 'Yes' : 'No'}
TRACK PAYMENT METHODS: ${trackPaymentMethods ? 'Yes' : 'No'}
MONTHLY SUMMARIES: ${monthlySummaries ? 'Yes' : 'No'}

Create a comprehensive expense tracking spreadsheet with these requirements:

1. HEADER ROW with these columns (adjust based on options):
   - Date
   - Description
   - Category (dropdown list)
   - Amount
   ${trackPaymentMethods ? '- Payment Method (Cash/Credit Card/Check/Bank Transfer)' : ''}
   ${includeBudgetTargets ? '- Budget Target' : ''}
   - Notes

2. PRE-POPULATED CATEGORIES:
   ${allCategories.map(cat => `- ${cat}`).join('\n   ')}

3. SAMPLE ENTRIES (5-10 realistic examples for ${businessType}):
   - Include realistic expenses for this business type
   - Use appropriate amounts for the industry
   - Demonstrate category usage

${includeBudgetTargets ? `
4. BUDGET TARGETS:
   Suggest realistic monthly budget amounts for each category based on ${businessType} industry standards:
   ${allCategories.map(cat => `- ${cat}: [suggest amount]`).join('\n   ')}
` : ''}

${monthlySummaries ? `
5. MONTHLY SUMMARY SECTION:
   Include formulas to calculate:
   - Total expenses by category
   - Monthly totals
   - Budget vs actual comparison (if budgets enabled)
   - Percentage of budget used
` : ''}

6. PROFESSIONAL FORMATTING:
   - Bold headers
   - Proper column widths
   - Currency formatting for amounts
   - Date formatting
   - Conditional formatting for over-budget items (if applicable)

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
2025-01-02      Software license        Software        99.00   Bank Transfer`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { 
            role: "system", 
            content: "You are an expert business expense tracking specialist. Generate professional, industry-specific expense trackers in TSV format. CRITICAL: Return ONLY the TSV data with no markdown formatting, no code blocks, no explanations. Start directly with the header row." 
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      return response.choices[0].message.content || "Error generating expense tracker";
    } catch (error) {
      console.error("Error generating expense tracker:", error);
      throw new Error("Failed to generate expense tracker");
    }
  }

  async generateChartOfAccounts(chartData: any): Promise<string> {
    try {
      const prompt = `Create a comprehensive Chart of Accounts for a ${chartData.businessType} business with ${chartData.complexityLevel} complexity level.

BUSINESS DETAILS:
- Business Type: ${chartData.businessType}
- Complexity Level: ${chartData.complexityLevel}
- Track Inventory: ${chartData.trackInventory ? 'Yes' : 'No'}
- Include Statement Mapping: ${chartData.includeStatementMapping ? 'Yes' : 'No'}
- Additional Requirements: ${chartData.additionalRequirements || 'None specified'}

Please create a detailed Chart of Accounts that includes:
1. Account Number (sequential numbering system)
2. Account Name
3. Account Type (Asset, Liability, Equity, Income, Expense)
${chartData.includeStatementMapping ? '4. Financial Statement (Balance Sheet, Income Statement, Cash Flow)' : ''}

REQUIREMENTS:
${chartData.complexityLevel === 'basic' ? '- Include essential accounts (20-30 accounts)' : ''}
${chartData.complexityLevel === 'standard' ? '- Include comprehensive accounts (40-60 accounts)' : ''}
${chartData.complexityLevel === 'advanced' ? '- Include detailed accounts with sub-accounts (80+ accounts)' : ''}
${chartData.trackInventory ? '- Include inventory-related accounts (Raw Materials, Work in Progress, Finished Goods, COGS)' : '- Exclude inventory accounts (service-based business)'}

INDUSTRY-SPECIFIC CUSTOMIZATIONS:
${this.getIndustrySpecificAccounts(chartData.businessType)}

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

The chart should follow GAAP accounting principles and be suitable for small to medium businesses.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a certified public accountant (CPA) and financial systems expert who creates comprehensive, GAAP-compliant charts of accounts for businesses. Generate detailed, industry-specific account structures in TSV format. CRITICAL: Return ONLY the TSV data with no markdown formatting, no code blocks, no explanations. Start directly with the header row."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.1
      });

      const generatedContent = response.choices[0].message.content || "Error generating chart of accounts";
      
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

For professional assistance with your Chart of Accounts setup, contact NexTax.AI at info@nextax.ai`;

      return generatedContent + disclaimer;
    } catch (error) {
      console.error("Error generating chart of accounts:", error);
      throw new Error("Failed to generate chart of accounts");
    }
  }

  private getIndustrySpecificAccounts(businessType: string): string {
    const industryMappings: { [key: string]: string } = {
      "Retail Store": "- Include Inventory, Cost of Goods Sold, Sales Tax accounts\n- Add Point of Sale fees, Returns and Allowances, Shrinkage accounts",
      "SaaS/Software": "- Include Subscription Revenue, Recurring Revenue, Customer Acquisition Cost\n- Add Software Development costs, Hosting fees, API costs",
      "Consulting Services": "- Include Professional Services Revenue, Billable Hours, Project costs\n- Add Travel and Entertainment, Professional Development, Contractor payments",
      "Restaurant/Food Service": "- Include Food and Beverage Sales, Cost of Goods Sold, Inventory\n- Add Kitchen Equipment, Liquor License fees, Health Department fees",
      "Manufacturing": "- Include Raw Materials, Work in Progress, Finished Goods, Direct Labor\n- Add Manufacturing Overhead, Equipment Depreciation, Quality Control costs",
      "E-commerce": "- Include Online Sales, Shipping Revenue, Returns and Refunds\n- Add Platform fees (Amazon, Shopify), Payment processing, Digital Marketing",
      "Healthcare Services": "- Include Patient Revenue, Insurance Receivables, Medical Supplies\n- Add Professional Liability Insurance, Medical Equipment, Continuing Education",
      "Real Estate": "- Include Commission Income, Property Management fees, Rental Income\n- Add MLS fees, Professional Licenses, Property Maintenance costs",
      "Construction": "- Include Contract Revenue, Job Costs, Equipment costs\n- Add Materials, Subcontractor costs, Equipment Depreciation, Permits",
      "Professional Services (Legal, Accounting, etc.)": "- Include Professional Fees, Billable Hours, Retainer Income\n- Add Professional Liability Insurance, Continuing Education, Bar/License fees",
      "Non-profit Organization": "- Include Donations, Grants, Program Revenue, Fundraising Income\n- Add Program Expenses, Administrative costs, Fundraising expenses, Restricted funds"
    };

    return industryMappings[businessType] || "- Include standard business accounts appropriate for your industry\n- Customize account names to match your business operations";
  }

  async generateLeanCanvas(canvasData: any): Promise<string> {
    try {
      const prompt = `Create a comprehensive Lean Canvas business model document based on the following information:

Problem: ${canvasData.problem}
Customer Segments: ${canvasData.customerSegments}
Unique Value Proposition: ${canvasData.uniqueValueProposition}
Solution: ${canvasData.solution}
Channels: ${canvasData.channels}
Revenue Streams: ${canvasData.revenueStreams}
Cost Structure: ${canvasData.costStructure}
Key Metrics: ${canvasData.keyMetrics}
Unfair Advantage: ${canvasData.unfairAdvantage}

Generate a professional Lean Canvas document that:
1. Clearly presents each of the 9 blocks with proper headings
2. Expands on each section with strategic insights and analysis
3. Provides actionable recommendations for each block
4. Includes market validation suggestions
5. Offers next steps for business development

Format the output as a structured document with clear headings and bullet points. Do not use any markdown formatting - return plain text only.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a startup business strategist and Lean Canvas expert who helps entrepreneurs validate and structure their business models. Create comprehensive, actionable business model canvases that provide strategic insights beyond just filling in the blanks."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.3
      });

      const generatedContent = response.choices[0].message.content || "Error generating Lean Canvas";
      
      // Add professional disclaimer for AI-generated business documents
      const disclaimer = `

DISCLAIMER
This Lean Canvas is AI-generated for informational and strategic planning purposes only and should not be considered as professional business advice. Before implementing this business model:

1. Validate your assumptions with real customer research and market testing
2. Consult with business advisors, mentors, or industry experts in your field
3. Conduct thorough market analysis and competitive research
4. Test your value proposition with target customers before major investments
5. Consider legal, financial, and regulatory requirements for your specific business

NexTax.AI and this AI-generated content do not constitute professional business, legal, or financial advice. Always validate your business model with real market data and consult with qualified professionals for your specific business needs.

For professional assistance with business planning and strategy, contact NexTax.AI at info@nextax.ai`;

      return generatedContent + disclaimer;
    } catch (error) {
      console.error("Error generating Lean Canvas:", error);
      throw new Error("Failed to generate Lean Canvas");
    }
  }

  private generateDocumentTitle(type: string, businessName?: string): string {
    const titles = {
      operating_agreement: `${businessName || 'Business'} Operating Agreement`,
      business_plan: `${businessName || 'Business'} Plan`,
      ss4_form: 'EIN Application Guide',
      pitch_deck: `${businessName || 'Business'} Pitch Deck`,
      lean_canvas: `${businessName || 'Business'} Lean Canvas`,
      budget_template: `${businessName || 'Business'} Budget Template`,
      articles_incorporation: `${businessName || 'Business'} Articles of Incorporation`,
      bylaws: `${businessName || 'Business'} Corporate Bylaws`,
      chart_accounts: `${businessName || 'Business'} Chart of Accounts`,
      executive_summary: `${businessName || 'Business'} Executive Summary`
    };

    return titles[type as keyof typeof titles] || `${businessName || 'Business'} Document`;
  }
}

export const openaiService = new OpenAIService();
