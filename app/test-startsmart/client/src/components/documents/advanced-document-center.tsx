import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  Edit3, 
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  Scale,
  Users,
  MessageSquare,
  History,
  Shield,
  Star,
  ExternalLink,
  Plus,
  Filter,
  Search,
  Calendar,
  DollarSign,
  Award,
  Zap
} from "lucide-react";
import type { Document } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

interface DocumentWithReview extends Document {
  reviewStatus?: string;
  reviewType?: string;
  estimatedCost?: string;
  reviewerNotes?: string;
  versionCount?: number;
  lastReviewDate?: string;
}

export function AdvancedDocumentCenter() {
  const [selectedTab, setSelectedTab] = useState("my-documents");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithReview | null>(null);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch user documents with legal review status
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/documents"],
    retry: false,
  });

  // Fetch legal reviews
  const { data: legalReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["/api/legal-reviews"],
    retry: false,
  });

  const typedLegalReviews = legalReviews as any[];

  const typedDocuments = documents as DocumentWithReview[];

  // Request legal review mutation
  const requestReviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/legal-reviews", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legal-reviews"] });
      setReviewModalOpen(false);
      toast({
        title: "Legal Review Requested",
        description: "Your document has been submitted for professional legal review.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to request legal review",
        variant: "destructive",
      });
    },
  });

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Reviewed
        </Badge>;
      case "in_review":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          <Clock className="h-3 w-3 mr-1" />
          In Review
        </Badge>;
      case "needs_revision":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Needs Revision
        </Badge>;
      case "pending":
        return <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>;
      default:
        return <Badge variant="outline">No Review</Badge>;
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case "articles_of_incorporation":
      case "operating_agreement":
        return <FileText className="h-5 w-5 text-blue-600" />;
      case "tax_election":
      case "tax_form":
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case "employment_agreement":
        return <Users className="h-5 w-5 text-purple-600" />;
      case "contract":
        return <Scale className="h-5 w-5 text-amber-600" />;
      default:
        return <FileText className="h-5 w-5 text-slate-600" />;
    }
  };

  const filteredDocuments = typedDocuments.filter(doc => {
    const matchesCategory = filterCategory === "all" || doc.documentType === filterCategory;
    const matchesSearch = searchQuery === "" || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const reviewedDocuments = typedDocuments.filter(doc => doc.reviewStatus);
  const pendingReviews = typedDocuments.filter(doc => doc.reviewStatus === "pending" || doc.reviewStatus === "in_review");

  return (
    <section className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Advanced Document Center
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Professional document generation with integrated legal review and version control
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setReviewModalOpen(true)}
              className="flex items-center space-x-2"
            >
              <Scale className="h-4 w-4" />
              <span>Request Review</span>
            </Button>
            <Button
              className="nexTax-gradient text-white flex items-center space-x-2"
              onClick={() => {
                // Redirect to document creation (existing functionality)
                window.location.href = "#document-creation";
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Create Document</span>
            </Button>
          </div>
        </div>

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Total Documents</p>
                  <p className="text-2xl font-bold text-blue-600">{typedDocuments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Scale className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Reviewed</p>
                  <p className="text-2xl font-bold text-green-600">{reviewedDocuments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">In Review</p>
                  <p className="text-2xl font-bold text-amber-600">{pendingReviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Premium</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {typedDocuments.filter(d => d.metadata && typeof d.metadata === 'object' && 'premium' in d.metadata).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="my-documents">My Documents</TabsTrigger>
            <TabsTrigger value="legal-reviews">Legal Reviews</TabsTrigger>
            <TabsTrigger value="version-history">Version History</TabsTrigger>
            <TabsTrigger value="templates">Premium Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="my-documents" className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="articles_of_incorporation">Articles of Incorporation</SelectItem>
                  <SelectItem value="operating_agreement">Operating Agreement</SelectItem>
                  <SelectItem value="tax_election">Tax Election</SelectItem>
                  <SelectItem value="employment_agreement">Employment Agreement</SelectItem>
                  <SelectItem value="contract">Contracts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Documents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.length === 0 ? (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="p-8 text-center">
                      <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No Documents Found
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Create your first professional document with AI assistance and legal review.
                      </p>
                      <Button className="nexTax-gradient text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Document
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                filteredDocuments.map((document) => (
                  <Card key={document.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            {getDocumentTypeIcon(document.documentType)}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{document.title}</CardTitle>
                            <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                              {document.documentType.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                        {document.reviewStatus && getReviewStatusBadge(document.reviewStatus)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {document.reviewerNotes && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                              <Scale className="h-4 w-4 inline mr-1" />
                              Legal Review: {document.reviewerNotes}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {document.createdAt ? new Date(document.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                          {document.versionCount && (
                            <span className="flex items-center">
                              <History className="h-4 w-4 mr-1" />
                              v{document.versionCount}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit3 className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                          <div className="flex space-x-2">
                            {!document.reviewStatus && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedDocument(document);
                                  setReviewModalOpen(true);
                                }}
                              >
                                <Scale className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="legal-reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Scale className="h-5 w-5" />
                  <span>Legal Review Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {legalReviews.length === 0 ? (
                    <div className="text-center py-8">
                      <Scale className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No Legal Reviews Yet
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">
                        Request professional legal review for your important documents.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Legal Reviews Coming Soon
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">
                        Professional legal review integration is being finalized.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="version-history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <History className="h-5 w-5" />
                  <span>Document Version History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <History className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Version Control Coming Soon
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Track changes and maintain document versions with professional revision control.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Premium Legal Templates</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Award className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Premium Templates Available
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Access professional-grade legal document templates with pre-review approval.
                  </p>
                  <Button 
                    className="nexTax-gradient text-white"
                    onClick={() => window.open("https://www.nextax.ai/pricing", "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Premium Templates
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Legal Review Request Modal */}
        <LegalReviewModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          document={selectedDocument}
          onSubmit={(data) => requestReviewMutation.mutate(data)}
          isLoading={requestReviewMutation.isPending}
        />
      </div>
    </section>
  );
}

// Legal Review Request Modal
function LegalReviewModal({ 
  open, 
  onClose, 
  document,
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onClose: () => void;
  document: DocumentWithReview | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    reviewType: "basic",
    priority: "medium",
    specialtyRequired: "",
    clientInstructions: "",
    dueDate: "",
  });

  const reviewTypes = [
    { value: "basic", label: "Basic Review", price: "$299", description: "Standard legal compliance check" },
    { value: "comprehensive", label: "Comprehensive Review", price: "$599", description: "Detailed analysis with recommendations" },
    { value: "specialist", label: "Specialist Review", price: "$899", description: "Expert review by specialty attorney" },
  ];

  const specialties = [
    { value: "corporate", label: "Corporate Law" },
    { value: "tax", label: "Tax Law" },
    { value: "employment", label: "Employment Law" },
    { value: "contracts", label: "Contract Law" },
    { value: "ip", label: "Intellectual Property" },
  ];

  const handleSubmit = () => {
    if (!document) return;
    onSubmit({
      documentId: document.id,
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Scale className="h-5 w-5 text-blue-600" />
            <span>Request Legal Review</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {document && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="font-medium text-slate-900 dark:text-white">{document.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                {document.documentType.replace(/_/g, ' ')}
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reviewType">Review Type</Label>
              <Select value={formData.reviewType} onValueChange={(value) => 
                setFormData({ ...formData, reviewType: value })
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reviewTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{type.label}</span>
                        <span className="text-green-600 font-semibold ml-2">{type.price}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {reviewTypes.find(t => t.value === formData.reviewType)?.description}
              </p>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => 
                setFormData({ ...formData, priority: value })
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority (+0 days)</SelectItem>
                  <SelectItem value="medium">Medium Priority (+$0)</SelectItem>
                  <SelectItem value="high">High Priority (+$199)</SelectItem>
                  <SelectItem value="urgent">Urgent Priority (+$399)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.reviewType === "specialist" && (
              <div>
                <Label htmlFor="specialty">Legal Specialty</Label>
                <Select value={formData.specialtyRequired} onValueChange={(value) => 
                  setFormData({ ...formData, specialtyRequired: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty.value} value={specialty.value}>
                        {specialty.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="dueDate">Preferred Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="instructions">Special Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.clientInstructions}
                onChange={(e) => setFormData({ ...formData, clientInstructions: e.target.value })}
                placeholder="Any specific areas of concern or focus areas for the review..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 nexTax-gradient text-white"
            >
              {isLoading ? "Submitting..." : "Request Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}