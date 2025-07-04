"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  FileText,
  Calculator,
  Calendar,
  Send,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Bot,
  Building,
  TrendingUp,
  Shield,
} from "lucide-react"

export default function StartSmartGPTApp() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm StartSmart GPT, your AI business advisor. I can help you with business formation, tax planning, compliance, and growth strategies. What would you like to know?",
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Startup Cost Calculator State
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

  const totalStartupCost = Object.values(startupCosts).reduce((sum, cost) => sum + cost, 0)

  // Compliance Tasks State
  const [complianceTasks] = useState([
    { id: 1, task: "File Articles of Incorporation", dueDate: "2025-01-15", status: "pending", priority: "high" },
    { id: 2, task: "Obtain EIN from IRS", dueDate: "2025-01-20", status: "in-progress", priority: "high" },
    { id: 3, task: "Register for State Taxes", dueDate: "2025-01-25", status: "pending", priority: "medium" },
    { id: 4, task: "Open Business Bank Account", dueDate: "2025-02-01", status: "pending", priority: "medium" },
    { id: 5, task: "File Initial Report", dueDate: "2025-03-15", status: "pending", priority: "low" },
  ])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = { role: "user", content: inputMessage }
    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Based on your business goals, I recommend starting with an LLC structure for flexibility and tax benefits.",
        "For your industry, you'll need to consider these key compliance requirements...",
        "Here's a breakdown of the startup costs you should budget for...",
        "I can help you generate the necessary documents for business formation.",
        "Let me walk you through the tax implications of different business structures.",
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      setMessages((prev) => [...prev, { role: "assistant", content: randomResponse }])
      setIsLoading(false)
    }, 1500)
  }

  const handleCostChange = (category: string, value: number) => {
    setStartupCosts((prev) => ({ ...prev, [category]: value }))
  }

  const generateDocument = (docType: string) => {
    alert(`Generating ${docType}... This would create a customized document based on your business information.`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">StartSmart GPT</h1>
              <p className="text-sm text-gray-600">Your AI Business Success Partner</p>
            </div>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800">✨ AI-Powered Business Advisor</Badge>
        </div>
      </div>

      {/* Main App Container */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Cost Calculator
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Compliance
            </TabsTrigger>
          </TabsList>

          {/* AI Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                  AI Business Advisor Chat
                </CardTitle>
                <CardDescription>
                  Get expert guidance on business formation, compliance, and growth strategies
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === "user" ? "bg-emerald-600 text-white" : "bg-white text-gray-900 border"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-900 border p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                          StartSmart GPT is thinking...
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me about business formation, taxes, compliance..."
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={isLoading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Legal Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-5 w-5 text-emerald-600" />
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
                    <Calculator className="h-5 w-5 text-emerald-600" />
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
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
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
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-emerald-600" />
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
                <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Total Startup Cost</h3>
                      <p className="text-sm text-gray-600">Estimated initial investment needed</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-emerald-600">${totalStartupCost.toLocaleString()}</div>
                      <p className="text-sm text-gray-600">USD</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  Compliance Tracker
                </CardTitle>
                <CardDescription>Stay on top of important business deadlines and requirements</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

