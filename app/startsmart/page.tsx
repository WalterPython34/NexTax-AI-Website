"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  MessageSquare,
  FileText,
  Calculator,
  CheckCircle,
  Send,
  Download,
  Building,
  AlertCircle,
  Shield,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ComplianceItem {
  id: string
  title: string
  description: string
  status: "pending" | "in-progress" | "completed"
  dueDate?: Date
  priority: "low" | "medium" | "high"
}

export default function StartSmartGPT() {
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState("chat")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Welcome to StartSmart GPT! I'm here to help you with business formation, tax planning, and compliance. What would you like to know?",
      timestamp: new Date(),
    },
  ])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [businessName, setBusinessName] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [revenue, setRevenue] = useState("")
  const [expenses, setExpenses] = useState("")
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([
    {
      id: "1",
      title: "File Articles of Incorporation",
      description: "Submit your articles of incorporation to the state",
      status: "pending",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priority: "high",
    },
    {
      id: "2",
      title: "Obtain EIN",
      description: "Apply for an Employer Identification Number from the IRS",
      status: "in-progress",
      priority: "high",
    },
    {
      id: "3",
      title: "Set up Business Bank Account",
      description: "Open a dedicated business banking account",
      status: "pending",
      priority: "medium",
    },
  ])

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: newMessage,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setNewMessage("")
    setIsLoading(true)

    try {
      // Simulate AI response
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `I understand you're asking about "${newMessage}". Based on your business needs, I recommend considering the following steps: 1) Review your current business structure, 2) Ensure compliance with local regulations, 3) Consider tax implications. Would you like me to elaborate on any of these points?`,
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, aiResponse])
        setIsLoading(false)
      }, 1500)
    } catch (error) {
      console.error("Error sending message:", error)
      setIsLoading(false)
    }
  }

  const calculateTaxEstimate = () => {
    const revenueNum = Number.parseFloat(revenue) || 0
    const expensesNum = Number.parseFloat(expenses) || 0
    const profit = revenueNum - expensesNum
    const estimatedTax = profit > 0 ? profit * 0.25 : 0 // Simplified 25% tax rate
    return estimatedTax
  }

  const generateDocument = (type: string) => {
    // Simulate document generation
    alert(`Generating ${type} document... This feature will be available soon!`)
  }

  const updateComplianceStatus = (id: string, status: ComplianceItem["status"]) => {
    setComplianceItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "default"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "in-progress":
        return "text-yellow-600"
      case "pending":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">Welcome to StartSmart GPT</h1>
              <p className="text-xl text-slate-300 mb-8">
                Your AI-powered business formation and tax planning assistant
              </p>
            </div>

            <Alert className="mb-8 border-yellow-500 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-200">
                Please sign in to access StartSmart GPT and begin your business formation journey.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <MessageSquare className="w-8 h-8 text-emerald-400 mb-2" />
                  <CardTitle className="text-white">AI Chat Assistant</CardTitle>
                  <CardDescription className="text-slate-300">
                    Get instant answers to your business formation questions
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <FileText className="w-8 h-8 text-cyan-400 mb-2" />
                  <CardTitle className="text-white">Document Generator</CardTitle>
                  <CardDescription className="text-slate-300">
                    Generate essential business documents automatically
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <Calculator className="w-8 h-8 text-purple-400 mb-2" />
                  <CardTitle className="text-white">Tax Calculator</CardTitle>
                  <CardDescription className="text-slate-300">
                    Estimate your business taxes and plan accordingly
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <Shield className="w-8 h-8 text-orange-400 mb-2" />
                  <CardTitle className="text-white">Compliance Tracker</CardTitle>
                  <CardDescription className="text-slate-300">
                    Stay on top of important deadlines and requirements
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8 py-3"
              onClick={() => (window.location.href = "/pricing")}
            >
              Get Started with StartSmart
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">StartSmart GPT</h1>
          <p className="text-slate-300">Your AI-powered business formation assistant</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700">
            <TabsTrigger value="chat" className="data-[state=active]:bg-emerald-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-cyan-600">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="calculator" className="data-[state=active]:bg-purple-600">
              <Calculator className="w-4 h-4 mr-2" />
              Calculator
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-orange-600">
              <CheckCircle className="w-4 h-4 mr-2" />
              Compliance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-emerald-400" />
                  AI Business Assistant
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Ask questions about business formation, tax planning, and compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === "user" ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-100"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-700 text-slate-100 px-4 py-2 rounded-lg">
                        <p className="text-sm">Thinking...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ask about business formation, taxes, or compliance..."
                    className="bg-slate-700 border-slate-600 text-white"
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-cyan-400" />
                    Articles of Incorporation
                  </CardTitle>
                  <CardDescription className="text-slate-300">Generate your articles of incorporation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => generateDocument("Articles of Incorporation")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-cyan-400" />
                    Operating Agreement
                  </CardTitle>
                  <CardDescription className="text-slate-300">Create your LLC operating agreement</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => generateDocument("Operating Agreement")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-cyan-400" />
                    Bylaws
                  </CardTitle>
                  <CardDescription className="text-slate-300">Generate corporate bylaws</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => generateDocument("Bylaws")} className="w-full bg-cyan-600 hover:bg-cyan-700">
                    <Download className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-cyan-400" />
                    EIN Application
                  </CardTitle>
                  <CardDescription className="text-slate-300">Prepare your EIN application</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => generateDocument("EIN Application")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-cyan-400" />
                    Business Plan
                  </CardTitle>
                  <CardDescription className="text-slate-300">Create a comprehensive business plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => generateDocument("Business Plan")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-cyan-400" />
                    Shareholder Agreement
                  </CardTitle>
                  <CardDescription className="text-slate-300">Draft shareholder agreements</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => generateDocument("Shareholder Agreement")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calculator" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Calculator className="w-5 h-5 mr-2 text-purple-400" />
                  Business Tax Calculator
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Estimate your business taxes and plan your finances
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Business Name</label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Enter your business name"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Business Type</label>
                    <Input
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      placeholder="LLC, Corporation, etc."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Annual Revenue ($)</label>
                    <Input
                      type="number"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      placeholder="0"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Annual Expenses ($)</label>
                    <Input
                      type="number"
                      value={expenses}
                      onChange={(e) => setExpenses(e.target.value)}
                      placeholder="0"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                {revenue && expenses && (
                  <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Tax Estimate</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-300">Gross Revenue</p>
                        <p className="text-xl font-bold text-emerald-400">
                          ${Number.parseFloat(revenue || "0").toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-300">Total Expenses</p>
                        <p className="text-xl font-bold text-red-400">
                          ${Number.parseFloat(expenses || "0").toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-300">Estimated Tax</p>
                        <p className="text-xl font-bold text-purple-400">${calculateTaxEstimate().toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-400">
                      * This is a simplified estimate. Consult with a tax professional for accurate calculations.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-orange-400" />
                  Compliance Tracker
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Stay on top of important business requirements and deadlines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceItems.map((item) => (
                    <div key={item.id} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{item.title}</h3>
                          <p className="text-sm text-slate-300 mt-1">{item.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getPriorityColor(item.priority)}>{item.priority}</Badge>
                          <span className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                            {item.status.replace("-", " ")}
                          </span>
                        </div>
                      </div>
                      {item.dueDate && (
                        <p className="text-xs text-slate-400 mb-3">Due: {item.dueDate.toLocaleDateString()}</p>
                      )}
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateComplianceStatus(item.id, "in-progress")}
                          className="border-slate-600 text-slate-300 hover:bg-slate-600"
                        >
                          Start
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateComplianceStatus(item.id, "completed")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Complete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

