interface Message {
  role: "user" | "assistant"
  content: string
}

export async function getBusinessAdvice(question: string, previousMessages: Message[] = []): Promise<string> {
  // Analyze the question and provide relevant advice
  const lowerQuestion = question.toLowerCase()

  // LLC-related questions
  if (lowerQuestion.includes("llc") || lowerQuestion.includes("limited liability")) {
    if (lowerQuestion.includes("benefit") || lowerQuestion.includes("advantage")) {
      return `Here are the key benefits of forming an LLC:

• **Limited liability protection** - Your personal assets are protected from business debts
• **Tax flexibility** - Choose how you want to be taxed (sole proprietorship, partnership, S-Corp, or C-Corp)
• **Simple management structure** - No board of directors or complex corporate formalities required
• **Credibility** - Professional appearance to customers and vendors
• **Easier access to business credit** - Banks prefer lending to established entities

The main advantage is that an LLC combines the liability protection of a corporation with the tax flexibility and operational simplicity of a partnership. This makes it an excellent choice for most small businesses.

Would you like me to explain the LLC formation process or discuss specific aspects like taxation options?`
    }

    if (lowerQuestion.includes("form") || lowerQuestion.includes("start") || lowerQuestion.includes("create")) {
      return `Here's the step-by-step process to form an LLC:

1. **Choose a unique business name** - Must include "LLC" and be available in your state
2. **File Articles of Organization** - Submit to your state's Secretary of State office
3. **Create an Operating Agreement** - Outlines how your LLC will be managed
4. **Get an EIN from the IRS** - Required for tax purposes and opening business accounts
5. **Open a business bank account** - Keep business and personal finances separate
6. **Get required licenses and permits** - Varies by business type and location

**Estimated costs:** Typically $50-$500 depending on your state, plus registered agent fees if needed

**Timeline:** Most states process LLC filings within 1-2 weeks, though you can often pay for expedited processing.

The most important step is creating a comprehensive Operating Agreement, even if your state doesn't require one. This document outlines how your LLC will be managed and can prevent disputes later.

Would you like me to elaborate on any of these steps?`
    }

    return `LLCs (Limited Liability Companies) are one of the most popular business structures for small businesses. They offer liability protection while maintaining operational flexibility.

Key points about LLCs:
• Protect your personal assets from business debts
• Choose how you want to be taxed (sole proprietorship, partnership, S-corp, or C-corp)
• Simpler compliance requirements than corporations
• Can have one or multiple owners (called "members")

What specific aspect of LLCs would you like to know more about?`
  }

  // Corporation questions
  if (
    lowerQuestion.includes("corporation") ||
    lowerQuestion.includes("incorporate") ||
    lowerQuestion.includes("c-corp") ||
    lowerQuestion.includes("s-corp")
  ) {
    return `Corporations offer the strongest liability protection and are ideal for businesses planning to raise capital or go public.

**Types of Corporations:**
• **C-Corporation:** Standard corporation with double taxation but maximum flexibility
• **S-Corporation:** Pass-through taxation but restrictions on ownership

**Key Benefits:**
• Strong liability protection for owners
• Easier to raise capital through stock sales
• Perpetual existence (continues even if owners change)
• Tax advantages for certain situations
• Enhanced credibility with customers and investors

**Formation Process:**
1. Choose a corporate name
2. File Articles of Incorporation with your state
3. Create corporate bylaws
4. Hold initial board meeting
5. Issue stock certificates
6. Get EIN and open business accounts

Corporations require more ongoing compliance (annual meetings, board resolutions, detailed record-keeping) but offer the most protection and growth potential.

Are you considering a C-Corp or S-Corp election? I can explain the differences in detail.`
  }

  // Tax-related questions
  if (lowerQuestion.includes("tax") || lowerQuestion.includes("deduction") || lowerQuestion.includes("irs")) {
    if (lowerQuestion.includes("deduction") || lowerQuestion.includes("write off")) {
      return `Here are the most common business tax deductions:

**Fully Deductible:**
• Home office expenses (if you work from home)
• Office supplies and equipment
• Professional development and training
• Marketing and advertising costs
• Professional services (legal, accounting)
• Business insurance premiums
• Travel expenses for business
• Software and subscriptions

**Partially Deductible:**
• Business meals (50% deductible)

**Important Notes:**
• Keep detailed records and receipts for all deductions
• Expenses must be "ordinary and necessary" for your business
• Home office deduction requires exclusive business use of the space
• Vehicle expenses can be deducted using actual costs or standard mileage rate

**Record Keeping Tips:**
• Keep all business receipts
• Maintain separate business bank accounts
• Track mileage for business travel
• Document business meals and entertainment
• Keep records for at least 3-7 years

Would you like me to explain any specific deduction in more detail?`
    }

    if (lowerQuestion.includes("quarterly") || lowerQuestion.includes("estimated")) {
      return `**Quarterly Estimated Tax Payments:**

• Estimated taxes are due quarterly if you expect to owe $1,000+ in taxes
• Due dates: April 15, June 15, September 15, January 15
• Use Form 1040ES for calculations
• Pay online through EFTPS or IRS Direct Pay

**Who Needs to Pay:**
• Self-employed individuals
• Business owners who don't have taxes withheld
• Anyone who expects to owe $1,000+ in taxes

**How to Calculate:**
1. Estimate your annual income
2. Calculate expected tax liability
3. Subtract any withholdings or credits
4. Divide by 4 for quarterly payments

**Safe Harbor Rule:** Pay 100% of last year's tax liability (110% if AGI > $150,000) to avoid penalties.

I recommend working with a tax professional for your first year to ensure accurate calculations.`
    }

    return `Tax planning is crucial for business success. Here are key areas to focus on:

**Business Structure Impact:**
• Sole Proprietorship: Report on personal tax return
• LLC: Choose tax election (default is pass-through)
• S-Corp: Pass-through taxation with payroll requirements
• C-Corp: Double taxation but more deduction opportunities

**Key Tax Responsibilities:**
• File appropriate business tax returns
• Pay quarterly estimated taxes if required
• Maintain detailed records of all business expenses
• Separate business and personal expenses

**Common Tax Mistakes to Avoid:**
• Mixing personal and business expenses
• Poor record keeping
• Missing quarterly payment deadlines
• Not maximizing legitimate deductions

What specific tax topic would you like to explore further?`
  }

  // Business planning and strategy
  if (
    lowerQuestion.includes("business plan") ||
    lowerQuestion.includes("strategy") ||
    lowerQuestion.includes("planning")
  ) {
    return `A solid business plan is essential for success. Here's what to include:

**Executive Summary:**
• Business concept and value proposition
• Target market overview
• Financial projections summary
• Funding requirements

**Market Analysis:**
• Industry overview and trends
• Target customer demographics
• Competitive analysis
• Market size and growth potential

**Operations Plan:**
• Products/services description
• Production/delivery process
• Staffing requirements
• Location and facilities

**Financial Projections:**
• Revenue forecasts (3-5 years)
• Expense budgets
• Cash flow projections
• Break-even analysis

**Marketing Strategy:**
• Brand positioning
• Pricing strategy
• Distribution channels
• Promotional tactics

**Tips for Success:**
• Keep it realistic and data-driven
• Update regularly as your business evolves
• Use it as a roadmap, not just a document
• Get feedback from mentors and advisors

Would you like me to dive deeper into any specific section of business planning?`
  }

  // General business advice
  if (lowerQuestion.includes("start") || lowerQuestion.includes("begin") || lowerQuestion.includes("launch")) {
    return `Starting a business involves several key steps. Here's a comprehensive roadmap:

**1. Validate Your Business Idea**
• Research your target market
• Analyze competitors
• Test your concept with potential customers
• Ensure there's demand for your product/service

**2. Create a Business Plan**
• Define your business model
• Set financial projections
• Outline marketing strategy
• Plan operations and staffing

**3. Choose Your Business Structure**
• Sole Proprietorship (simplest, but no liability protection)
• LLC (most popular for small businesses)
• Corporation (best for raising capital)
• Partnership (for multiple owners)

**4. Handle Legal Requirements**
• Register your business name
• Get required licenses and permits
• Obtain an EIN from the IRS
• Open business bank accounts

**5. Set Up Operations**
• Secure funding
• Find a location (if needed)
• Set up accounting systems
• Get business insurance
• Hire employees (if needed)

**6. Launch and Market**
• Build your brand and website
• Implement marketing strategies
• Network with other businesses
• Focus on customer service

**Timeline: Most businesses can launch in 2-4 weeks**

What type of business are you considering? I can provide more specific guidance based on your industry.`
  }

  // Default response for general questions
  return `I'm here to help with all aspects of business formation and management. I can provide guidance on:

**Business Formation:**
• Choosing the right business structure (LLC, Corporation, Partnership)
• Registration and filing requirements
• Operating agreements and bylaws

**Tax Planning:**
• Business deductions and tax strategies
• Quarterly estimated payments
• Record keeping requirements

**Compliance:**
• Ongoing business requirements
• Licensing and permits
• Employment law compliance

**Business Strategy:**
• Business planning and market analysis
• Funding and financing options
• Growth strategies and scaling

Please ask me a specific question about any of these topics, and I'll provide detailed, actionable advice tailored to your situation.

For example, you could ask:
• "What are the benefits of forming an LLC?"
• "What business expenses can I deduct?"
• "How do I get a business license?"
• "What's the difference between C-Corp and S-Corp?"

What would you like to know more about?`
}

export function getSimpleResponse(userMessage: string): string {
  const message = userMessage.toLowerCase()

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

  for (const item of knowledgeBase) {
    if (item.keywords.some((keyword) => message.includes(keyword))) {
      return item.response
    }
  }

  return "Thanks for your question! I can help you with information about our services, pricing, business formation, and tax solutions. For specific questions, I'd recommend booking a consultation with our expert team through our website."
}
