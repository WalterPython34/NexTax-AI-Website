"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  MessageSquare,
  FileText,
  Shield,
  Home,
  BookOpen,
  Settings,
  TrendingUp,
  Users,
  Building2,
  CheckCircle,
  Plus,
} from "lucide-react"

// Sidebar Navigation Component
function Sidebar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "chat", label: "AI Chat", icon: MessageSquare },
    { id: "roadmap", label: "Progress Roadmap", icon: TrendingUp },
    { id: "documents", label: "Document Center", icon: FileText },
    { id: "knowledge", label: "Knowledge Hub", icon: BookOpen },
    { id: "tools", label: "Startup Tools", icon: Settings },
    { id: "compliance", label: "Compliance", icon: Shield },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">StartSmart</h1>
            <p className="text-xs text-gray-500">by NexTax.AI</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === item.id ? "bg-teal-500 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2">Theme</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-900 rounded-full cursor-pointer"></div>
          <div className="w-4 h-4 bg-white border border-gray-300 rounded-full cursor-pointer"></div>
        </div>
      </div>
    </div>
  )
}

// AI Chat Component
function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Welcome to StartSmart! I'm your AI sidekick, ready to help you navigate every step of starting your business.\n\nWhether you need help with entity formation, compliance, financial planning, or market research, I'm here to guide you through it all. What would you like to work on today?",
    },
  ])
  const [input, setInput] = useState("")

  const quickActions = [
    { label: "Entity Formation", icon: "🏢" },
    { label: "Business Plan", icon: "📋" },
    { label: "Tax Setup", icon: "💰" },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Sidekick</h2>
            <p className="text-gray-600">Ready to help launch your business</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Free</Badge>
            <span className="text-sm text-gray-500">4/10 messages remaining</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className="flex gap-3">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800 whitespace-pre-line">{message.content}</p>
                </div>
                {index === 0 && (
                  <div className="flex gap-2 mt-3">
                    {quickActions.map((action, i) => (
                      <Button key={i} variant="outline" size="sm" className="text-xs bg-transparent">
                        {action.icon} {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 p-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about starting your business..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <Button className="bg-teal-500 hover:bg-teal-600">
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  )
}

// Progress Roadmap Component
function ProgressRoadmap() {
  const phases = [
    {
      id: 1,
      title: "Legal Phase",
      progress: 100,
      status: "In Progress",
      tasks: [
        { title: "Check Business Name Availability", completed: true, date: "7/7/2025" },
        { title: "Appoint Registered Agent", completed: false },
        { title: "Prepare Operating Agreement", completed: false },
      ],
    },
    {
      id: 2,
      title: "Financial Phase",
      progress: 50,
      status: "In Progress",
      tasks: [
        { title: "Obtain EIN (Employer Identification Number)", completed: true, date: "7/7/2025" },
        { title: "Open Business Bank Account", completed: false },
        { title: "Set Up Business Accounting", completed: false },
      ],
    },
    {
      id: 3,
      title: "Compliance Phase",
      progress: 0,
      status: "Pending",
      tasks: [{ title: "Register for State and Local Taxes", completed: false }],
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Launch Roadmap</h2>
          <p className="text-gray-600">Track your progress through each phase of starting your business</p>
        </div>
        <Button className="bg-teal-500 hover:bg-teal-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Custom Task
        </Button>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-3xl font-bold text-gray-900">29%</div>
          <div>
            <div className="text-sm text-gray-600">Overall Progress</div>
            <div className="text-sm text-gray-500">2 of 7 steps complete</div>
          </div>
        </div>
        <Progress value={29} className="h-2" />
      </div>

      <div className="space-y-6">
        {phases.map((phase) => (
          <Card key={phase.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    {phase.id}
                  </div>
                  {phase.title}
                </CardTitle>
                <Badge variant={phase.status === "In Progress" ? "default" : "secondary"}>{phase.status}</Badge>
              </div>
              <Progress value={phase.progress} className="h-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {phase.tasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        task.completed ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${task.completed ? "text-gray-500 line-through" : "text-gray-900"}`}>
                        {task.title}
                      </div>
                      {task.date && <div className="text-sm text-gray-500">Completed {task.date}</div>}
                    </div>
                    <Button variant="outline" size="sm">
                      Start
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Document Center Component
function DocumentCenter() {
  const documentCategories = [
    {
      title: "Legal Documents",
      icon: "⚖️",
      documents: [
        {
          name: "Operating Agreement",
          description: "Essential document outlining ownership and operations for LLCs",
          type: "Pro",
        },
        {
          name: "Articles of Incorporation",
          description: "Official document to establish your corporation with the state",
          type: "Pro",
        },
        {
          name: "Corporate Bylaws",
          description: "Internal rules and procedures for corporation management",
          type: "Pro",
        },
      ],
    },
    {
      title: "Tax & Finance",
      icon: "💰",
      documents: [
        { name: "SS-4 EIN Form", description: "IRS form to obtain your business Tax ID number", type: "Premium" },
        {
          name: "Chart of Accounts",
          description: "Organized structure for tracking business financial transactions",
          type: "Pro",
        },
        { name: "Budget Template", description: "Track startup costs and ongoing expenses", type: "Pro" },
      ],
    },
    {
      title: "Business Plans",
      icon: "📋",
      documents: [
        {
          name: "Executive Summary",
          description: "Compelling overview of your business for investors and partners",
          type: "Premium",
        },
        { name: "Lean Canvas", description: "One-page business model focusing on key assumptions", type: "Premium" },
        {
          name: "Business Plan for Startups",
          description: "Complete 10-section business plan template for startups and investors",
          type: "Premium",
        },
      ],
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Document Generation Center</h2>
        <p className="text-gray-600">AI-powered templates and legal documents for your startup</p>
      </div>

      <div className="space-y-8">
        {documentCategories.map((category, index) => (
          <div key={index}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{category.icon}</span>
              <h3 className="text-xl font-semibold text-gray-900">{category.title}</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {category.documents.map((doc, docIndex) => (
                <Card key={docIndex}>
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-2">{doc.name}</h4>
                    <p className="text-sm text-gray-600 mb-4">{doc.description}</p>

                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        👁️ View Template
                      </Button>
                      <Button
                        size="sm"
                        className={`w-full ${doc.type === "Premium" ? "bg-purple-500 hover:bg-purple-600" : "bg-blue-500 hover:bg-blue-600"}`}
                      >
                        ✨ Create with AI
                        <Badge variant="secondary" className="ml-2">
                          {doc.type}
                        </Badge>
                      </Button>
                      <Button variant="outline" size="sm" className="w-full bg-teal-500 text-white hover:bg-teal-600">
                        🤝 Let NexTax.AI Help
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Your Generated Documents</h3>
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No Documents Generated Yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Start with our free templates above, or upgrade to Pro for AI-powered customization.
          </p>
          <Button className="bg-blue-500 hover:bg-blue-600">⬆️ Upgrade to Pro</Button>
        </div>
      </div>
    </div>
  )
}

// Knowledge Hub Component
function KnowledgeHub() {
  const featuredResources = [
    {
      title: "LLC vs S-Corp: Complete Guide",
      description: "Understand the key differences and choose the right entity structure for your business.",
      readTime: "8 min read",
      category: "Essential",
      color: "bg-green-100 text-green-800",
    },
    {
      title: "Tax Setup for New Businesses",
      description: "Step-by-step guide to EIN application, tax elections, and compliance requirements.",
      readTime: "12 min read",
      category: "Financial",
      color: "bg-blue-100 text-blue-800",
    },
    {
      title: "Market Research Essentials",
      description: "Learn how to validate your business idea and understand your target market.",
      readTime: "15 min read",
      category: "Strategy",
      color: "bg-purple-100 text-purple-800",
    },
  ]

  const categories = [
    {
      title: "Getting Started",
      items: ["Business Idea Validation", "Market Research Essentials", "Finding Co-founders", "Business Model Canvas"],
    },
    {
      title: "Legal & Compliance",
      items: ["Entity Formation Guide", "Licenses & Permits", "Contracts & Agreements", "Payroll Basics & Compliance"],
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Knowledge Hub</h2>
        <p className="text-gray-600">Comprehensive guides and resources for startup success</p>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="Search guides, articles, and resources..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Featured Resources</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {featuredResources.map((resource, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Badge className={resource.color}>{resource.category}</Badge>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{resource.title}</h4>
                <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{resource.readTime}</span>
                  <Button variant="outline" size="sm">
                    Read Guide
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {categories.map((category, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{category.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{item}</span>
                      <span className="text-xs text-orange-600">🆓 Free Reading</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// Compliance Center Component
function ComplianceCenter() {
  const [showSetup, setShowSetup] = useState(false)

  const complianceStats = [
    { label: "Completed", count: 0, color: "text-green-600" },
    { label: "In Progress", count: 0, color: "text-yellow-600" },
    { label: "Pending", count: 11, color: "text-orange-600" },
    { label: "Overdue", count: 0, color: "text-red-600" },
    { label: "Overall", count: "0%", color: "text-teal-600" },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Smart Compliance Center</h2>
          <p className="text-gray-600">Automated compliance tracking with state-specific deadlines</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">⚙️ Setup</Button>
          <Button className="bg-teal-500 hover:bg-teal-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {complianceStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Filter by Category:</span>
          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
            <option>All Categories</option>
          </select>
        </div>
      </div>

      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Compliance Tasks Yet</h3>
        <p className="text-gray-600 mb-6">
          Get started by setting up your compliance profile to automatically generate state-specific tasks and
          deadlines, or add custom tasks manually.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => setShowSetup(true)} className="bg-teal-500 hover:bg-teal-600">
            🔧 Setup Compliance Profile
          </Button>
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Task
          </Button>
        </div>
      </div>

      {showSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Compliance Setup</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSetup(false)}>
                  ×
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Set up your compliance profile to get personalized task recommendations and state-specific deadlines.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State of Formation *</label>
                <input
                  type="text"
                  placeholder="Select your state"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type *</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option>Select entity type</option>
                  <option>LLC</option>
                  <option>Corporation</option>
                  <option>Partnership</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year End</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option>December</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input
                  type="text"
                  placeholder="e.g., Technology, Consulting, Retail"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Activities</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Will have employees</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Will sell products/services (sales tax)</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowSetup(false)} className="flex-1">
                  Skip for Now
                </Button>
                <Button className="bg-teal-500 hover:bg-teal-600 flex-1">Create Profile</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Home Component
function HomeComponent() {
  return (
    <div className="p-6">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Your AI Sidekick & <span className="text-teal-500">LaunchPad</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Navigate every step of starting your business with AI-powered guidance, automated document generation, and
          comprehensive compliance tracking. From idea to launch in record time.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-8 mb-12">
        {[
          { label: "50+", sublabel: "States Supported", color: "text-teal-500" },
          { label: "1000+", sublabel: "Businesses Launched", color: "text-green-500" },
          { label: "24/7", sublabel: "AI Support", color: "text-blue-500" },
          { label: "100%", sublabel: "Compliance Ready", color: "text-purple-500" },
        ].map((stat, index) => (
          <div key={index} className="text-center">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.label}</div>
            <div className="text-gray-600">{stat.sublabel}</div>
          </div>
        ))}
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Everything You Need to Start Smart</h2>
        <p className="text-gray-600 text-center mb-8">
          From business planning to compliance tracking, StartSmart guides you through every step of your
          entrepreneurial journey.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: MessageSquare,
              title: "AI-Powered Guidance",
              description:
                "Get instant, personalized advice on entity formation, compliance requirements, and business strategy from our advanced AI assistant.",
              color: "bg-teal-100 text-teal-600",
            },
            {
              icon: FileText,
              title: "Document Generation",
              description:
                "Automatically generate legal documents, business plans, tax forms, and compliance paperwork tailored to your specific business needs.",
              color: "bg-blue-100 text-blue-600",
            },
            {
              icon: TrendingUp,
              title: "Progress Tracking",
              description:
                "Visual roadmap with step-by-step guidance, deadline tracking, and progress monitoring to keep your business launch on track.",
              color: "bg-green-100 text-green-600",
            },
            {
              icon: Shield,
              title: "Compliance Assurance",
              description:
                "Stay compliant with federal and state requirements. Get alerts for filing deadlines, tax obligations, and regulatory changes.",
              color: "bg-purple-100 text-purple-600",
            },
            {
              icon: Users,
              title: "Expert Network",
              description:
                "Access to vetted professionals including lawyers, accountants, and business consultants when you need specialized help.",
              color: "bg-orange-100 text-orange-600",
            },
            {
              icon: Settings,
              title: "Launch Acceleration",
              description:
                "Streamlined workflows and automation tools to help you launch faster, from business formation to first customer acquisition.",
              color: "bg-pink-100 text-pink-600",
            },
          ].map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="bg-teal-50 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Your Business Journey?</h2>
        <p className="text-gray-600 mb-6">
          Join thousands of entrepreneurs who've successfully launched their businesses with StartSmart's AI-powered
          guidance.
        </p>
        <div className="flex gap-4 justify-center">
          <Button className="bg-teal-500 hover:bg-teal-600">🚀 Get Started Free</Button>
          <Button variant="outline">📧 Schedule Consultation</Button>
        </div>
        <p className="text-xs text-gray-500 mt-4">No credit card required • Free forever plan available</p>
      </div>
    </div>
  )
}

export default function StartSmartGPT() {
  const [activeTab, setActiveTab] = useState("home")

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeComponent />
      case "chat":
        return <AIChat />
      case "roadmap":
        return <ProgressRoadmap />
      case "documents":
        return <DocumentCenter />
      case "knowledge":
        return <KnowledgeHub />
      case "compliance":
        return <ComplianceCenter />
      default:
        return <HomeComponent />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  )
}
