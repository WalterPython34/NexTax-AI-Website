"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import UpgradeModal from "@/components/ui/upgrade-modal"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useAiUsage } from "@/hooks/useAiUsage"
import {
  FileText,
  Download,
  Eye,
  Scale,
  Calculator,
  GanttChartIcon as ChartGantt,
  Lock,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import type { Document, User } from "@shared/schema"
import { isUnauthorizedError } from "@/lib/authUtils"
import OperatingAgreementGenerator from "@/components/OperatingAgreementGenerator"
import { ArticlesOfIncorporationGenerator } from "@/components/ArticlesOfIncorporationGenerator"
import { CorporateBylawsGenerator } from "@/components/CorporateBylawsGenerator"
import { ExecutiveSummaryGenerator } from "@/components/ExecutiveSummaryGenerator"
import { BusinessPlanGenerator } from "@/components/BusinessPlanGenerator"
import { ChartOfAccountsGenerator } from "@/components/ChartOfAccountsGenerator"
import { ExpenseTrackerGenerator } from "@/components/ExpenseTrackerGenerator"
import { LeanCanvasGenerator } from "@/components/LeanCanvasGenerator"

export function DocumentCenter() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [upgradeDialog, setUpgradeDialog] = useState<{
    open: boolean
    feature: string
    plan: "pro" | "ein"
  }>({ open: false, feature: "", plan: "pro" })
  const [showOperatingAgreementReader, setShowOperatingAgreementReader] = useState(false)
  const [operatingAgreementContent, setOperatingAgreementContent] = useState("")
  const [showArticlesIncorpReader, setShowArticlesIncorpReader] = useState(false)
  const [articlesIncorpContent, setArticlesIncorpContent] = useState("")
  const [showCorporateBylawsReader, setShowCorporateBylawsReader] = useState(false)
  const [corporateBylawsContent, setCorporateBylawsContent] = useState("")
  const [showLeanCanvasViewer, setShowLeanCanvasViewer] = useState(false)
  const [showExecutiveSummaryReader, setShowExecutiveSummaryReader] = useState(false)
  const [executiveSummaryContent, setExecutiveSummaryContent] = useState("")
  const [showBusinessPlanStartupsReader, setShowBusinessPlanStartupsReader] = useState(false)
  const [businessPlanStartupsContent, setBusinessPlanStartupsContent] = useState("")
  const [showOperatingAgreementGenerator, setShowOperatingAgreementGenerator] = useState(false)
  const [showArticlesIncorporationGenerator, setShowArticlesIncorporationGenerator] = useState(false)
  const [showCorporateBylawsGenerator, setShowCorporateBylawsGenerator] = useState(false)
  const [showExecutiveSummaryGenerator, setShowExecutiveSummaryGenerator] = useState(false)
  const [showBusinessPlanGenerator, setShowBusinessPlanGenerator] = useState(false)
  const [showChartOfAccountsGenerator, setShowChartOfAccountsGenerator] = useState(false)
  const [showExpenseTrackerGenerator, setShowExpenseTrackerGenerator] = useState(false)
  const [showLeanCanvasGenerator, setShowLeanCanvasGenerator] = useState(false)
  const [documentViewerData, setDocumentViewerData] = useState<{ title: string; content: string } | null>(null)
  const [showDocumentViewer, setShowDocumentViewer] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const { usage } = useAiUsage()

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/documents"],
    retry: false,
  })

  const generateDocumentMutation = useMutation({
    mutationFn: async ({ type, customData }: { type: string; customData?: any }) => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        type,
        customData,
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] })
      toast({
        title: "Success",
        description: "Document generated successfully!",
      })
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        })
        setTimeout(() => {
          window.location.href = "/api/login"
        }, 500)
        return
      }
      toast({
        title: "Error",
        description: "Failed to generate document",
        variant: "destructive",
      })
    },
  })

  const handleOperatingAgreementRead = () => {
    // Fetch and display content for reading
    fetch("/api/download/llc-operating-agreement")
      .then((response) => response.text())
      .then((content) => {
        setOperatingAgreementContent(content)
        setShowOperatingAgreementReader(true)
      })
      .catch((error) => {
        console.error("Failed to load content:", error)
        toast({
          title: "Error",
          description: "Failed to load Operating Agreement",
          variant: "destructive",
        })
      })
  }

  const downloadOperatingAgreement = () => {
    // Download the Operating Agreement
    fetch("/api/download/llc-operating-agreement")
      .then((response) => response.text())
      .then((content) => {
        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "LLC_Operating_Agreement_Template.txt"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error("Failed to download:", error)
        toast({
          title: "Error",
          description: "Failed to download Operating Agreement",
          variant: "destructive",
        })
      })
  }

  const fetchArticlesIncorpContent = async () => {
    try {
      const response = await fetch("/api/download/articles-of-incorporation")
      const content = await response.text()
      setArticlesIncorpContent(content)
      setShowArticlesIncorpReader(true)
    } catch (error) {
      console.error("Failed to fetch Articles of Incorporation:", error)
      toast({
        title: "Error",
        description: "Failed to load Articles of Incorporation",
        variant: "destructive",
      })
    }
  }

  const downloadArticlesIncorporation = () => {
    // Download the Articles of Incorporation
    fetch("/api/download/articles-of-incorporation")
      .then((response) => response.text())
      .then((content) => {
        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "Articles_of_Incorporation_Template.txt"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error("Failed to download:", error)
        toast({
          title: "Error",
          description: "Failed to download Articles of Incorporation",
          variant: "destructive",
        })
      })
  }

  const fetchCorporateBylawsContent = async () => {
    try {
      const response = await fetch("/api/download/corporate-bylaws")
      const content = await response.text()
      setCorporateBylawsContent(content)
      setShowCorporateBylawsReader(true)
    } catch (error) {
      console.error("Failed to fetch Corporate Bylaws:", error)
      toast({
        title: "Error",
        description: "Failed to load Corporate Bylaws",
        variant: "destructive",
      })
    }
  }

  const downloadCorporateBylaws = () => {
    // Download the Corporate Bylaws
    fetch("/api/download/corporate-bylaws")
      .then((response) => response.text())
      .then((content) => {
        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "Corporate_Bylaws_Template.txt"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error("Failed to download:", error)
        toast({
          title: "Error",
          description: "Failed to download Corporate Bylaws",
          variant: "destructive",
        })
      })
  }

  const openLeanCanvasViewer = () => {
    setShowLeanCanvasViewer(true)
  }

  // Handlers for Generated Documents section
  const handleViewDocument = (doc: Document) => {
    setDocumentViewerData({
      title: doc.title,
      content: doc.content || "No content available",
    })
    setShowDocumentViewer(true)
  }

  const handleDownloadDocument = async (doc: Document) => {
    try {
      if (doc.documentType === "chart_of_accounts" || doc.documentType === "expense_tracker") {
        // For Excel documents, download from the documents endpoint
        const response = await fetch(`/api/documents/${doc.id}/download/excel`)
        if (!response.ok) throw new Error("Download failed")

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        // For other documents, download as text
        const blob = new Blob([doc.content || ""], { type: "text/plain" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }

      toast({
        title: "Downloaded",
        description: `${doc.title} has been downloaded successfully.`,
      })
    } catch (error) {
      console.error("Download failed:", error)
      toast({
        title: "Download Failed",
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      })
    }
  }

  const downloadLeanCanvas = () => {
    // Create a link to download the image
    const link = document.createElement("a")
    link.href = "/api/download/lean-canvas"
    link.download = "Lean_Canvas_Template.jpg"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const fetchExecutiveSummaryContent = async () => {
    try {
      const response = await fetch("/api/download/executive-summary")
      const content = await response.text()
      setExecutiveSummaryContent(content)
      setShowExecutiveSummaryReader(true)
    } catch (error) {
      console.error("Failed to fetch Executive Summary:", error)
      toast({
        title: "Error",
        description: "Failed to load Executive Summary",
        variant: "destructive",
      })
    }
  }

  const downloadExecutiveSummary = () => {
    // Download the Executive Summary
    fetch("/api/download/executive-summary")
      .then((response) => response.text())
      .then((content) => {
        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "Executive_Summary_Template.txt"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error("Failed to download:", error)
        toast({
          title: "Error",
          description: "Failed to download Executive Summary",
          variant: "destructive",
        })
      })
  }

  const fetchBusinessPlanStartupsContent = async () => {
    try {
      const response = await fetch("/api/download/business-plan-startups")
      const content = await response.text()
      setBusinessPlanStartupsContent(content)
      setShowBusinessPlanStartupsReader(true)
    } catch (error) {
      console.error("Failed to fetch Business Plan for Startups:", error)
      toast({
        title: "Error",
        description: "Failed to load Business Plan template",
        variant: "destructive",
      })
    }
  }

  const downloadBusinessPlanStartups = () => {
    // Download the Business Plan for Startups
    fetch("/api/download/business-plan-startups")
      .then((response) => response.text())
      .then((content) => {
        const blob = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "Business_Plan_for_Startups.txt"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((error) => {
        console.error("Failed to download:", error)
        toast({
          title: "Error",
          description: "Failed to download Business Plan template",
          variant: "destructive",
        })
      })
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Get current user plan from actual usage data
  const currentPlan: "free" | "pro" | "premium" = usage?.tier || "free"

  // Helper function to check if user can access AI generation features
  const canAccessAIGeneration = () => {
    return currentPlan === "pro" || currentPlan === "premium"
  }

  // Show upgrade modal for restricted AI features
  const showAIRestrictionModal = () => {
    setUpgradeDialog({
      open: true,
      feature: "AI Document Generation",
      plan: "pro",
    })
  }

  // Helper function to check if user is eligible for EIN/SS-4 Typeform
  const checkEINEligibility = () => {
    if (!user) return { eligible: false, reason: "Not authenticated" }

    // Check if user has Premium subscription
    if (currentPlan !== "premium") {
      return { eligible: false, reason: "Premium subscription required" }
    }

    // Check if user account is 5+ days old (simulated for demo)
    const accountCreated = new Date(user.createdAt || Date.now())
    const daysSinceCreation = Math.floor((Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSinceCreation < 5) {
      return {
        eligible: false,
        reason: `Account must be 5+ days old. Currently ${daysSinceCreation} days.`,
      }
    }

    return { eligible: true, reason: "" }
  }

  // Helper function to build Typeform URL with user data pre-population
  const buildTypeformURL = () => {
    const baseURL = "https://form.typeform.com/to/hybbpz1Z"
    const params = new URLSearchParams()

    // Pre-populate user email if available
    if (user?.email) {
      params.append("email", user.email)
    }

    // Pre-populate business name if available (from user profile or business profile)
    // Note: This would typically come from the user's business profile
    const businessName = user?.firstName ? `${user.firstName}'s Business` : ""
    if (businessName) {
      params.append("company", businessName)
    }

    return `${baseURL}?${params.toString()}`
  }

  // Helper function to create EIN progress tracking task
  const createEINProgressTask = async () => {
    try {
      await apiRequest("POST", "/api/progress/tasks", {
        title: "EIN Application Started",
        description: "SS-4 form questionnaire completed via Typeform. Awaiting submission confirmation.",
        category: "foundation",
        status: "in_progress",
        priority: "high",
      })

      // Invalidate progress tasks cache to refresh the roadmap
      queryClient.invalidateQueries({ queryKey: ["/api/progress/tasks"] })
    } catch (error) {
      console.error("Failed to create EIN progress task:", error)
      // Don't block the main flow if task creation fails
    }
  }

  const documentTemplates = [
    {
      category: "Legal Documents",
      icon: Scale,
      iconColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      templates: [
        {
          key: "operating_agreement",
          title: "Operating Agreement",
          description: "Essential document outlining ownership and operations for LLCs",
          freeAccess: "template",
          proFeature: "ai_custom",
          premiumFeature: "nexTax_help",
          downloadUrl: "/templates/operating-agreement.pdf",
          fileTypes: ["Word", "PDF"],
        },
        {
          key: "articles_incorporation",
          title: "Articles of Incorporation",
          description: "Official document to establish your corporation with the state",
          freeAccess: "template",
          proFeature: "ai_custom",
          premiumFeature: "nexTax_help",
          downloadUrl: "/api/download/articles-of-incorporation",
          fileTypes: ["PDF"],
        },
        {
          key: "bylaws",
          title: "Corporate Bylaws",
          description: "Internal rules and procedures for corporation management",
          freeAccess: "template",
          proFeature: "ai_custom",
          premiumFeature: "nexTax_help",
          downloadUrl: "/api/download/corporate-bylaws",
          fileTypes: ["Word", "PDF"],
        },
      ],
    },
    {
      category: "Tax & Finance",
      icon: Calculator,
      iconColor: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      templates: [
        {
          key: "ss4_form",
          title: "SS-4 EIN Form",
          description: "IRS form to obtain your business Tax ID number",
          freeAccess: "template",
          proFeature: "locked",
          premiumFeature: "nexTax_help",
          downloadUrl: "https://www.irs.gov/pub/irs-pdf/fss4.pdf",
          fileTypes: ["IRS Link", "PDF"],
        },
        {
          key: "chart_accounts",
          title: "Chart of Accounts",
          description: "Organized structure for tracking business financial transactions",
          freeAccess: "template",
          proFeature: "ai_custom",
          premiumFeature: "nexTax_help",
          downloadUrl: "/api/download/chart-of-accounts",
          fileTypes: ["Excel"],
        },
        {
          key: "budget_template",
          title: "Budget Template",
          description: "Track startup costs and ongoing expenses",
          freeAccess: "template",
          proFeature: "ai_projections",
          premiumFeature: "nexTax_help",
          downloadUrl: "/api/download/startup-budget",
          fileTypes: ["Excel"],
        },
      ],
    },
    {
      category: "Business Plans",
      icon: ChartGantt,
      iconColor: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      templates: [
        {
          key: "executive_summary",
          title: "Executive Summary",
          description: "Compelling overview of your business for investors and partners",
          freeAccess: "template",
          proFeature: "ai_generated",
          premiumFeature: "nexTax_help",
          downloadUrl: "/templates/executive-summary.docx",
          fileTypes: ["Word outline"],
        },
        {
          key: "lean_canvas",
          title: "Lean Canvas",
          description: "One-page business model focusing on key assumptions",
          freeAccess: "template",
          proFeature: "ai_guided",
          premiumFeature: "nexTax_help",
          downloadUrl: "/templates/lean-canvas.pdf",
          fileTypes: ["PDF"],
        },
        {
          key: "business_plan_startups",
          title: "Business Plan for Startups",
          description: "Complete 12-section business plan template for startups and investors",
          freeAccess: "template",
          proFeature: "ai_content",
          premiumFeature: "nexTax_help",
          downloadUrl: "/templates/business-plan-startups.docx",
          fileTypes: ["Word", "PDF"],
        },
      ],
    },
  ]

  const handleTemplateAction = async (template: any, action: string) => {
    if (action === "download" && template.freeAccess === "template") {
      // Special handling for Operating Agreement - open reader instead of download
      if (template.key === "operating_agreement") {
        handleOperatingAgreementRead()
        return
      }
      // Special handling for Articles of Incorporation - open reader instead of download
      if (template.key === "articles_incorporation") {
        fetchArticlesIncorpContent()
        return
      }
      // Special handling for Corporate Bylaws - open reader instead of download
      if (template.key === "corporate_bylaws") {
        fetchCorporateBylawsContent()
        return
      }
      // Special handling for Lean Canvas - open image viewer
      if (template.key === "lean_canvas") {
        openLeanCanvasViewer()
        return
      }
      // Special handling for Chart of Accounts - direct download
      if (template.key === "chart_accounts") {
        const link = document.createElement("a")
        link.href = "/api/download/chart-of-accounts"
        link.download = "Chart_of_Accounts.xlsx"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }
      // Special handling for Executive Summary - open reader
      if (template.key === "executive_summary") {
        fetchExecutiveSummaryContent()
        return
      }
      // Special handling for Business Plan for Startups - open reader
      if (template.key === "business_plan_startups") {
        fetchBusinessPlanStartupsContent()
        return
      }
      // Free template download for other templates
      window.open(template.downloadUrl, "_blank")
      return
    }

    if (action === "ai_custom") {
      // Pro Tier Tools ($29/month) - 5 tools
      const proTierTools = [
        "operating_agreement",
        "articles_incorporation",
        "corporate_bylaws",
        "chart_accounts",
        "budget_template",
      ]

      // Premium Tier Tools ($79/month) - 4 tools including EIN
      const premiumTierTools = ["executive_summary", "lean_canvas", "business_plan_startups", "ss4_form"]

      // Check tier access and show appropriate upgrade modal
      if (proTierTools.includes(template.key)) {
        if (currentPlan === "free") {
          setUpgradeDialog({
            open: true,
            feature: `${template.title} - Pro Tier Tool ($29/month)`,
            plan: "pro",
          })
          return
        }
      } else if (premiumTierTools.includes(template.key)) {
        if (currentPlan !== "premium") {
          if (template.key === "ss4_form") {
            // Special EIN upgrade modal with anti-arbitrage protection
            setUpgradeDialog({
              open: true,
              feature: "SS-4 EIN Form generation - Premium Tier Tool ($79/month)",
              plan: "ein",
            })
          } else {
            setUpgradeDialog({
              open: true,
              feature: `${template.title} - Strategic Investor Tool ($79/month)`,
              plan: "ein",
            })
          }
          return
        }
      }

      // User has access, open appropriate generator
      if (template.key === "operating_agreement") {
        setShowOperatingAgreementGenerator(true)
      } else if (template.key === "articles_incorporation") {
        setShowArticlesIncorporationGenerator(true)
      } else if (template.key === "corporate_bylaws" || template.key === "bylaws") {
        setShowCorporateBylawsGenerator(true)
      } else if (template.key === "executive_summary") {
        setShowExecutiveSummaryGenerator(true)
      } else if (template.key === "business_plan_startups") {
        setShowBusinessPlanGenerator(true)
      } else if (template.key === "chart_accounts") {
        setShowChartOfAccountsGenerator(true)
      } else if (template.key === "budget_template") {
        setShowExpenseTrackerGenerator(true)
      } else if (template.key === "lean_canvas") {
        setShowLeanCanvasGenerator(true)
      } else if (template.key === "ss4_form") {
        // Show special EIN notice before opening Typeform
        toast({
          title: "EIN Form Generation",
          description:
            "By filling out the below questionnaire, your form will be auto generated, sent to you via email with instructions for you to review and sign, and a copy will then be provided to NexTax.AI where we will proceed to get your EIN for you from the IRS and provide you with a final copy of your SS-4 form complete with your new EIN number at the top of the form.",
          duration: 8000,
        })

        // Open Typeform for EIN form
        const userEmail = (user as User)?.email || ""
        const typeformUrl = `https://form.typeform.com/to/hybbpz1Z?email=${encodeURIComponent(userEmail)}`
        window.open(typeformUrl, "_blank")

        // Create progress task
        await createEINProgressTask()
      }
      return
    }

    if (action === "nexTax_help") {
      // Always redirect to NexTax.ai pricing regardless of plan
      window.open("https://www.nexTax.ai/pricing", "_blank")
      return
    }

    // If user has access, generate document
    generateDocumentMutation.mutate({ type: template.key })
  }

  const getTemplateActions = (template: any) => {
    const actions = []

    // Free action
    if (template.freeAccess === "template") {
      actions.push({
        label:
          template.key === "operating_agreement" ||
          template.key === "articles_incorporation" ||
          template.key === "corporate_bylaws" ||
          template.key === "lean_canvas" ||
          template.key === "executive_summary" ||
          template.key === "business_plan_startups"
            ? "View Template"
            : "Download Template",
        icon:
          template.key === "operating_agreement" ||
          template.key === "articles_incorporation" ||
          template.key === "corporate_bylaws" ||
          template.key === "lean_canvas" ||
          template.key === "executive_summary" ||
          template.key === "business_plan_startups"
            ? Eye
            : Download,
        variant: "outline",
        action: "download",
        available: true,
      })
    } else if (template.freeAccess === "preview") {
      actions.push({
        label: "Preview",
        icon: Eye,
        variant: "outline",
        action: "preview",
        available: true,
      })
    }

    // Pro Tier Tools ($29/month) - 5 tools
    const proTierTools = [
      "operating_agreement",
      "articles_incorporation",
      "corporate_bylaws",
      "chart_accounts",
      "budget_template",
    ]

    // Premium Tier Tools ($79/month) - 4 tools including EIN
    const premiumTierTools = ["executive_summary", "lean_canvas", "business_plan_startups", "ss4_form"]

    if (proTierTools.includes(template.key)) {
      // Pro tier "Create with AI" button
      actions.push({
        label: "Create with AI",
        icon: Sparkles,
        variant: "default",
        action: "ai_custom",
        available: currentPlan === "pro" || currentPlan === "premium",
        upgrade: currentPlan === "free",
        tier: "pro",
        tooltip: currentPlan === "free" ? "Unlock with $29/mo Plan" : "Included with $29/mo Plan",
      })
    } else if (premiumTierTools.includes(template.key)) {
      // Premium tier "Create with AI" button
      actions.push({
        label: "Create with AI",
        icon: Sparkles,
        variant: "default",
        action: "ai_custom",
        available: currentPlan === "premium",
        upgrade: currentPlan !== "premium",
        tier: "premium",
        tooltip:
          currentPlan === "premium"
            ? "Included with $79/mo Plan – Advanced investor tools"
            : "Unlock with $79/mo Plan – Includes advanced investor tools",
      })
    } else {
      // Default Pro action for other templates
      actions.push({
        label: "Create with AI",
        icon: Sparkles,
        variant: "default",
        action: "ai_custom",
        available: currentPlan !== "free",
        upgrade: currentPlan === "free",
        tier: "pro",
        tooltip: "Let our AI draft your document with your business profile.",
      })
    }

    // NexTax Help action (always available)
    if (template.premiumFeature === "nexTax_help") {
      actions.push({
        label: "Let NexTax.AI Help",
        icon: ExternalLink,
        variant: "outline",
        action: "nexTax_help",
        available: true,
        upgrade: false,
        tooltip: "Need expert help completing this document? Let NexTax assist you directly.",
      })
    }

    return actions
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generated":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Ready</Badge>
      case "draft":
        return <Badge variant="outline">Draft</Badge>
      case "downloaded":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Downloaded</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <section className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Document Generation Center</h2>
          <p className="text-slate-600 dark:text-slate-300">
            AI-powered templates and legal documents for your startup
          </p>
        </div>

        {/* Document Templates */}
        <div className="space-y-8 mb-8">
          {documentTemplates.map((category) => (
            <div key={category.category}>
              <div className="flex items-center space-x-3 mb-6">
                <div className={`w-12 h-12 ${category.bgColor} rounded-xl flex items-center justify-center`}>
                  <category.icon className={`h-6 w-6 ${category.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{category.category}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.templates.map((template) => (
                  <Card
                    key={template.key}
                    className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {template.description}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <TooltipProvider>
                        {getTemplateActions(template).map((action, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={action.action === "ai_custom" ? "default" : (action.variant as any)}
                                  className={`flex-1 justify-start space-x-2 ${
                                    action.action === "ai_custom"
                                      ? "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                                      : action.action === "nexTax_help"
                                        ? "nexTax-gradient text-white hover:shadow-xl border-0"
                                        : ""
                                  }`}
                                  onClick={() => handleTemplateAction(template, action.action)}
                                  disabled={generateDocumentMutation.isPending || !action.available}
                                >
                                  <action.icon className="h-4 w-4" />
                                  <span>{action.label}</span>
                                  {action.upgrade && <Lock className="h-4 w-4 ml-auto" />}
                                </Button>
                              </TooltipTrigger>
                              {action.tooltip && (
                                <TooltipContent>
                                  <p>{action.tooltip}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                            {action.tier && (
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  action.tier === "premium"
                                    ? "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200"
                                    : "bg-gradient-to-r from-blue-100 to-violet-100 text-blue-800 border-blue-200"
                                }`}
                              >
                                {action.tier === "premium" ? "Premium" : "Pro"}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </TooltipProvider>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Documents */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Your Generated Documents</h3>
          {(documents as Document[]).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No Documents Generated Yet
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Start with our free templates above, or upgrade to Pro for AI-powered customization.
                </p>
                <Button
                  onClick={() => setUpgradeDialog({ open: true, feature: "AI document generation", plan: "pro" })}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {(documents as Document[]).map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white">{doc.title}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Generated {new Date(doc.createdAt!).toLocaleDateString()}
                            </p>
                            {getStatusBadge(doc.status)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDocument(doc)}
                          title="View document content"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadDocument(doc)}
                          disabled={doc.status !== "generated"}
                          title="Download document"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* New Anti-Arbitrage Upgrade Modal */}
        <UpgradeModal
          open={upgradeDialog.open}
          onClose={() => setUpgradeDialog({ open: false, feature: "", plan: "pro" })}
          plan={upgradeDialog.plan}
          feature={upgradeDialog.feature}
        />

        {/* Operating Agreement Reader - Full Content View */}
        <Dialog open={showOperatingAgreementReader} onOpenChange={setShowOperatingAgreementReader}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Scale className="h-6 w-6 text-blue-500" />
                  <span>LLC Operating Agreement Template</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadOperatingAgreement}
                  className="ml-4 bg-transparent"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogTitle>
              <DialogDescription>
                Professional LLC Operating Agreement template - customize for your business
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto">
              <div className="prose prose-slate dark:prose-invert max-w-none p-6">
                <div style={{ whiteSpace: "pre-line", lineHeight: "1.6", fontFamily: "monospace" }}>
                  {operatingAgreementContent}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t pt-4 pb-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  IMPORTANT: This is a template for informational purposes. Consult with an attorney.
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={downloadOperatingAgreement} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button variant="default" onClick={() => setShowOperatingAgreementReader(false)} size="sm">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Articles of Incorporation Reader */}
        <Dialog open={showArticlesIncorpReader} onOpenChange={setShowArticlesIncorpReader}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-6 w-6 text-blue-500" />
                  <span>Articles of Incorporation</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadArticlesIncorporation}
                  className="ml-4 bg-transparent"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogTitle>
              <DialogDescription>
                Professional Articles of Incorporation template - customize for your corporation
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto">
              <div className="prose prose-slate dark:prose-invert max-w-none p-6">
                <div style={{ whiteSpace: "pre-line", lineHeight: "1.6", fontFamily: "monospace" }}>
                  {articlesIncorpContent}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t pt-4 pb-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  IMPORTANT: This is a template for informational purposes. Consult with an attorney.
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={downloadArticlesIncorporation} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button variant="default" onClick={() => setShowArticlesIncorpReader(false)} size="sm">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Corporate Bylaws Reader */}
        <Dialog open={showCorporateBylawsReader} onOpenChange={setShowCorporateBylawsReader}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-6 w-6 text-purple-500" />
                  <span>Corporate Bylaws</span>
                </div>
                <Button variant="outline" size="sm" onClick={downloadCorporateBylaws} className="ml-4 bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogTitle>
              <DialogDescription>
                Professional Corporate Bylaws template - customize for your corporation
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto">
              <div className="prose prose-slate dark:prose-invert max-w-none p-6">
                <div style={{ whiteSpace: "pre-line", lineHeight: "1.6", fontFamily: "monospace" }}>
                  {corporateBylawsContent}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t pt-4 pb-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  IMPORTANT: This is a template for informational purposes. Consult with an attorney.
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={downloadCorporateBylaws} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button variant="default" onClick={() => setShowCorporateBylawsReader(false)} size="sm">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lean Canvas Viewer */}
        <Dialog open={showLeanCanvasViewer} onOpenChange={setShowLeanCanvasViewer}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ChartGantt className="h-6 w-6 text-purple-500" />
                  <span>Lean Canvas Template</span>
                </div>
                <Button variant="outline" size="sm" onClick={downloadLeanCanvas} className="ml-4 bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogTitle>
              <DialogDescription>
                One-page business model canvas focusing on key assumptions and validation
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto bg-white rounded-lg">
              <img
                src="/api/download/lean-canvas"
                alt="Lean Canvas Template"
                className="w-full h-auto"
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </div>

            <div className="flex-shrink-0 border-t pt-4 pb-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Fill out each section to validate your business model and identify key assumptions.
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={downloadLeanCanvas} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button variant="default" onClick={() => setShowLeanCanvasViewer(false)} size="sm">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Executive Summary Reader */}
        <Dialog open={showExecutiveSummaryReader} onOpenChange={setShowExecutiveSummaryReader}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ChartGantt className="h-6 w-6 text-purple-500" />
                  <span>Executive Summary Template</span>
                </div>
                <Button variant="outline" size="sm" onClick={downloadExecutiveSummary} className="ml-4 bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogTitle>
              <DialogDescription>
                Professional business plan summary template for investors and partners
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto">
              <div className="prose prose-slate dark:prose-invert max-w-none p-6">
                <div style={{ whiteSpace: "pre-line", lineHeight: "1.6", fontFamily: "system-ui, sans-serif" }}>
                  {executiveSummaryContent}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t pt-4 pb-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  This template provides a structured framework for your business plan summary.
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={downloadExecutiveSummary} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button variant="default" onClick={() => setShowExecutiveSummaryReader(false)} size="sm">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Business Plan for Startups Reader */}
        <Dialog open={showBusinessPlanStartupsReader} onOpenChange={setShowBusinessPlanStartupsReader}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ChartGantt className="h-6 w-6 text-purple-500" />
                  <span>Business Plan for Startups</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadBusinessPlanStartups}
                  className="ml-4 bg-transparent"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogTitle>
              <DialogDescription>
                Complete 12-section business plan template for startups and investors
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto">
              <div className="prose prose-slate dark:prose-invert max-w-none p-6">
                <div style={{ whiteSpace: "pre-line", lineHeight: "1.6", fontFamily: "system-ui, sans-serif" }}>
                  {businessPlanStartupsContent}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t pt-4 pb-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Comprehensive startup business plan with 12 sections covering all investor requirements.
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={downloadBusinessPlanStartups} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button variant="default" onClick={() => setShowBusinessPlanStartupsReader(false)} size="sm">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Operating Agreement Generator */}
        <Dialog open={showOperatingAgreementGenerator} onOpenChange={setShowOperatingAgreementGenerator}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
            <OperatingAgreementGenerator onClose={() => setShowOperatingAgreementGenerator(false)} />
          </DialogContent>
        </Dialog>

        {/* Articles of Incorporation Generator */}
        <Dialog open={showArticlesIncorporationGenerator} onOpenChange={setShowArticlesIncorporationGenerator}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
            <ArticlesOfIncorporationGenerator onClose={() => setShowArticlesIncorporationGenerator(false)} />
          </DialogContent>
        </Dialog>

        {/* Corporate Bylaws Generator */}
        <Dialog open={showCorporateBylawsGenerator} onOpenChange={setShowCorporateBylawsGenerator}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
            <CorporateBylawsGenerator onClose={() => setShowCorporateBylawsGenerator(false)} />
          </DialogContent>
        </Dialog>

        {/* Executive Summary Generator */}
        <Dialog open={showExecutiveSummaryGenerator} onOpenChange={setShowExecutiveSummaryGenerator}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
            <ExecutiveSummaryGenerator onClose={() => setShowExecutiveSummaryGenerator(false)} />
          </DialogContent>
        </Dialog>

        {/* Business Plan Generator */}
        <Dialog open={showBusinessPlanGenerator} onOpenChange={setShowBusinessPlanGenerator}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
            <BusinessPlanGenerator onClose={() => setShowBusinessPlanGenerator(false)} />
          </DialogContent>
        </Dialog>

        {/* Chart of Accounts Generator */}
        {showChartOfAccountsGenerator && (
          <ChartOfAccountsGenerator onClose={() => setShowChartOfAccountsGenerator(false)} />
        )}

        {/* Expense Tracker Generator */}
        {showExpenseTrackerGenerator && (
          <ExpenseTrackerGenerator onClose={() => setShowExpenseTrackerGenerator(false)} />
        )}

        {/* Lean Canvas Generator */}
        {showLeanCanvasGenerator && <LeanCanvasGenerator onClose={() => setShowLeanCanvasGenerator(false)} />}

        {/* Document Viewer Dialog */}
        <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">{documentViewerData?.title}</DialogTitle>
              <DialogDescription>View your generated document content</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border max-h-[60vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100 font-mono">
                  {documentViewerData?.content}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}
