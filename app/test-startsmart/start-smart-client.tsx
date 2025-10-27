"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  MessageSquare,
  FileText,
  Send,
  Building,
  TrendingUp,
  Shield,
  Rocket,
  BookOpen,
  Settings,
  DollarSign,
  Star,
  MoreHorizontal,
} from "lucide-react"

export default function StartSmartClient() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  const validTabs = ["ai-chat", "progress-roadmap", "document-center", "knowledge-hub", "startup-tools", "compliance"]
  const initialTab = tabParam && validTabs.includes(tabParam) ? tabParam : "ai-chat"

  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Of course! Choosing the right business entity is crucial as it impacts liability, taxes, and operations. Here are the common business entity types along with their key characteristics:",
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Business formation state
  const [businessInfo, setBusinessInfo] = useState({
    name: "",
    type: "",
    state: "",
    industry: "",
    description: "",
  })

  // Progress roadmap state
  const [roadmapSteps] = useState([
    {
      id: 1,
      title: "Check Business Name Availability",
      description: "Verify your chosen business name is available in your state",
      completed: true,
      completedDate: "7/7/2025",
      phase: "Legal Phase",
    },
    {
      id: 2,
      title: "Appoint Registered Agent",
      description: "Select and appoint a registered agent for your business",
      completed: false,
      inProgress: true,
      phase: "Legal Phase",
    },
    {
      id: 3,
      title: "Prepare Operating Agreement",
      description: "Create and sign your LLC Operating Agreement",
      completed: false,
      phase: "Legal Phase",
    },
    {
      id: 4,
      title: "Obtain EIN (Employer Identification Number)",
      description: "Apply for your business EIN with the IRS",
      completed: true,
      completedDate: "7/7/2025",
      phase: "Financial Phase",
    },
    {
      id: 5,
      title: "Open Business Bank Account",
      description: "Set up a dedicated business banking account",
      completed: false,
      phase: "Financial Phase",
    },
    {
      id: 6,
      title: "Set Up Business Accounting",
      description: "Choose and implement an accounting system",
      completed: false,
      phase: "Financial Phase",
    },
    {
      id: 7,
      title: "Register for State and Local Taxes",
      description: "Complete state and local tax registration requirements",
      completed: false,
      phase: "Compliance Phase",
    },
  ])

  // Compliance tasks state
  const [complianceTasks] = useState([
    {
      id: 1,
      task: "Test Overdue Task - File Q3 Tax Return",
      description:
        "This is a test task that should automatically be marked as overdue when compliance tasks are fetched",
      dueDate: "OVERDUE - 6/20/2025",
      status: "overdue",
      priority: "Auto",
      category: "Tax Compliance",
      recurring: false,
    },
    {
      id: 2,
      task: "Federal Estimated Tax Payment - Q3",
      description: "Submit quarterly estimated tax payment",
      dueDate: "OVERDUE - 9/14/2025",
      status: "overdue",
      priority: "Auto",
      category: "Tax Compliance",
      recurring: true,
    },
    {
      id: 3,
      task: "Federal Estimated Tax Payment - Q4",
      description: "Submit quarterly estimated tax payment",
      dueDate: "Due 1/14/2026",
      status: "pending",
      priority: "Auto",
      category: "Tax Compliance",
      recurring: true,
    },
    {
      id: 4,
      task: "Federal Estimated Tax Payment - Q1",
      description: "Submit quarterly estimated tax payment",
      dueDate: "Due 4/14/2026",
      status: "pending",
      priority: "Auto",
      category: "Tax Compliance",
      recurring: true,
    },
    {
      id: 5,
      task: "Federal Estimated Tax Payment - Q2",
      description: "Submit quarterly estimated tax payment",
      dueDate: "Due 6/14/2026",
      status: "pending",
      priority: "Auto",
      category: "Tax Compliance",
      recurring: true,
    },
    {
      id: 6,
      task: "Federal EIN Obtained",
      description: "Obtain Federal Employer Identification Number",
      dueDate: "",
      status: "completed",
      priority: "Auto",
      category: "Tax Compliance",
      recurring: true,
    },
    {
      id: 7,
      task: "State Tax Registration",
      description: "Register for state income tax",
      dueDate: "",
      status: "pending",
      priority: "Auto",
      category: "Legal & Registration",
      recurring: true,
      stateSpecific: true,
    },
    {
      id: 8,
      task: "Michigan State Tax Return",
      description: "File Form 165 by March 15 (extension available until September 15)",
      dueDate: "",
      status: "pending",
      priority: "Auto",
      category: "Tax Compliance",
      recurring: true,
      stateSpecific: true,
    },
    {
      id: 9,
      task: "Federal Tax Return",
      description: "File Form 1065 by March 15 (extension available until September 15 with Form 7004)",
      dueDate: "",
      status: "pending",
      priority: "Auto",
      category: "Tax Compliance",
      recurring: true,
    },
    {
      id: 10,
      task: "Test Overdue - Annual Report Filing",
      description: "This annual report was due yesterday and should automatically be flagged as overdue",
      dueDate: "OVERDUE - 7/10/2025",
      status: "overdue",
      priority: "Manual",
      category: "Legal & Registration",
      recurring: false,
    },
    {
      id: 11,
      task: "Articles of Organization Filed",
      description: "File Articles of Organization with state",
      dueDate: "",
      status: "completed",
      priority: "Auto",
      category: "Legal & Registration",
      recurring: false,
      stateSpecific: true,
    },
    {
      id: 12,
      task: "Registered Agent Appointed",
      description: "Appoint registered agent for business",
      dueDate: "",
      status: "pending",
      priority: "Auto",
      category: "Legal & Registration",
      recurring: false,
      stateSpecific: true,
    },
  ])

  // Knowledge Hub resources
  const [featuredResources] = useState([
    {
      title: "LLC vs S-Corp Complete Guide",
      description: "Understand the key differences and choose the right entity structure for your business.",
      readTime: "8 min read",
      category: "Essential",
      color: "bg-green-100 text-green-800",
    },
    {
      title: "Tax Setup for New Businesses",
      description: "Step-by-step guide to EIN application, tax elections, and compliance requirements.",
      readTime: "12 min read",
      category: "Essential",
      color: "bg-green-100 text-green-800",
    },
    {
      title: "Market Research Essentials",
      description: "Learn how to validate your business idea and understand your target market.",
      readTime: "15 min read",
      category: "Strategy",
      color: "bg-purple-100 text-purple-800",
    },
  ])

  // Document templates
  const [documentTemplates] = useState([
    {
      category: "Legal Documents",
      icon: Building,
      documents: [
        {
          name: "Operating Agreement",
          description: "Essential document outlining ownership and operations for LLCs",
          hasTemplate: true,
          isPro: true,
        },
        {
          name: "Articles of Incorporation",
          description: "Official document to establish your corporation with the state",
          hasTemplate: true,
          isPro: true,
        },
        {
          name: "Corporate Bylaws",
          description: "Internal rules and procedures for corporation management",
          hasTemplate: false,
        },
      ],
    },
    {
      category: "Tax & Finance",
      icon: DollarSign,
      documents: [
        {
          name: "SS-4 EIN Form",
          description: "IRS form to obtain your business Tax ID number",
          hasTemplate: false,
        },
        {
          name: "Chart of Accounts",
          description: "Organized structure for tracking business financial transactions",
          hasTemplate: false,
        },
        {
          name: "Budget Template",
          description: "Track startup costs and ongoing expenses",
          hasTemplate: false,
        },
      ],
    },
    {
      category: "Business Plans",
      icon: TrendingUp,
      documents: [
        {
          name: "Executive Summary",
          description: "Compelling overview of your business for investors and partners",
          hasTemplate: true,
          isPro: true,
        },
        {
          name: "Lean Canvas",
          description: "One-page business model focusing on key assumptions",
          hasTemplate: true,
          isPro: true,
        },
        {
          name: "Business Plan for Startups",
          description: "Complete 10-section business plan template for startups and investors",
          hasTemplate: true,
          isPro: true,
        },
      ],
    },
  ])

  const completedSteps = roadmapSteps.filter((step) => step.completed).length
  const progressPercentage = Math.round((completedSteps / roadmapSteps.length) * 100)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = { role: "user", content: inputMessage }
    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/startsmart-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }])
      } else {
        const responses = [
          "Based on your business goals, I recommend starting with an LLC structure for flexibility and tax benefits.",
          "For your industry, you'll need to consider these key compliance requirements and licensing needs.",
          "Here's a breakdown of the startup costs you should budget for your business launch.",
          "I can help you generate the necessary documents for business formation and compliance.",
          "Let me walk you through the tax implications of different business structures for your situation.",
        ]
        const randomResponse = responses[Math.floor(Math.random() * responses.length)]
        setMessages((prev) => [...prev, { role: "assistant", content: randomResponse }])
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble connecting right now. Please try again." },
      ])
    }

    setIsLoading(false)
  }

  const generateDocument = async (docType: string) => {
    try {
      const response = await fetch("/api/documents/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentType: docType,
          businessInfo: {
            name: "Test Business",
            type: "LLC",
            state: "Delaware",
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ ${docType} generated successfully! Document ID: ${data.documentId}`)
      } else {
        alert(`⚠️ Generating ${docType}... This would create a customized document based on your business information.`)
      }
    } catch (error) {
      alert(`⚠️ Generating ${docType}... This would create a customized document based on your business information.`)
    }
  }

  const sidebarItems = [
    { id: "ai-chat", label: "AI Chat", icon: MessageSquare },
    { id: "progress-roadmap", label: "Progress Roadmap", icon: Rocket },
    { id: "document-center", label: "Document Center", icon: FileText },
    { id: "knowledge-hub", label: "Knowledge Hub", icon: BookOpen },
    { id: "startup-tools", label: "Startup Tools", icon: Settings },
    { id: "compliance", label: "Compliance", icon: Shield },
  ]

  // Calculate actual counts for the stats based on the compliance tasks
  const completedTasks = complianceTasks.filter((task) => task.status === "completed").length
  const pendingTasks = complianceTasks.filter((task) => task.status === "pending").length
  const overdueTasks = complianceTasks.filter((task) => task.status === "overdue").length
  const totalTasks = complianceTasks.length
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const taxComplianceTasks = complianceTasks.filter((task) => task.category === "Tax Compliance")
  const taxCompleted = taxComplianceTasks.filter((task) => task.status === "completed").length
  const taxTotal = taxComplianceTasks.length
  const taxProgress = taxTotal > 0 ? Math.round((taxCompleted / taxTotal) * 100) : 0

  const legalRegistrationTasks = complianceTasks.filter((task) => task.category === "Legal & Registration")
  const legalCompleted = legalRegistrationTasks.filter((task) => task.status === "completed").length
  const legalTotal = legalRegistrationTasks.length
  const legalProgress = legalTotal > 0 ? Math.round((legalCompleted / legalTotal) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">StartSmart</h1>
              <p className="text-xs text-gray-600">by NexTax.AI</p>
            </div>
          </div>
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">🧪 Test Environment</Badge>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200">
          <nav className="p-4 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                    activeTab === item.id
                      ? "bg-teal-50 text-teal-700 border border-teal-200"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* AI Chat Tab */}
          {activeTab === "ai-chat" && (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-500 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">AI Sidekick</h2>
                    <p className="text-sm text-gray-600">Your AI business advisor</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Free</span>
                  <span>•</span>
                  <span>0/10 messages remaining</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="flex items-start gap-3 max-w-[80%]">
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">S</span>
                        </div>
                      )}
                      <div
                        className={`p-4 rounded-lg ${
                          message.role === "user"
                            ? "bg-teal-500 text-white"
                            : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              Copy
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              Save to Roadmap
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              <Star className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs">S</span>
                      </div>
                      <div className="bg-white text-gray-900 border border-gray-200 shadow-sm p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500"></div>
                          <span className="text-sm">AI Sidekick is thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-6 border-t border-gray-200 bg-white">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-4 text-sm text-teal-800">
                  Help me understand the different business entity types and which one is right for my business.
                </div>
                <div className="flex gap-3">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me anything about starting your business..."
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Progress Roadmap Tab */}
          {activeTab === "progress-roadmap" && <div className="p-8">{/* Progress Roadmap Content */}</div>}

          {/* Document Center Tab */}
          {activeTab === "document-center" && <div className="p-8">{/* Document Center Content */}</div>}

          {/* Knowledge Hub Tab */}
          {activeTab === "knowledge-hub" && <div className="p-8">{/* Knowledge Hub Content */}</div>}

          {/* Startup Tools Tab */}
          {activeTab === "startup-tools" && <div className="p-8">{/* Startup Tools Content */}</div>}

          {/* Compliance Tab */}
          {activeTab === "compliance" && (
            <div className="p-8">
              {/* Compliance Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Overview</CardTitle>
                  <CardDescription>Your compliance progress at a glance.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <Progress value={overallProgress} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tax Compliance</span>
                      <Progress value={taxProgress} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Legal & Registration</span>
                      <Progress value={legalProgress} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
