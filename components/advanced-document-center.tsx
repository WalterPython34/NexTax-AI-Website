"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  FileText,
  Download,
  Eye,
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Scale,
  Gavel,
  Shield,
  FileCheck,
  Sparkles,
  Building,
  Users,
  Handshake,
  Lock,
} from "lucide-react"

interface Document {
  id: string
  name: string
  type: string
  status: "draft" | "review" | "approved" | "needs_revision"
  createdAt: Date
  lastModified: Date
  size: string
  category: string
  legalReview?: {
    reviewer: string
    status: "pending" | "approved" | "rejected"
    comments?: string
    reviewedAt?: Date
  }
  aiGenerated?: boolean
}

export function AdvancedDocumentCenter() {
  const [documents] = useState<Document[]>([
    {
      id: "1",
      name: "Operating Agreement - TechStart LLC",
      type: "PDF",
      status: "approved",
      createdAt: new Date("2024-01-15"),
      lastModified: new Date("2024-01-20"),
      size: "2.4 MB",
      category: "Legal",
      legalReview: {
        reviewer: "Sarah Chen, Esq.",
        status: "approved",
        comments: "Comprehensive agreement with proper liability protections.",
        reviewedAt: new Date("2024-01-18"),
      },
      aiGenerated: true,
    },
    {
      id: "2",
      name: "Employment Agreement Template",
      type: "DOCX",
      status: "review",
      createdAt: new Date("2024-01-22"),
      lastModified: new Date("2024-01-22"),
      size: "156 KB",
      category: "HR",
      legalReview: {
        reviewer: "Michael Torres, Esq.",
        status: "pending",
      },
      aiGenerated: true,
    },
    {
      id: "3",
      name: "Privacy Policy - Website",
      type: "PDF",
      status: "needs_revision",
      createdAt: new Date("2024-01-10"),
      lastModified: new Date("2024-01-12"),
      size: "890 KB",
      category: "Compliance",
      legalReview: {
        reviewer: "Sarah Chen, Esq.",
        status: "rejected",
        comments: "Needs updates for CCPA compliance and data retention policies.",
        reviewedAt: new Date("2024-01-14"),
      },
    },
    {
      id: "4",
      name: "Vendor Service Agreement",
      type: "PDF",
      status: "draft",
      createdAt: new Date("2024-01-25"),
      lastModified: new Date("2024-01-25"),
      size: "1.2 MB",
      category: "Contracts",
    },
  ])

  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "review":
        return <Clock className="h-4 w-4 text-amber-500" />
      case "needs_revision":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "review":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
      case "needs_revision":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus
    const matchesCategory = filterCategory === "all" || doc.category === filterCategory
    return matchesSearch && matchesStatus && matchesCategory
  })

  const categories = Array.from(new Set(documents.map((doc) => doc.category)))

  return (
    <section className="flex-1 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Document Center</h2>
            <p className="text-slate-600 dark:text-slate-300">AI-powered document generation with legal review</p>
          </div>

          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[hsl(174,73%,53%)] hover:bg-[hsl(174,73%,48%)]">
                <Plus className="h-4 w-4 mr-2" />
                Generate Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-[hsl(174,73%,53%)]" />
                  <span>AI Document Generator</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="doc-type">Document Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operating-agreement">Operating Agreement</SelectItem>
                      <SelectItem value="employment-agreement">Employment Agreement</SelectItem>
                      <SelectItem value="privacy-policy">Privacy Policy</SelectItem>
                      <SelectItem value="terms-of-service">Terms of Service</SelectItem>
                      <SelectItem value="vendor-agreement">Vendor Agreement</SelectItem>
                      <SelectItem value="nda">Non-Disclosure Agreement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="business-info">Business Information</Label>
                  <Textarea
                    id="business-info"
                    placeholder="Describe your business, industry, and specific requirements..."
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="state">State/Jurisdiction</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ca">California</SelectItem>
                      <SelectItem value="ny">New York</SelectItem>
                      <SelectItem value="tx">Texas</SelectItem>
                      <SelectItem value="fl">Florida</SelectItem>
                      <SelectItem value="de">Delaware</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setShowGenerateDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowGenerateDialog(false)
                      // Handle document generation
                    }}
                    className="flex-1 bg-[hsl(174,73%,53%)] hover:bg-[hsl(174,73%,48%)]"
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-[hsl(174,73%,53%)] rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Documents</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{documents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-green-500 rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Approved</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {documents.filter((d) => d.status === "approved").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-amber-500 rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Under Review</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {documents.filter((d) => d.status === "review").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-blue-500 rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">AI Generated</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {documents.filter((d) => d.aiGenerated).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Documents</span>
            </TabsTrigger>
            <TabsTrigger value="legal-review" className="flex items-center space-x-2">
              <Scale className="h-4 w-4" />
              <span>Legal Review</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center space-x-2">
              <FileCheck className="h-4 w-4" />
              <span>Templates</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="needs_revision">Needs Revision</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Documents List */}
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(doc.status)}
                          <FileText className="h-5 w-5 text-slate-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-slate-900 dark:text-white truncate">{doc.name}</h3>
                            {doc.aiGenerated && (
                              <Badge variant="secondary" className="bg-[hsl(174,73%,53%)]/10 text-[hsl(174,73%,53%)]">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Generated
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                            <span>{doc.type}</span>
                            <span>{doc.size}</span>
                            <span>Modified {doc.lastModified.toLocaleDateString()}</span>
                            <Badge className={getStatusColor(doc.status)}>{doc.status.replace("_", " ")}</Badge>
                            <Badge variant="outline">{doc.category}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Legal Review Info */}
                    {doc.legalReview && (
                      <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Gavel className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Legal Review by {doc.legalReview.reviewer}
                            </span>
                          </div>
                          <Badge className={getStatusColor(doc.legalReview.status)}>{doc.legalReview.status}</Badge>
                        </div>

                        {doc.legalReview.comments && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">{doc.legalReview.comments}</p>
                        )}

                        {doc.legalReview.reviewedAt && (
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            Reviewed on {doc.legalReview.reviewedAt.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="legal-review" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Scale className="h-5 w-5" />
                  <span>Legal Review Queue</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documents
                    .filter((doc) => doc.legalReview)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white">{doc.name}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Reviewer: {doc.legalReview?.reviewer}
                          </p>
                        </div>
                        <Badge className={getStatusColor(doc.legalReview?.status || "pending")}>
                          {doc.legalReview?.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Operating Agreement", description: "LLC operating agreement template", icon: Building },
                { name: "Employment Agreement", description: "Standard employment contract", icon: Users },
                { name: "Privacy Policy", description: "GDPR & CCPA compliant privacy policy", icon: Shield },
                { name: "Terms of Service", description: "Website terms of service", icon: FileCheck },
                { name: "NDA Template", description: "Non-disclosure agreement", icon: Lock },
                { name: "Vendor Agreement", description: "Service provider contract", icon: Handshake },
              ].map((template, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <template.icon className="h-8 w-8 text-[hsl(174,73%,53%)]" />
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">{template.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{template.description}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

    </Dialog>
  )
}
