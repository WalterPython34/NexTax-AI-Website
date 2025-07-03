export function getSimpleResponse(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Pricing questions
  if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("pricing")) {
    return "Our StartSmart GPT service offers three tiers: Free, Professional ($29/month), and Premium ($79/month). Each includes business formation, AI guidance, and ongoing support. Would you like details about a specific package?"
  }

  // Business formation questions
  if (
    lowerMessage.includes("llc") ||
    lowerMessage.includes("corporation") ||
    lowerMessage.includes("business formation")
  ) {
    return "We help you choose the right business structure (LLC, S-Corp, C-Corp) based on your specific needs. Our AI advisor analyzes your situation and provides personalized recommendations. Would you like to start with our business structure quiz?"
  }

  // Tax questions
  if (lowerMessage.includes("tax") || lowerMessage.includes("deduction") || lowerMessage.includes("irs")) {
    return "Our tax experts can help with business tax planning, deductions, and compliance. We provide ongoing tax guidance as part of our service. What specific tax questions do you have?"
  }

  // Services questions
  if (lowerMessage.includes("service") || lowerMessage.includes("what do you do") || lowerMessage.includes("help")) {
    return "NexTax.AI provides comprehensive business formation services with AI-powered guidance. We handle entity formation, tax planning, compliance, and provide ongoing business advisory services. How can we help launch your business?"
  }

  // Greeting responses
  if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
    return "Hello! I'm here to help you with business formation, tax planning, and our StartSmart GPT services. What questions can I answer for you today?"
  }

  // Default response
  return "I'd be happy to help you with questions about our business formation services, pricing, or tax solutions. You can also contact our team directly for personalized assistance. What specific information are you looking for?"
}
