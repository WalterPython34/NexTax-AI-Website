"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  MessageSquare,
  FileText,
  Calculator,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Building,
  TrendingUp,
  Shield,
  Rocket,
  BookOpen,
  Settings,
  DollarSign,
  Target,
  Globe,
  ArrowRight,
  Eye,
  Star,
  Calendar,
  Plus,
  Search,
  MoreHorizontal,
} from "lucide-react"

export default function TestStartSmartApp() {
  const [activeTab, setActiveTab] = useState("ai-chat")
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
      task: "Federal Estimated Tax Payment - Q3",
      description: "Submit quarterly estimated tax payment",
      dueDate: "Due 9/15/2025",
      status: "pending",      
      category: "Federal",
    },
    {
      id: 2,
      task: "Federal Estimated Tax Payment - Q4",
      description: "Submit quarterly estimated tax payment",
      dueDate: "Due 1/15/2026",
      status: "pending",      
      category: "Federal",
    },
    {
      id: 3,
      task: "Articles of Organization Filed",
      description: "File Articles of Organization with state",
      dueDate: "",
      status: "pending",      
      category: "State",
    },
    {
      id: 4,
      task: "Registered Agent Appointed",
      description: "Appoint registered agent for business",
      dueDate: "",
      status: "pending",      
      category: "State",
    },
    {
      id: 5,
      task: "Federal EIN Obtained",
      description: "Obtain Federal Employer Identification Number",
      dueDate: "",
      status: "pending",      
      category: "Federal",
    },
    {
      id: 6,
      task: "State Tax Registration",
      description: "Register for state income tax",
      dueDate: "",
      status: "pending",      
      category: "Legal & Registration",
      recurring: true,
      stateSpecific: true,
    },
    {
      id: 7,
      task: "Michigan State Tax Return",
      description: "File Form 165 by March 15 (extension available until September 15)",
      dueDate: "",
      status: "pending",      
      category: "Tax Compliance",
      recurring: true,
      stateSpecific: true,
    },
    {
      id: 8,
      task: "Federal Tax Return",
      description: "File Form 1065 by March 15 (extension available until September 15 with Form 7004)",
      dueDate: "",
      status: "pending",      
      category: "Tax Compliance",
      recurring: true,
    },
    {
      id: 9,
      task: "Test Overdue - Annual Report Filing",
      description: "This annual report was due yesterday and should automatically be flagged as overdue",
      dueDate: "OVERDUE - 7/10/2025",
      status: "overdue",      
      category: "Legal & Registration",
      recurring: false,
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
          {activeTab === "progress-roadmap" && (
            <div className="p-8">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Business Launch Roadmap</h2>
                    <p className="text-gray-600">Track your progress through each phase of starting your business</p>
                  </div>
                  <Button className="bg-teal-500 hover:bg-teal-600 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Custom Task
                  </Button>
                </div>

                {/* Progress Overview */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-3xl font-bold text-teal-600">{progressPercentage}%</div>
                    <div>
                      <div className="font-semibold text-gray-900">Overall Progress</div>
                      <div className="text-sm text-gray-600">
                        {completedSteps} of {roadmapSteps.length} steps complete
                      </div>
                    </div>
                    <div className="ml-auto flex gap-4">
                      <div className="text-center">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600">Completed</span>
                        </div>
                        <div className="text-sm text-gray-600">{completedSteps} tasks</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="font-semibold text-orange-600">In Progress</span>
                        </div>
                        <div className="text-sm text-gray-600">1 task</div>
                      </div>
                    </div>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              </div>

              {/* Roadmap Phases */}
              <div className="space-y-8">
                {["Legal Phase", "Financial Phase", "Compliance Phase"].map((phase, phaseIndex) => {
                  const phaseSteps = roadmapSteps.filter((step) => step.phase === phase)
                  const phaseCompleted = phaseSteps.filter((step) => step.completed).length
                  const phaseProgress = Math.round((phaseCompleted / phaseSteps.length) * 100)

                  return (
                    <div key={phase} className="bg-white rounded-lg border border-gray-200">
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                                phaseIndex === 0 ? "bg-teal-500" : phaseIndex === 1 ? "bg-blue-500" : "bg-purple-500"
                              }`}
                            >
                              {phaseIndex + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{phase}</h3>
                              <div className="text-sm text-gray-600">
                                {phaseCompleted} of {phaseSteps.length} complete
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant={phaseProgress === 100 ? "default" : phaseProgress > 0 ? "secondary" : "outline"}
                          >
                            {phaseProgress === 100 ? "Completed" : phaseProgress > 0 ? "In Progress" : "Pending"}
                          </Badge>
                        </div>
                        <Progress value={phaseProgress} className="h-1 mt-3" />
                      </div>
                      <div className="p-6 space-y-4">
                        {phaseSteps.map((step) => (
                          <div key={step.id} className="flex items-start gap-4 p-4 rounded-lg border border-gray-100">
                            <div className="flex-shrink-0 mt-1">
                              {step.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : step.inProgress ? (
                                <Clock className="h-5 w-5 text-orange-600" />
                              ) : (
                                <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{step.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                              {step.completedDate && (
                                <p className="text-xs text-green-600 mt-2">Completed {step.completedDate}</p>
                              )}
                            </div>
                            {!step.completed && (
                              <Button size="sm" variant="outline">
                                Start
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Document Center Tab */}
          {activeTab === "document-center" && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Generation Center</h2>
                <p className="text-gray-600">AI-powered templates and legal documents for your startup</p>
              </div>

              <div className="space-y-8">
                {documentTemplates.map((category) => {
                  const Icon = category.icon
                  return (
                    <div key={category.category} className="bg-white rounded-lg border border-gray-200">
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <Icon className="h-6 w-6 text-teal-600" />
                          <h3 className="text-lg font-semibold text-gray-900">{category.category}</h3>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {category.documents.map((doc) => (
                            <div key={doc.name} className="border border-gray-200 rounded-lg p-4">
                              <div className="mb-3">
                                <h4 className="font-medium text-gray-900 mb-1">{doc.name}</h4>
                                <p className="text-sm text-gray-600">{doc.description}</p>
                              </div>
                              <div className="space-y-2">
                                {doc.hasTemplate && (
                                  <Button size="sm" variant="outline" className="w-full bg-transparent">
                                    <Eye className="h-3 w-3 mr-2" />
                                    View Template
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  className={`w-full ${doc.isPro ? "bg-purple-600 hover:bg-purple-700" : "bg-teal-500 hover:bg-teal-600"} text-white`}
                                  onClick={() => generateDocument(doc.name)}
                                >
                                  <Rocket className="h-3 w-3 mr-2" />
                                  {doc.isPro ? "Create with AI" : "Get Template"}
                                  {doc.isPro && (
                                    <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs">Pro</Badge>
                                  )}
                                </Button>
                                <Button size="sm" variant="ghost" className="w-full text-teal-600">
                                  <MessageSquare className="h-3 w-3 mr-2" />
                                  Get NexTax.AI Help
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Generated Documents Section */}
              <div className="mt-12 bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Your Generated Documents</h3>
                </div>
                <div className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">No Documents Generated Yet</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Start with our free templates above, or upgrade to Pro for AI-powered customization.
                  </p>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Rocket className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Knowledge Hub Tab */}
          {activeTab === "knowledge-hub" && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Knowledge Hub</h2>
                <p className="text-gray-600">Comprehensive guides and resources for startup success</p>
              </div>

              {/* Search */}
              <div className="mb-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search guides, articles, and resources..." className="pl-10" />
                </div>
              </div>

              {/* Featured Resources */}
              <div className="mb-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Featured Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredResources.map((resource) => (
                    <div
                      key={resource.title}
                      className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-6 border border-green-200"
                    >
                      <div className="mb-4">
                        <Badge className={resource.color}>{resource.category}</Badge>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{resource.title}</h4>
                      <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{resource.readTime}</span>
                        <Button size="sm" className="bg-teal-500 hover:bg-teal-600 text-white">
                          Read Guide
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Browse by Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Getting Started</h3>
                  <div className="space-y-4">
                    {[
                      { title: "Business Idea Validation", icon: "💡", reading: "Free Reading" },
                      { title: "Market Research Essentials", icon: "📊", reading: "Free Reading" },
                      { title: "Finding Co-founders", icon: "👥", reading: "Free Reading" },
                      { title: "Business Model Canvas", icon: "📋", reading: "Free Reading" },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{item.icon}</span>
                          <span className="font-medium text-gray-900">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.reading}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Legal & Compliance</h3>
                  <div className="space-y-4">
                    {[
                      { title: "Entity Formation Guide", icon: "🏢", reading: "Free Reading" },
                      { title: "Licenses & Permits", icon: "📜", reading: "Free Reading" },
                      { title: "Contracts & Agreements", icon: "📝", reading: "Free Reading" },
                      { title: "Payroll Basics & Compliance", icon: "💰", reading: "Free Reading" },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{item.icon}</span>
                          <span className="font-medium text-gray-900">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.reading}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Assistant CTA */}
              <div className="mt-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg p-8 text-center text-white">
                <h3 className="text-xl font-bold mb-2">Need Personal Help?</h3>
                <p className="mb-6">Get personalized guidance from our AI assistant or connect with experts.</p>
                <div className="flex gap-4 justify-center">
                  <Button className="bg-white text-teal-600 hover:bg-gray-100">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ask AI Assistant
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-teal-600 bg-transparent"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Consultation
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Startup Tools Tab */}
          {activeTab === "startup-tools" && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Startup Tools</h2>
                <p className="text-gray-600">Essential tools and calculators for your business</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: "Business Name Generator", icon: Target, description: "Generate unique business names" },
                  { name: "Domain Checker", icon: Globe, description: "Check domain availability" },
                  { name: "ROI Calculator", icon: DollarSign, description: "Calculate return on investment" },
                  { name: "Startup Cost Calculator", icon: Calculator, description: "Estimate startup expenses" },
                  { name: "Market Size Calculator", icon: TrendingUp, description: "Analyze market opportunity" },
                  { name: "Break-even Calculator", icon: Target, description: "Calculate break-even point" },
                ].map((tool) => {
                  const Icon = tool.icon
                  return (
                    <Card key={tool.name} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Icon className="h-5 w-5 text-teal-600" />
                          {tool.name}
                        </CardTitle>
                        <CardDescription>{tool.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full bg-teal-500 hover:bg-teal-600 text-white">Launch Tool</Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === "compliance" && (
            <div className="p-8">
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Smart Compliance Center</h2>
                    <p className="text-gray-600">Automated compliance tracking with state-specific deadlines</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Setup
                    </Button>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Calendar
                    </Button>
                    <Button className="bg-teal-500 hover:bg-teal-600 text-white" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {[
                  { label: "Completed", count: 0, color: "text-green-600", bg: "bg-green-50" },
                  { label: "In Progress", count: 0, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Pending", count: 11, color: "text-orange-600", bg: "bg-orange-50" },
                  { label: "Overdue", count: 0, color: "text-red-600", bg: "bg-red-50" },
                  { label: "Overall", count: "0%", color: "text-gray-600", bg: "bg-gray-50" },
                ].map((stat) => (
                  <div key={stat.label} className={`${stat.bg} rounded-lg p-4 text-center`}>
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Filter */}
              <div className="mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Filter by Category:</span>
                  <Button variant="outline" size="sm" className="bg-blue-50 text-blue-700 border-blue-200">
                    All Categories
                  </Button>
                </div>
              </div>

              {/* Tasks */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="space-y-0">
                  {complianceTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className={`p-4 ${index !== complianceTasks.length - 1 ? "border-b border-gray-100" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-6 h-6 border-2 border-orange-400 rounded-full flex items-center justify-center">
                            <Clock className="h-3 w-3 text-orange-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{task.task}</h4>
                            <p className="text-sm text-gray-600">{task.description}</p>
                            {task.dueDate && <p className="text-xs text-gray-500 mt-1">{task.dueDate}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.category}
                          </Badge>
                          <Badge className="bg-orange-100 text-orange-800 text-xs">Pending</Badge>
                          <Button size="sm" variant="outline">
                            Start
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Disclaimer:</strong> The compliance deadlines and due filing dates shown are based on a
                    default December 31 year-end and general entity type assumptions. Actual filing obligations may vary
                    based on your business's first year, state-specific rules, or other circumstances. Always consult a
                    licensed tax professional for personalized guidance.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

