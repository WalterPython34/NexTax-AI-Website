"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Bot, MessageSquare, Clock, Lock, CheckCircle, ArrowRight, Zap, AlertCircle, Rocket } from "lucide-react"
import Link from "next/link"

// Demo limitations
const DEMO_LIMITS = {
  maxQuestions: 3,
  cooldownHours: 24,
  maxFollowUps: 1,
}

// Pre-scripted conversations to showcase capabilities
const SAMPLE_CONVERSATIONS = [
  {
    id: 1,
    title: "S-Corp Election Analysis",
    userQuestion: "Should I elect S-Corp status for my new LLC?",
    aiResponse: `Based on typical scenarios, S-Corp election can provide significant tax savings for LLCs with profits over $60,000. Here's what I analyze for each client:

**Tax Savings Potential:**
- Self-employment tax savings on profits above reasonable salary
- Typical savings: $3,000-$15,000+ annually depending on profit levels

**Key Considerations:**
- Must run payroll (adds complexity and cost ~$1,200/year)
- Reasonable salary requirement (typically 40-60% of profits)
- State-specific implications vary significantly

**Breakeven Analysis:**
- Generally beneficial when LLC profits exceed $60-80K annually
- Must factor in payroll costs and administrative burden

*For YOUR specific situation, I'd need to know your projected revenue, state of operation, and business structure to provide precise recommendations and implementation steps.*`,
    category: "Tax Strategy",
  },
  {
    id: 2,
    title: "Multi-State Business Setup",
    userQuestion: "I'm starting an e-commerce business. Which state should I form my LLC in?",
    aiResponse: `Excellent question! State selection significantly impacts your taxes, compliance, and operational costs. Here's my analysis framework:

**Top Considerations:**
1. Tax Implications: State income tax, franchise fees, annual costs
2. Nexus Requirements: Where you'll trigger tax obligations
3. Operational Complexity: Multi-state compliance burden

**Popular Options Analysis:**
- Delaware: Corporate-friendly laws, but adds complexity for small businesses
- Wyoming: No state income tax, low fees, privacy protection
- Your Home State: Often simplest for single-member LLCs

**E-commerce Specific Factors:**
- Sales tax nexus thresholds (varies by state)
- Inventory storage locations
- Where your customers are located
- Fulfillment center implications

*For your specific e-commerce model, I'd analyze your projected sales by state, inventory strategy, and growth plans to recommend the optimal structure and multi-state compliance approach.*`,
    category: "Business Formation",
  },
  {
    id: 3,
    title: "Startup Equity Structure",
    userQuestion: "How should I structure equity for my tech startup with co-founders?",
    aiResponse: `Equity structure is critical and often irreversible. Here's my systematic approach:

**Founder Equity Framework:**
- Equal vs. Unequal: Based on contribution, risk, and ongoing commitment
- Vesting Schedules: Typically 4-year vest with 1-year cliff
- Founder Departure: What happens if someone leaves?

**Key Considerations:**
- Sweat Equity: How to value pre-formation contributions
- Future Dilution: Employee stock option pool (typically 10-20%)
- Investor Rounds: How equity structure affects fundraising

**Common Structures:**
- 50/50 Split: Only works with strong partnership agreements
- Weighted by Role: CEO/CTO often get larger shares
- Performance-Based: Equity tied to specific milestones

**Legal Protections:**
- Buy-sell agreements
- Right of first refusal
- Drag-along/tag-along rights

*For your specific startup, I'd need to understand each founder's contribution, roles, financial investment, and risk tolerance to design an optimal equity structure with proper legal protections.*`,
    category: "Startup Strategy",
  },
]

export default function StartSmartGPTDemo() {
  const [selectedSample, setSelectedSample] = useState<number | null>(null)
  const [userQuestion, setUserQuestion] = useState("")
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const [email, setEmail] = useState("")
  const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check session limits on load
  useEffect(() => {
    const lastSession = localStorage.getItem("demo-last-session")
    const questionsCount = localStorage.getItem("demo-questions-count")

    if (lastSession && questionsCount) {
      const lastSessionTime = new Date(lastSession)
      const now = new Date()
      const hoursSinceLastSession = (now.getTime() - lastSessionTime.getTime()) / (1000 * 60 * 60)
      const storedQuestionCount = Number.parseInt(questionsCount)

      // Only set as expired if user has used all questions AND within cooldown period
      if (storedQuestionCount >= DEMO_LIMITS.maxQuestions && hoursSinceLastSession < DEMO_LIMITS.cooldownHours) {
        setSessionExpired(true)
        setQuestionsAsked(storedQuestionCount)
      } else if (storedQuestionCount < DEMO_LIMITS.maxQuestions) {
        // If user hasn't used all questions, restore their progress
        setQuestionsAsked(storedQuestionCount)
      } else if (hoursSinceLastSession >= DEMO_LIMITS.cooldownHours) {
        // If cooldown period has passed, reset everything
        localStorage.removeItem("demo-last-session")
        localStorage.removeItem("demo-questions-count")
        setQuestionsAsked(0)
        setSessionExpired(false)
      }
    }
  }, [])

  const handleSampleSelect = (sampleId: number) => {
    setSelectedSample(sampleId)
    const sample = SAMPLE_CONVERSATIONS.find((s) => s.id === sampleId)
    if (sample) {
      setConversation([
        { role: "user", content: sample.userQuestion },
        { role: "assistant", content: sample.aiResponse },
      ])
    }
  }

  const handleAskQuestion = async () => {
    if (!userQuestion.trim()) return

    if (questionsAsked >= DEMO_LIMITS.maxQuestions) {
      setShowEmailCapture(true)
      return
    }

    setIsLoading(true)
    setError(null)

    // Add user question to conversation
    const newConversation = [...conversation, { role: "user", content: userQuestion }]
    setConversation(newConversation)

    try {
      const response = await fetch("/api/startsmart-demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userQuestion,
          conversationHistory: conversation,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response")
      }

      // Add AI response to conversation
      setConversation([...newConversation, { role: "assistant", content: data.response }])

      const newCount = questionsAsked + 1
      setQuestionsAsked(newCount)

      // Store session data
      localStorage.setItem("demo-last-session", new Date().toISOString())
      localStorage.setItem("demo-questions-count", newCount.toString())

      if (newCount >= DEMO_LIMITS.maxQuestions) {
        setShowEmailCapture(true)
      }

      setUserQuestion("")
    } catch (err: any) {
      console.error("Error calling StartSmart Demo API:", err)
      setError(err.message || "Failed to get response. Please try again.")
      // Remove the user message if API call failed
      setConversation(conversation)
    } finally {
      setIsLoading(false)
    }
  }

  const remainingQuestions = DEMO_LIMITS.maxQuestions - questionsAsked

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-8">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border-emerald-500/30 text-lg px-4 py-2 mb-6">
            <Bot className="w-5 h-5 mr-2" />
            StartSmartGPT Demo Experience
          </Badge>

          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">Experience Your AI Business Advisor</h1>

          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            See how StartSmartGPT combines 20+ years of Big 4 tax expertise with AI to provide expert business guidance.
            This demo shows the depth of knowledge available to our customers.
          </p>

          {/* Demo Limitations Display */}
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 max-w-2xl mx-auto">
            <h3 className="text-white font-semibold mb-4">Demo Experience Includes:</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">3 Sample Conversations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">3 Personal Questions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Expert-Level Responses</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Sample Conversations */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  Sample Conversations
                </CardTitle>
                <p className="text-slate-400 text-sm">See StartSmartGPT in action with real business scenarios</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {SAMPLE_CONVERSATIONS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSampleSelect(sample.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedSample === sample.id
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-slate-900/30 border-slate-600 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-slate-700 text-slate-300 text-xs">{sample.category}</Badge>
                    </div>
                    <h4 className="text-white font-medium mb-2">{sample.title}</h4>
                    <p className="text-slate-400 text-sm line-clamp-2">{sample.userQuestion}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">StartSmartGPT</CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <Badge className="bg-green-500/20 text-green-300 text-xs">Demo Mode</Badge>
                      </div>
                    </div>
                  </div>

                  {!sessionExpired && (
                    <div className="text-right">
                      <div className="text-emerald-400 font-semibold">{remainingQuestions}</div>
                      <div className="text-slate-400 text-xs">questions left</div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-col h-96">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                  {conversation.length === 0 && (
                    <div className="text-center py-8">
                      <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">
                        Select a sample conversation or ask your own question to get started!
                      </p>
                    </div>
                  )}

                  {conversation.map((message, i) => (
                    <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] p-4 rounded-lg ${
                          message.role === "user"
                            ? "bg-emerald-500 text-white"
                            : "bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 text-slate-300"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full"></div>
                          <span className="text-slate-300">StartSmartGPT is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex justify-start">
                      <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg max-w-[85%]">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span className="text-red-300 font-semibold">Error</span>
                        </div>
                        <p className="text-slate-300 text-sm">{error}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                {sessionExpired ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-red-400" />
                      <span className="text-red-300 font-semibold">Demo Session Expired</span>
                    </div>
                    <p className="text-slate-300 text-sm mb-4">
                      You've used your {DEMO_LIMITS.maxQuestions} demo questions. Come back in{" "}
                      {DEMO_LIMITS.cooldownHours} hours for another demo, or get unlimited access now!
                    </p>
                    <Link href="/pricing">
                      <Button className="bg-emerald-500 hover:bg-emerald-600 text-white w-full">
                        Get Unlimited Access
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                ) : showEmailCapture ? (
                  <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-lg p-6">
                    <div className="text-center mb-4">
                      <Lock className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <h3 className="text-white font-semibold mb-2">Demo Complete!</h3>
                      <p className="text-slate-300 text-sm">
                        You've experienced StartSmartGPT's expertise. Ready for unlimited, personalized business
                        guidance?
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-slate-900/30 rounded p-3">
                          <div className="text-red-300 font-medium mb-1">Demo Limitations:</div>
                          <ul className="text-slate-400 space-y-1">
                            <li>• Generic advice only</li>
                            <li>• No personalization</li>
                            <li>• No documents generated</li>
                            <li>• Limited follow-ups</li>
                          </ul>
                        </div>
                        <div className="bg-slate-900/30 rounded p-3">
                          <div className="text-emerald-300 font-medium mb-1">Full Version Includes:</div>
                          <ul className="text-slate-400 space-y-1">
                            <li>• Knows YOUR business details</li>
                            <li>• Unlimited conversations</li>
                            <li>• Document generation</li>
                            <li>• Ongoing relationship</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Link href="/pricing" className="flex-1">
                          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white w-full">
                            <Rocket className="mr-2 w-4 h-4" />
                            Launch My Business
                          </Button>
                        </Link>
                        <Link href="/contact" className="flex-1">
                          <Button
                            variant="outline"
                            className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 w-full bg-transparent"
                          >
                            Learn More
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Textarea
                        value={userQuestion}
                        onChange={(e) => setUserQuestion(e.target.value)}
                        placeholder="Ask StartSmartGPT about business formation, tax strategy, compliance, or growth..."
                        className="bg-slate-900/50 border-slate-600 text-white resize-none"
                        rows={3}
                        disabled={isLoading}
                      />
                      <Button
                        onClick={handleAskQuestion}
                        disabled={!userQuestion.trim() || isLoading}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>

                    {remainingQuestions <= 1 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-300 text-sm font-medium">
                            {remainingQuestions === 1 ? "Last demo question!" : "Demo questions used up!"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-emerald-600 to-cyan-600 border-0 max-w-4xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-4">Ready to Make StartSmartGPT Your Business Partner?</h2>
              <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
                This demo shows just a glimpse of what's possible. Get unlimited access to personalized AI guidance with
                your business formation package.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {[
                  { title: "Personalized Advice", desc: "AI knows YOUR business details" },
                  { title: "Unlimited Questions", desc: "24/7 access to your AI advisor" },
                  { title: "Document Generation", desc: "Operating agreements, tax forms, etc." },
                ].map((feature, i) => (
                  <div key={i} className="text-center">
                    <CheckCircle className="w-6 h-6 text-white mx-auto mb-2" />
                    <div className="text-white font-semibold">{feature.title}</div>
                    <div className="text-emerald-100 text-sm">{feature.desc}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/pricing">
                  <Button size="lg" className="bg-white text-emerald-600 hover:bg-slate-100 px-8 py-4">
                    <Rocket className="mr-2 w-5 h-5" />
                    Start My Business ($499)
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 px-8 py-4 bg-transparent"
                  >
                    Schedule Consultation
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
