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
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Building,
  TrendingUp,
  Shield,
  Rocket,
  BookOpen,
  Settings,
  Home,
  DollarSign,
  Target,
  Globe,
  ArrowRight,
} from "lucide-react"

export default function TestStartSmartApp() {
  const [activeTab, setActiveTab] = useState("home")
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Welcome to StartSmart GPT! I'm your AI business advisor ready to help you launch your business. What would you like to know?",
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

  // Startup cost calculator state
  const [startupCosts, setStartupCosts] = useState({
    businessRegistration: 500,
    licenses: 1000,
    equipment: 5000,
    marketing: 2000,
    operatingCapital: 10000,
    legal: 1500,
    insurance: 1200,
    other: 0,
  })

  // Compliance tasks state
  const [complianceTasks] = useState([
    { id: 1, task: "File Articles of Incorporation", dueDate: "2025-01-15", status: "pending", priority: "high" },
    { id: 2, task: "Obtain EIN from IRS", dueDate: "2025-01-20", status: "in-progress", priority: "high" },
    { id: 3, task: "Register for State Taxes", dueDate: "2025-01-25", status: "pending", priority: "medium" },
    { id: 4, task: "Open Business Bank Account", dueDate: "2025-02-01", status: "pending", priority: "medium" },
    { id: 5, task: "File Initial Report", dueDate: "2025-03-15", status: "pending", priority: "low" },
  ])

  // Progress roadmap state
  const [roadmapSteps] = useState([
    {
      id: 1,
      title: "Business Idea Validation",
      completed: true,
      description: "Validate your business concept and market demand",
    },
    { id: 2, title: "Market Research", completed: false, description: "Analyze your target market and competition" },
    { id: 3, title: "Business Plan Creation", completed: false, description: "Develop a comprehensive business plan" },
    {
      id: 4,
      title: "Legal Structure Setup",
      completed: false,
      description: "Choose and register your business structure",
    },
    {
      id: 5,
      title: "Financial Planning",
      completed: false,
      description: "Set up accounting and financial projections",
    },
    { id: 6, title: "Launch Preparation", completed: false, description: "Prepare for your business launch" },
  ])

  const totalStartupCost = Object.values(startupCosts).reduce((sum, cost) => sum + cost, 0)
  const completedSteps = roadmapSteps.filter((step) => step.completed).length
  const progressPercentage = (completedSteps / roadmapSteps.length) * 100

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

  const handleCostChange = (category: string, value: number) => {
    setStartupCosts((prev) => ({ ...prev, [category]: value }))
  }

  const generateDocument = (docType: string) => {
    alert(`Generating ${docType}... This would create a customized document based on your business information.`)
  }

  const sidebarItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "chat", label: "AI Chat", icon: MessageSquare },
    { id: "roadmap", label: "Progress Roadmap", icon: Rocket },
    { id: "documents", label: "Document Center", icon: FileText },
    { id: "knowledge", label: "Knowledge Hub", icon: BookOpen },
    { id: "tools", label: "Startup Tools", icon: Settings },
    { id: "compliance", label: "Compliance", icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">StartSmart</h1>
              <p className="text-sm text-gray-600">by NexTax.AI - Testing Environment</p>
            </div>
          </div>
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>🧪 TEST MODE
          </Badge>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <nav className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === item.id
                      ? "bg-teal-50 text-teal-700 border border-teal-200"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Home Tab */}
          {activeTab === "home" && (
            <div className="p-8">
              {/* Hero Section */}
              <div className="text-center mb-12">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Rocket className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Your AI Sidekick &{" "}
                  <span className="bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
                    LaunchPad
                  </span>
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                  Navigate every step of starting your business with AI-powered guidance, automated document generation,
                  and comprehensive compliance tracking. From idea to launch in record time.
                </p>
                <Button
                  onClick={() => setActiveTab("chat")}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-3 text-lg"
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                <div className="text-center">
                  <div className="text-3xl font-bold text-teal-500 mb-2">50+</div>
                  <div className="text-gray-600">States Supported</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-teal-500 mb-2">1000+</div>
                  <div className="text-gray-600">Businesses Launched</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-teal-500 mb-2">24/7</div>
                  <div className="text-gray-600">AI Support</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-teal-500 mb-2">100%</div>
                  <div className="text-gray-600">Compliance Ready</div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-teal-600" />
                      AI Business Advisor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Get instant answers to your business questions from our AI advisor.</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-teal-600" />
                      Document Generation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Automatically generate legal documents and business plans.</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-teal-600" />
                      Compliance Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Stay compliant with automated deadline tracking and reminders.</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-teal-600" />
                      Financial Planning
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Calculate startup costs and create financial projections.</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="h-5 w-5 text-teal-600" />
                      Launch Roadmap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Follow a step-by-step roadmap to launch your business.</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-teal-600" />
                      Knowledge Hub
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Access comprehensive guides and business resources.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* AI Chat Tab */}
          {activeTab === "chat" && (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-teal-600" />
                  AI Business Advisor
                </h2>
                <p className="text-gray-600 mt-1">
                  Get expert guidance on business formation, compliance, and growth strategies
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] p-4 rounded-lg ${
                        message.role === "user"
                          ? "bg-teal-600 text-white"
                          : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-900 border border-gray-200 shadow-sm p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                        StartSmart GPT is thinking...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex gap-3">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me about business formation, taxes, compliance, or any business question..."
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
          {activeTab === "roadmap" && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <Rocket className="h-6 w-6 text-teal-600" />
                  Progress Roadmap
                </h2>
                <p className="text-gray-600">Track your business launch progress and milestones</p>
              </div>

              {/* Progress Overview */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Overall Progress</CardTitle>
                  <CardDescription>
                    {completedSteps} of {roadmapSteps.length} steps completed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={progressPercentage} className="mb-2" />
                  <p className="text-sm text-gray-600">{Math.round(progressPercentage)}% Complete</p>
                </CardContent>
              </Card>

              {/* Roadmap Steps */}
              <div className="space-y-4">
                {roadmapSteps.map((step, index) => (
                  <Card key={step.id} className={step.completed ? "bg-green-50 border-green-200" : ""}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {step.completed ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <div className="h-6 w-6 border-2 border-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${step.completed ? "text-green-900" : "text-gray-900"}`}>
                            {step.title}
                          </h3>
                          <p className={`text-sm mt-1 ${step.completed ? "text-green-700" : "text-gray-600"}`}>
                            {step.description}
                          </p>
                          {!step.completed && (
                            <Button variant="outline" size="sm" className="mt-3 bg-transparent">
                              Start Step
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Document Center Tab */}
          {activeTab === "documents" && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <FileText className="h-6 w-6 text-teal-600" />
                  Document Center
                </h2>
                <p className="text-gray-600">Generate and manage your business documents</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Legal Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5 text-teal-600" />
                      Legal Documents
                    </CardTitle>
                    <CardDescription>Essential legal paperwork for your business</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      onClick={() => generateDocument("Articles of Incorporation")}
                    >
                      Articles of Incorporation
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      onClick={() => generateDocument("Operating Agreement")}
                    >
                      Operating Agreement
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      onClick={() => generateDocument("Corporate Bylaws")}
                    >
                      Corporate Bylaws
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Tax Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-teal-600" />
                      Tax Documents
                    </CardTitle>
                    <CardDescription>Tax forms and planning documents</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      onClick={() => generateDocument("SS-4 EIN Application")}
                    >
                      SS-4 EIN Application
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      onClick={() => generateDocument("Tax Election Forms")}
                    >
                      Tax Election Forms
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      onClick={() => generateDocument("Quarterly Tax Planner")}
                    >
                      Quarterly Tax Planner
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Business Plans */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-teal-600" />
                      Business Plans
                    </CardTitle>
                    <CardDescription>Strategic planning documents</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      onClick={() => generateDocument("Executive Summary")}
                    >
                      Executive Summary
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      onClick={() => generateDocument("Business Plan")}
                    >
                      Full Business Plan
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      onClick={() => generateDocument("Financial Projections")}
                    >
                      Financial Projections
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Knowledge Hub Tab */}
          {activeTab === "knowledge" && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <BookOpen className="h-6 w-6 text-teal-600" />
                  Knowledge Hub
                </h2>
                <p className="text-gray-600">Access business guides, templates, and resources</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Business Formation Guide</CardTitle>
                    <CardDescription>Complete guide to choosing and setting up your business structure</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Read Guide
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tax Planning Essentials</CardTitle>
                    <CardDescription>Understanding business taxes and optimization strategies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Read Guide
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Checklist</CardTitle>
                    <CardDescription>State-by-state compliance requirements and deadlines</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      <BookOpen className="h-4 w-4 mr-2" />
                      View Checklist
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Funding Options</CardTitle>
                    <CardDescription>Explore different funding sources for your business</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Learn More
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Startup Tools Tab */}
          {activeTab === "tools" && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <Settings className="h-6 w-6 text-teal-600" />
                  Startup Tools
                </h2>
                <p className="text-gray-600">Essential tools and calculators for your business</p>
              </div>

              {/* Startup Cost Calculator */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-teal-600" />
                    Startup Cost Calculator
                  </CardTitle>
                  <CardDescription>Calculate your initial business expenses and funding needs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Business Registration</label>
                        <Input
                          type="number"
                          value={startupCosts.businessRegistration}
                          onChange={(e) => handleCostChange("businessRegistration", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Licenses & Permits</label>
                        <Input
                          type="number"
                          value={startupCosts.licenses}
                          onChange={(e) => handleCostChange("licenses", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Equipment & Technology</label>
                        <Input
                          type="number"
                          value={startupCosts.equipment}
                          onChange={(e) => handleCostChange("equipment", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Marketing & Branding</label>
                        <Input
                          type="number"
                          value={startupCosts.marketing}
                          onChange={(e) => handleCostChange("marketing", Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Operating Capital</label>
                        <Input
                          type="number"
                          value={startupCosts.operatingCapital}
                          onChange={(e) => handleCostChange("operatingCapital", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Legal & Professional</label>
                        <Input
                          type="number"
                          value={startupCosts.legal}
                          onChange={(e) => handleCostChange("legal", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Insurance</label>
                        <Input
                          type="number"
                          value={startupCosts.insurance}
                          onChange={(e) => handleCostChange("insurance", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Other Expenses</label>
                        <Input
                          type="number"
                          value={startupCosts.other}
                          onChange={(e) => handleCostChange("other", Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 p-6 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Total Startup Cost</h3>
                        <p className="text-sm text-gray-600">Estimated initial investment needed</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-teal-600">${totalStartupCost.toLocaleString()}</div>
                        <p className="text-sm text-gray-600">USD</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Other Tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-teal-600" />
                      Business Name Generator
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">Generate Names</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-teal-600" />
                      Domain Checker
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">Check Availability</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-teal-600" />
                      ROI Calculator
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">Calculate ROI</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === "compliance" && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <Shield className="h-6 w-6 text-teal-600" />
                  Compliance Tracker
                </h2>
                <p className="text-gray-600">Stay on top of important business deadlines and requirements</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">1</div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">4</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <div className="text-sm text-gray-600">Overdue</div>
                </div>
              </div>

              {/* Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Tasks</CardTitle>
                  <CardDescription>Track your business compliance requirements and deadlines</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          {task.status === "completed" && <CheckCircle className="h-5 w-5 text-green-600" />}
                          {task.status === "in-progress" && <Clock className="h-5 w-5 text-blue-600" />}
                          {task.status === "pending" && <AlertCircle className="h-5 w-5 text-orange-600" />}
                          <div>
                            <div className="font-medium text-gray-900">{task.task}</div>
                            <div className="text-sm text-gray-600">Due: {task.dueDate}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              task.priority === "high"
                                ? "destructive"
                                : task.priority === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {task.priority}
                          </Badge>
                          <Badge
                            variant={task.status === "completed" ? "default" : "outline"}
                            className={
                              task.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : task.status === "in-progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-orange-100 text-orange-800"
                            }
                          >
                            {task.status.replace("-", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
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
