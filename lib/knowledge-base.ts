interface Message {
  role: "user" | "assistant"
  content: string
}

export async function getBusinessAdvice(question: string, previousMessages: Message[] = []): Promise<string> {
  // Business formation knowledge base
  const businessFormationAdvice = {
    llc: {
      benefits: [
        "Limited liability protection for personal assets",
        "Tax flexibility - can choose how to be taxed",
        "Simple management structure",
        "Credibility with customers and vendors",
        "Easier to get business loans and credit",
      ],
      process: [
        "Choose a unique business name",
        "File Articles of Organization with your state",
        "Create an Operating Agreement",
        "Get an EIN from the IRS",
        "Open a business bank account",
        "Get required licenses and permits",
      ],
      costs: "Typically $50-$500 depending on your state, plus registered agent fees if needed",
    },
    corporation: {
      benefits: [
        "Strong liability protection",
        "Easier to raise capital through stock sales",
        "Perpetual existence",
        "Tax advantages for certain situations",
        "Enhanced credibility",
      ],
      process: [
        "Choose a corporate name",
        "File Articles of Incorporation",
        "Create corporate bylaws",
        "Hold initial board meeting",
        "Issue stock certificates",
        "Get EIN and open business accounts",
      ],
    },
    partnership: {
      types: ["General Partnership", "Limited Partnership", "Limited Liability Partnership"],
      considerations: [
        "Shared liability among partners",
        "Pass-through taxation",
        "Partnership agreement is crucial",
        "Easier formation than corporations",
      ],
    },
  }

  // Tax advice knowledge base
  const taxAdvice = {
    deductions: [
      "Home office expenses (if you work from home)",
      "Business meals (50% deductible)",
      "Travel expenses for business",
      "Office supplies and equipment",
      "Professional development and training",
      "Marketing and advertising costs",
      "Professional services (legal, accounting)",
      "Business insurance premiums",
    ],
    quarterly: [
      "Estimated taxes are due quarterly",
      "Due dates: April 15, June 15, September 15, January 15",
      "Use Form 1040ES for calculations",
      "Pay online through EFTPS or IRS Direct Pay",
    ],
    recordKeeping: [
      "Keep all business receipts",
      "Maintain separate business bank accounts",
      "Track mileage for business travel",
      "Document business meals and entertainment",
      "Keep records for at least 3-7 years",
    ],
  }

  // Analyze the question and provide relevant advice
  const lowerQuestion = question.toLowerCase()

  // LLC-related questions
  if (lowerQuestion.includes("llc") || lowerQuestion.includes("limited liability")) {
    if (lowerQuestion.includes("benefit") || lowerQuestion.includes("advantage")) {
      return `Here are the key benefits of forming an LLC:

${businessFormationAdvice.llc.benefits.map((benefit) => `• ${benefit}`).join("\n")}

The main advantage is that an LLC combines the liability protection of a corporation with the tax flexibility and operational simplicity of a partnership. This makes it an excellent choice for most small businesses.

Would you like me to explain the LLC formation process or discuss specific aspects like taxation options?`
    }

    if (lowerQuestion.includes("form") || lowerQuestion.includes("start") || lowerQuestion.includes("create")) {
      return `Here's the step-by-step process to form an LLC:

${businessFormationAdvice.llc.process.map((step, index) => `${index + 1}. ${step}`).join("\n")}

**Estimated costs:** ${businessFormationAdvice.llc.costs}

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
${businessFormationAdvice.corporation.benefits.map((benefit) => `• ${benefit}`).join("\n")}

**Formation Process:**
${businessFormationAdvice.corporation.process.map((step, index) => `${index + 1}. ${step}`).join("\n")}

Corporations require more ongoing compliance (annual meetings, board resolutions, detailed record-keeping) but offer the most protection and growth potential.

Are you considering a C-Corp or S-Corp election? I can explain the differences in detail.`
  }

  // Tax-related questions
  if (lowerQuestion.includes("tax") || lowerQuestion.includes("deduction") || lowerQuestion.includes("irs")) {
    if (lowerQuestion.includes("deduction") || lowerQuestion.includes("write off")) {
      return `Here are the most common business tax deductions:

**Fully Deductible:**
${taxAdvice.deductions
  .filter((d) => !d.includes("50%"))
  .map((deduction) => `• ${deduction}`)
  .join("\n")}

**Partially Deductible:**
• Business meals (50% deductible)

**Important Notes:**
• Keep detailed records and receipts for all deductions
• Expenses must be "ordinary and necessary" for your business
• Home office deduction requires exclusive business use of the space
• Vehicle expenses can be deducted using actual costs or standard mileage rate

**Record Keeping Tips:**
${taxAdvice.recordKeeping.map((tip) => `• ${tip}`).join("\n")}

Would you like me to explain any specific deduction in more detail?`
    }

    if (lowerQuestion.includes("quarterly") || lowerQuestion.includes("estimated")) {
      return `**Quarterly Estimated Tax Payments:**

${taxAdvice.quarterly.map((info) => `• ${info}`).join("\n")}

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

  // Licensing and permits
  if (lowerQuestion.includes("license") || lowerQuestion.includes("permit") || lowerQuestion.includes("registration")) {
    return `Business licenses and permits vary by location and industry. Here's a general guide:

**Federal Requirements:**
• EIN (Employer Identification Number) - Free from IRS
• Industry-specific licenses (e.g., transportation, firearms, alcohol)

**State Requirements:**
• Business registration/license
• Professional licenses (if applicable)
• Sales tax permit (if selling products)
• Workers' compensation insurance

**Local Requirements:**
• Business license from city/county
• Zoning permits
• Building permits (if renovating)
• Signage permits

**Industry-Specific Examples:**
• Food service: Health department permits, liquor license
• Construction: Contractor's license, building permits
• Retail: Sales tax permit, possibly special product licenses
• Professional services: Professional licensing (law, medicine, etc.)

**How to Research Requirements:**
1. Check with your city/county clerk's office
2. Visit your state's business portal website
3. Consult the SBA's licensing guide
4. Consider hiring a business attorney for complex situations

The cost and timeline vary widely, so start this process early in your business formation.

What type of business are you starting? I can provide more specific guidance.`
  }

  // Funding and financing
  if (
    lowerQuestion.includes("funding") ||
    lowerQuestion.includes("loan") ||
    lowerQuestion.includes("capital") ||
    lowerQuestion.includes("investor")
  ) {
    return `There are several ways to fund your business:

**Self-Funding Options:**
• Personal savings
• Credit cards (use cautiously)
• Home equity loans
• Retirement account rollovers (ROBS)

**Traditional Financing:**
• SBA loans (government-backed, favorable terms)
• Bank loans and lines of credit
• Equipment financing
• Invoice factoring

**Alternative Financing:**
• Online lenders (faster but higher rates)
• Peer-to-peer lending
• Merchant cash advances
• Revenue-based financing

**Equity Financing:**
• Angel investors
• Venture capital
• Crowdfunding (Kickstarter, Indiegogo)
• Friends and family

**Grants:**
• Federal and state small business grants
• Industry-specific grants
• Minority/women-owned business grants
• Local economic development grants

**Preparation Tips:**
• Develop a solid business plan
• Prepare financial projections
• Maintain good personal credit
• Document your business experience
• Consider what you're willing to give up (equity vs. debt)

**SBA Loans** are often the best option for established businesses - they offer lower rates and longer terms than conventional loans.

What stage is your business in? I can provide more targeted funding advice.`
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

**Common First-Year Challenges:**
• Cash flow management
• Finding customers
• Balancing growth with resources
• Regulatory compliance

The key is to start with a solid foundation and be prepared to adapt as you learn.

What type of business are you considering? I can provide more specific guidance based on your industry.`
  }

  // Compliance and ongoing requirements
  if (
    lowerQuestion.includes("compliance") ||
    lowerQuestion.includes("requirement") ||
    lowerQuestion.includes("maintain")
  ) {
    return `Ongoing business compliance requirements vary by structure and location:

**All Business Types:**
• File annual tax returns
• Maintain business licenses (renew as required)
• Keep accurate financial records
• Comply with employment laws (if you have employees)
• Maintain required insurance coverage

**LLC Requirements:**
• File annual reports with the state
• Pay annual fees/franchise taxes
• Maintain registered agent
• Keep operating agreement updated
• Hold member meetings (recommended)

**Corporation Requirements:**
• File annual reports
• Hold annual shareholder meetings
• Maintain corporate bylaws
• Keep meeting minutes and resolutions
• Issue stock certificates properly

**Employment Compliance (if you have employees):**
• Payroll taxes and reporting
• Workers' compensation insurance
• Unemployment insurance
• OSHA safety requirements
• Equal employment opportunity compliance

**Industry-Specific Requirements:**
• Professional license renewals
• Health department inspections
• Environmental compliance
• Industry association memberships

**Best Practices:**
• Set up a compliance calendar
• Use business management software
• Work with professionals (accountant, attorney)
• Stay informed about law changes
• Document everything properly

**Consequences of Non-Compliance:**
• Fines and penalties
• Loss of liability protection
• Business license suspension
• Legal liability

Would you like me to elaborate on requirements for your specific business type?`
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

**Operations:**
• Accounting and bookkeeping setup
• Insurance requirements
• Contract and legal considerations

Please ask me a specific question about any of these topics, and I'll provide detailed, actionable advice tailored to your situation.

For example, you could ask:
• "What are the benefits of forming an LLC?"
• "What business expenses can I deduct?"
• "How do I get a business license?"
• "What's the difference between C-Corp and S-Corp?"

What would you like to know more about?`
}
