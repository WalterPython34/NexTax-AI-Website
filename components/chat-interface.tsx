"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { MessageBubble } from "./message-bubble"
import { Send, Zap, Crown, AlertTriangle, Sparkles } from "lucide-react"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  actions?: Array<{
    label: string
    action: () => void
    variant?: "default" | "outline" | "secondary"
  }>
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm StartSmart GPT, your AI business advisor. I can help you with entity formation, tax planning, compliance, and strategic business decisions. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
      actions: [
        {
          label: "Entity Formation",
          action: () => handleQuickAction("Tell me about LLC vs Corporation"),
          variant: "outline",
        },
        {
          label: "Tax Planning",
          action: () => handleQuickAction("What tax elections should I consider?"),
          variant: "outline",
        },
        {
          label: "Compliance",
          action: () => handleQuickAction("What ongoing compliance do I need?"),
          variant: "outline",
        },
      ],
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [usageCount, setUsageCount] = useState(7)
  const [usageLimit] = useState(10)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleQuickAction = (message: string) => {
    setInputValue(message)
    handleSendMessage(message)
  }

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim()
    if (!text) return

    // Check usage limit
    if (usageCount >= usageLimit) {
      setShowUpgradeModal(true)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    setUsageCount((prev) => prev + 1)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(text),
        isUser: false,
        timestamp: new Date(),
        actions: generateResponseActions(text),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()

    if (lowerMessage.includes("llc") || lowerMessage.includes("corporation")) {
      return "Great question! Here's a comparison of LLC vs Corporation:\n\n**LLC Benefits:**\n• Pass-through taxation (no double taxation)\n• Flexible management structure\n• Fewer compliance requirements\n• Personal asset protection\n\n**Corporation Benefits:**\n• Easier to raise capital\n• Stock options for employees\n• Potential tax advantages for retained earnings\n• More established business structure\n\nFor most small businesses, an LLC is often the better choice due to its simplicity and tax advantages. Would you like me to help you determine which is best for your specific situation?"
    }

    if (lowerMessage.includes("tax")) {
      return "Tax planning is crucial for new businesses! Here are key considerations:\n\n**Essential Steps:**\n1. **EIN Application** - Get your federal tax ID\n2. **Tax Elections** - Consider S-Corp election for LLCs\n3. **Quarterly Payments** - Set up estimated tax payments\n4. **Business Deductions** - Track all business expenses\n\n**Common Tax Elections:**\n• **Default LLC** - Pass-through taxation\n• **S-Corp Election** - Potential payroll tax savings\n• **C-Corp** - Corporate tax rates\n\nWould you like me to help you calculate potential tax savings with an S-Corp election?"
    }

    if (lowerMessage.includes("compliance")) {
      return "Staying compliant is essential for protecting your business! Here's what you need to know:\n\n**Ongoing Requirements:**\n• Annual state filings and fees\n• Registered agent maintenance\n• Operating agreement updates\n• Meeting minutes (for corporations)\n• Business license renewals\n\n**State-Specific Requirements:**\nEach state has different requirements. For example:\n• **Delaware** - Annual franchise tax\n• **California** - $800 minimum tax\n• **Texas** - No state income tax\n\nI can help you create a compliance calendar specific to your state and entity type. What state is your business in?"
    }

    return "I understand you're looking for guidance on that topic. As your AI business advisor, I can provide detailed insights on entity formation, tax strategy, compliance requirements, and business planning. Could you be more specific about what aspect you'd like to explore? I'm here to help you make informed decisions for your business."
  }

  const generateResponseActions = (
    userMessage: string,
  ): Array<{ label: string; action: () => void; variant?: "default" | "outline" | "secondary" }> => {
    const lowerMessage = userMessage.toLowerCase()

    if (lowerMessage.includes("llc") || lowerMessage.includes("corporation")) {
      return [
        {
          label: "Generate Entity Comparison",
          action: () => console.log("Generate comparison document"),
          variant: "default",
        },
        {
          label: "State-Specific Requirements",
          action: () => handleQuickAction("What are the requirements in my state?"),
          variant: "outline",
        },
      ]
    }

    if (lowerMessage.includes("tax")) {
      return [
        {
          label: "Calculate Tax Savings",
          action: () => console.log("Open tax calculator"),
          variant: "default",
        },
        {
          label: "S-Corp Election Guide",
          action: () => handleQuickAction("How do I make an S-Corp election?"),
          variant: "outline",
        },
      ]
    }

    return [
      {
        label: "Learn More",
        action: () => console.log("Open knowledge base"),
        variant: "outline",
      },
    ]
  }

  const usagePercentage = (usageCount / usageLimit) * 100
  const isNearLimit = usageCount >= usageLimit * 0.8

  return (
    <section className="flex-1 flex flex-col h-full">
      {/* Header with Usage Tracking */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-[hsl(174,73%,53%)]" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">StartSmart GPT</h2>
            <Badge variant="secondary" className="bg-[hsl(174,73%,53%)]/10 text-[hsl(174,73%,53%)]">
              AI Business Advisor
            </Badge>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {usageCount} of {usageLimit} questions used
              </p>
              <Progress value={usagePercentage} className="w-20 h-1.5" />
            </div>

            {isNearLimit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpgradeModal(true)}
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <Crown className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            )}
          </div>
        </div>

        {isNearLimit && (
          <div className="flex items-center space-x-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              You're approaching your question limit. Upgrade for unlimited access.
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 max-w-xs">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about entity formation, taxes, compliance..."
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={usageCount >= usageLimit}
            className="flex-1"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading || usageCount >= usageLimit}
            className="bg-[hsl(174,73%,53%)] hover:bg-[hsl(174,73%,48%)]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("What business structure should I choose?")}
            disabled={usageCount >= usageLimit}
          >
            Business Structure
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("How do I minimize my tax burden?")}
            disabled={usageCount >= usageLimit}
          >
            Tax Strategy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("What licenses do I need?")}
            disabled={usageCount >= usageLimit}
          >
            Licensing
          </Button>
        </div>
      </div>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <span>Upgrade to Pro</span>
            </DialogTitle>
            <DialogDescription>
              You've reached your question limit. Upgrade to Pro for unlimited AI consultations and advanced features.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[hsl(174,73%,53%)]/10 to-blue-500/10 p-4 rounded-lg">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Pro Features</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li className="flex items-center space-x-2">
                  <Zap className="h-3 w-3 text-[hsl(174,73%,53%)]" />
                  <span>Unlimited AI consultations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Zap className="h-3 w-3 text-[hsl(174,73%,53%)]" />
                  <span>Advanced document generation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Zap className="h-3 w-3 text-[hsl(174,73%,53%)]" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Zap className="h-3 w-3 text-[hsl(174,73%,53%)]" />
                  <span>Compliance automation</span>
                </li>
              </ul>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowUpgradeModal(false)} className="flex-1">
                Maybe Later
              </Button>
              <Button
                onClick={() => {
                  setShowUpgradeModal(false)
                  // Handle upgrade logic
                }}
                className="flex-1 bg-[hsl(174,73%,53%)] hover:bg-[hsl(174,73%,48%)]"
              >
                Upgrade Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
