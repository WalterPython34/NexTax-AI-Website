import OpenAI from "openai";
import type { Message, BusinessProfile } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR 
});

export class OpenAIService {
  async generateChatResponse(messages: Message[]): Promise<{
    content: string;
    metadata?: any;
  }> {
    try {
      const systemPrompt = `You are StartSmartGPT, an AI assistant specialized in helping entrepreneurs start and grow their businesses. You provide intelligent, real-time assistance across key startup areas including:

- Business Planning: Executive summaries, pitch decks, lean startup canvases
- Legal & Compliance: Entity types, filing requirements, EIN/SS-4 guidance  
- Financial Planning: Budgeting templates, pricing models, cash flow forecasts
- Market Research: Competitor analysis, customer avatars, validation strategies
- Brand Development: Business names, taglines, domain vetting
- Startup Roadmapping: Step-by-step launch guidance based on industry and goals

You are personable, insightful, and strive to inspire and support entrepreneurs. Break down complex topics into simple, actionable steps. Always provide specific, practical solutions with step-by-step checklists when possible.

Current capabilities you should highlight:
- State-specific guidance for all 50 states
- Document generation for legal and financial needs
- Real-time compliance and deadline tracking
- Integration with authoritative resources (IRS, SBA, state portals)`;

      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }))
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        max_tokens: 500, // Reduced for faster responses
        temperature: 0.7,
        stream: false, // Ensure we get complete response
      });

      return {
        content: response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try again.",
        metadata: {
          model: "gpt-4o",
          tokens: response.usage?.total_tokens
        }
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error("Failed to generate AI response");
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

  async initializeProgressTasks(userId: string, businessProfileId: string): Promise<void> {
    // This would typically create default progress tasks based on business type
    // For now, we'll return without creating tasks as they would be created in the database
    // In a real implementation, you would use the storage service to create initial tasks
    console.log(`Initializing progress tasks for user ${userId}, business ${businessProfileId}`);
  }

  async generateDocument(
    type: string, 
    businessProfile?: BusinessProfile | null, 
    customData?: any
  ): Promise<{ title: string; content: string }> {
    try {
      const documentPrompts = {
        operating_agreement: "Generate a comprehensive LLC Operating Agreement",
        business_plan: "Create a detailed business plan with executive summary",
        ss4_form: "Generate guidance for completing IRS Form SS-4 (EIN application)",
        pitch_deck: "Create a startup pitch deck outline with key slides",
        lean_canvas: "Generate a Lean Canvas business model template",
        budget_template: "Create a comprehensive startup budget template"
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
            content: `You are a legal and business document expert. Generate professional, comprehensive documents for startups. ${businessContext}`
          },
          {
            role: "user",
            content: `${prompt}. Make it detailed, professional, and actionable.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || "Document generation failed";
      const title = this.generateDocumentTitle(type, businessProfile?.businessName || undefined);

      return { title, content };
    } catch (error) {
      console.error("Error generating document:", error);
      throw new Error("Failed to generate document");
    }
  }

  async getQuickHelp(question: string, context?: any): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are StartSmartGPT. Provide quick, actionable answers to startup questions. Be concise but helpful."
          },
          {
            role: "user",
            content: `${question}${context ? `\nContext: ${JSON.stringify(context)}` : ''}`
          }
        ],
        max_tokens: 300,
        temperature: 0.5,
      });

      return response.choices[0].message.content || "I couldn't provide help at this time. Please try again.";
    } catch (error) {
      console.error("Error getting quick help:", error);
      throw new Error("Failed to get AI assistance");
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
      throw new Error("Failed to analyze business idea");
    }
  }

  private generateDocumentTitle(type: string, businessName?: string): string {
    const titles = {
      operating_agreement: `${businessName || 'Business'} Operating Agreement`,
      business_plan: `${businessName || 'Business'} Plan`,
      ss4_form: 'EIN Application Guide',
      pitch_deck: `${businessName || 'Business'} Pitch Deck`,
      lean_canvas: `${businessName || 'Business'} Lean Canvas`,
      budget_template: `${businessName || 'Business'} Budget Template`
    };

    return titles[type as keyof typeof titles] || `${businessName || 'Business'} Document`;
  }
}

export const openaiService = new OpenAIService();
