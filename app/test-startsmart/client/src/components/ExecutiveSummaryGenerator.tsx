import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Download,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Calendar,
  Target,
  Lightbulb,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  BarChart3,
  UserCheck,
  Mail
} from "lucide-react";

interface TeamMember {
  name: string;
  title: string;
  background: string;
}

interface Financials {
  currentRevenue: string;
  projectedRevenue: string;
  fundingRaised: string;
  fundingSought: string;
  fundUse: string;
}

interface FormData {
  // Step 1: Company Basics
  companyName: string;
  industry: string;
  location: string;
  
  // Step 2: Foundation & Mission
  foundingYear: string;
  missionStatement: string;
  
  // Step 3: Problem & Solution
  coreProblem: string;
  solutionDescription: string;
  
  // Step 4: Differentiation
  keyDifferentiators: string[];
  
  // Step 5: Market
  targetMarket: string;
  marketSize: string;
  growthRate: string;
  
  // Step 6: Business Model
  businessModel: string;
  pricingStrategy: string;
  revenueStreams: string[];
  
  // Step 7: Competition
  competitiveAdvantages: string[];
  keyCompetitors: string[];
  
  // Step 8: Traction
  tractionMilestones: string[];
  
  // Step 9: Financials
  financials: Financials;
  
  // Step 10: Team
  team: TeamMember[];
  
  // Step 11: Call to Action
  callToAction: string;
  contactEmail: string;
}

interface ExecutiveSummaryGeneratorProps {
  onClose: () => void;
}

function ExecutiveSummaryGenerator({ onClose }: ExecutiveSummaryGeneratorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    industry: "",
    location: "",
    foundingYear: "",
    missionStatement: "",
    coreProblem: "",
    solutionDescription: "",
    keyDifferentiators: [""],
    targetMarket: "",
    marketSize: "",
    growthRate: "",
    businessModel: "",
    pricingStrategy: "",
    revenueStreams: [""],
    competitiveAdvantages: [""],
    keyCompetitors: [""],
    tractionMilestones: [""],
    financials: {
      currentRevenue: "",
      projectedRevenue: "",
      fundingRaised: "",
      fundingSought: "",
      fundUse: ""
    },
    team: [{ name: "", title: "", background: "" }],
    callToAction: "",
    contactEmail: ""
  });

  const totalSteps = 11;

  const addArrayItem = (field: keyof FormData, defaultValue: string | TeamMember) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as any[]), defaultValue]
    }));
  };

  const removeArrayItem = (field: keyof FormData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field: keyof FormData, index: number, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).map((item, i) => i === index ? value : item)
    }));
  };

  const updateFinancials = (field: keyof Financials, value: string) => {
    setFormData(prev => ({
      ...prev,
      financials: {
        ...prev.financials,
        [field]: value
      }
    }));
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.companyName && formData.industry && formData.location);
      case 2:
        return !!(formData.foundingYear && formData.missionStatement);
      case 3:
        return !!(formData.coreProblem && formData.solutionDescription);
      case 4:
        return formData.keyDifferentiators.some(d => d.trim());
      case 5:
        return !!(formData.targetMarket && formData.marketSize);
      case 6:
        return !!(formData.businessModel && formData.pricingStrategy);
      case 7:
        return formData.competitiveAdvantages.some(a => a.trim());
      case 8:
        return formData.tractionMilestones.some(m => m.trim());
      case 9:
        return !!(formData.financials.currentRevenue || formData.financials.projectedRevenue);
      case 10:
        return formData.team.some(member => member.name && member.title);
      case 11:
        return !!(formData.callToAction && formData.contactEmail);
      default:
        return false;
    }
  };

  const canProceed = isStepValid(currentStep);

  const handleNext = () => {
    if (currentStep < totalSteps && canProceed) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const generateDocument = async () => {
    if (!isStepValid(11)) {
      toast({
        title: "Missing Information",
        description: "Please complete all required fields before generating.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/executive-summary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error("Failed to generate executive summary");
      }

      const result = await response.json();
      setGeneratedDocument(result.document);
      setShowPreview(true);
      
      toast({
        title: "Success!",
        description: "Your Executive Summary has been generated.",
      });
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description: "Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocument = (format: 'txt' | 'docx' | 'pdf') => {
    if (!generatedDocument) return;

    const companyName = formData.companyName || 'Company';
    const today = new Date().toISOString().split('T')[0];
    
    if (format === 'txt') {
      const blob = new Blob([generatedDocument], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${companyName}_Executive_Summary_${today}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'docx') {
      // Create a simple Word-compatible document using RTF format
      const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24 
{\\b\\fs28 ${companyName} - Executive Summary\\par}
{\\fs20 Generated on ${new Date().toLocaleDateString()}\\par\\par}
${generatedDocument.replace(/\n/g, '\\par ')}
\\par\\par
{\\b Contact:} ${formData.contactEmail}\\par
{\\i This document was generated by StartSmart AI and should be reviewed by legal and business professionals.}}`;
      
      const blob = new Blob([rtfContent], { type: 'application/rtf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${companyName}_Executive_Summary_${today}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // Open print dialog for PDF generation
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${companyName} - Executive Summary</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
              h1, h2, h3 { color: #2c3e50; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 25px; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; }
              @media print { body { margin: 20px; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${companyName} - Executive Summary</h1>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            ${generatedDocument.split('\n').map(line => {
              if (line.trim().startsWith('#')) {
                return `<h2>${line.replace(/^#+\s*/, '')}</h2>`;
              }
              return line.trim() ? `<p>${line}</p>` : '<br>';
            }).join('')}
            <div class="footer">
              <p><strong>Contact:</strong> ${formData.contactEmail}</p>
              <p><em>This document was generated by StartSmart AI and should be reviewed by legal and business professionals.</em></p>
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }

    toast({
      title: "Download Started",
      description: `Your Executive Summary is being downloaded as ${format.toUpperCase()}.`,
    });
  };

  if (showPreview) {
    return (
      <div className="h-full flex flex-col">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold">Executive Summary Generated</h2>
                <p className="text-sm text-gray-600">Review and download your document</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Edit</span>
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Document Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* AI Disclaimer Alert */}
                  <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800">AI-Generated Business Document</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          This Executive Summary was created using AI for informational purposes only. 
                          It does not constitute professional business, legal, or financial advice. 
                          Please review with qualified professionals before use.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-200 min-h-[400px]">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {generatedDocument}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Legal Disclaimer */}
              <Card className="mb-6 border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 mb-1">Important Disclaimer</p>
                      <p className="text-amber-700">
                        This executive summary is AI-generated and for informational purposes only. 
                        Please review all content for accuracy and have it reviewed by business and legal professionals before use.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 border-t bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => downloadDocument('txt')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download TXT</span>
            </Button>
            <Button
              onClick={() => downloadDocument('docx')}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>Download Word</span>
            </Button>
            <Button
              onClick={() => downloadDocument('pdf')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Save as PDF</span>
            </Button>
            <div className="flex-1" />
            <Button
              onClick={onClose}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Company Basics</h3>
              <p className="text-gray-600">Let's start with your company's basic information</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Your company's legal name"
                />
              </div>
              
              <div>
                <Label htmlFor="industry">Industry *</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g., Technology, Healthcare, Consumer Goods"
                />
              </div>
              
              <div>
                <Label htmlFor="location">Headquarters Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, State/Country"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Foundation & Mission</h3>
              <p className="text-gray-600">Tell us about your company's founding and core mission</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="foundingYear">Founding Year *</Label>
                <Input
                  id="foundingYear"
                  value={formData.foundingYear}
                  onChange={(e) => setFormData(prev => ({ ...prev, foundingYear: e.target.value }))}
                  placeholder="e.g., 2023"
                />
              </div>
              
              <div>
                <Label htmlFor="missionStatement">Core Mission Statement *</Label>
                <Textarea
                  id="missionStatement"
                  value={formData.missionStatement}
                  onChange={(e) => setFormData(prev => ({ ...prev, missionStatement: e.target.value }))}
                  placeholder="Describe your company's core mission and purpose..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Target className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Problem & Solution</h3>
              <p className="text-gray-600">What problem do you solve and how?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="coreProblem">What specific problem does your company address? *</Label>
                <Textarea
                  id="coreProblem"
                  value={formData.coreProblem}
                  onChange={(e) => setFormData(prev => ({ ...prev, coreProblem: e.target.value }))}
                  placeholder="Describe the market problem or gap your company addresses..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="solutionDescription">Describe your product or service solution *</Label>
                <Textarea
                  id="solutionDescription"
                  value={formData.solutionDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, solutionDescription: e.target.value }))}
                  placeholder="Explain how your product/service solves the problem..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Lightbulb className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">What Makes You Unique</h3>
              <p className="text-gray-600">What sets your offering apart from existing options?</p>
            </div>
            
            <div className="space-y-4">
              <Label>Key Differentiators *</Label>
              {formData.keyDifferentiators.map((differentiator, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={differentiator}
                    onChange={(e) => updateArrayItem('keyDifferentiators', index, e.target.value)}
                    placeholder="What makes your solution unique..."
                  />
                  {formData.keyDifferentiators.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem('keyDifferentiators', index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('keyDifferentiators', '')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Differentiator</span>
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Target Market</h3>
              <p className="text-gray-600">Who are your customers and what's the market opportunity?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="targetMarket">Target Market *</Label>
                <Textarea
                  id="targetMarket"
                  value={formData.targetMarket}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetMarket: e.target.value }))}
                  placeholder="Describe your ideal customers and target audience..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="marketSize">Market Size *</Label>
                <Input
                  id="marketSize"
                  value={formData.marketSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, marketSize: e.target.value }))}
                  placeholder="e.g., $50 billion in 2025"
                />
              </div>
              
              <div>
                <Label htmlFor="growthRate">Market Growth Rate</Label>
                <Input
                  id="growthRate"
                  value={formData.growthRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, growthRate: e.target.value }))}
                  placeholder="e.g., 15% CAGR"
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <DollarSign className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Business Model</h3>
              <p className="text-gray-600">How does your business generate revenue?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessModel">Revenue Generation Model *</Label>
                <Textarea
                  id="businessModel"
                  value={formData.businessModel}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessModel: e.target.value }))}
                  placeholder="Describe how your business generates revenue..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="pricingStrategy">Pricing Strategy *</Label>
                <Textarea
                  id="pricingStrategy"
                  value={formData.pricingStrategy}
                  onChange={(e) => setFormData(prev => ({ ...prev, pricingStrategy: e.target.value }))}
                  placeholder="Describe your pricing approach and strategy..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Revenue Streams</Label>
                {formData.revenueStreams.map((stream, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={stream}
                      onChange={(e) => updateArrayItem('revenueStreams', index, e.target.value)}
                      placeholder="e.g., Subscription fees, Direct sales..."
                    />
                    {formData.revenueStreams.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('revenueStreams', index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('revenueStreams', '')}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Revenue Stream</span>
                </Button>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Competitive Landscape</h3>
              <p className="text-gray-600">What are your competitive advantages and who are your competitors?</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key Competitive Advantages *</Label>
                {formData.competitiveAdvantages.map((advantage, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={advantage}
                      onChange={(e) => updateArrayItem('competitiveAdvantages', index, e.target.value)}
                      placeholder="What gives you a competitive edge..."
                    />
                    {formData.competitiveAdvantages.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('competitiveAdvantages', index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('competitiveAdvantages', '')}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Advantage</span>
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label>Main Competitors</Label>
                {formData.keyCompetitors.map((competitor, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={competitor}
                      onChange={(e) => updateArrayItem('keyCompetitors', index, e.target.value)}
                      placeholder="Company name or type of competitor..."
                    />
                    {formData.keyCompetitors.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('keyCompetitors', index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('keyCompetitors', '')}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Competitor</span>
                </Button>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Award className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Traction & Milestones</h3>
              <p className="text-gray-600">What achievements and milestones have you reached?</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Traction & Milestones *</Label>
                <p className="text-sm text-gray-600">Include users, revenue, funding, partnerships, product launches, etc.</p>
                {formData.tractionMilestones.map((milestone, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={milestone}
                      onChange={(e) => updateArrayItem('tractionMilestones', index, e.target.value)}
                      placeholder="e.g., 10,000 users, $100K revenue, Series A funding..."
                    />
                    {formData.tractionMilestones.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('tractionMilestones', index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('tractionMilestones', '')}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Milestone</span>
                </Button>
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Financial Snapshot</h3>
              <p className="text-gray-600">Provide your current and projected financial information</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentRevenue">Current Revenue</Label>
                <Input
                  id="currentRevenue"
                  value={formData.financials.currentRevenue}
                  onChange={(e) => updateFinancials('currentRevenue', e.target.value)}
                  placeholder="e.g., $500K in 2025"
                />
              </div>
              
              <div>
                <Label htmlFor="projectedRevenue">Projected Revenue</Label>
                <Input
                  id="projectedRevenue"
                  value={formData.financials.projectedRevenue}
                  onChange={(e) => updateFinancials('projectedRevenue', e.target.value)}
                  placeholder="e.g., $2M by 2027"
                />
              </div>
              
              <div>
                <Label htmlFor="fundingRaised">Funding Raised to Date</Label>
                <Input
                  id="fundingRaised"
                  value={formData.financials.fundingRaised}
                  onChange={(e) => updateFinancials('fundingRaised', e.target.value)}
                  placeholder="e.g., $250K in pre-seed"
                />
              </div>
              
              <div>
                <Label htmlFor="fundingSought">Funding Sought</Label>
                <Input
                  id="fundingSought"
                  value={formData.financials.fundingSought}
                  onChange={(e) => updateFinancials('fundingSought', e.target.value)}
                  placeholder="e.g., Seeking $1M Series A"
                />
              </div>
              
              <div>
                <Label htmlFor="fundUse">How will you use the funds?</Label>
                <Textarea
                  id="fundUse"
                  value={formData.financials.fundUse}
                  onChange={(e) => updateFinancials('fundUse', e.target.value)}
                  placeholder="e.g., 50% product development, 30% marketing, 20% hiring..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <UserCheck className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Core Team</h3>
              <p className="text-gray-600">Introduce your key team members and their experience</p>
            </div>
            
            <div className="space-y-4">
              <Label>Team Members *</Label>
              {formData.team.map((member, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Team Member {index + 1}</h4>
                      {formData.team.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeArrayItem('team', index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        value={member.name}
                        onChange={(e) => updateArrayItem('team', index, { ...member, name: e.target.value })}
                        placeholder="Full name"
                      />
                      <Input
                        value={member.title}
                        onChange={(e) => updateArrayItem('team', index, { ...member, title: e.target.value })}
                        placeholder="Title/Role"
                      />
                    </div>
                    <Textarea
                      value={member.background}
                      onChange={(e) => updateArrayItem('team', index, { ...member, background: e.target.value })}
                      placeholder="Brief background and relevant experience..."
                      rows={2}
                    />
                  </div>
                </Card>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('team', { name: '', title: '', background: '' })}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Team Member</span>
              </Button>
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Mail className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Call to Action</h3>
              <p className="text-gray-600">What's your ask and how can people reach you?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="callToAction">Call to Action *</Label>
                <Textarea
                  id="callToAction"
                  value={formData.callToAction}
                  onChange={(e) => setFormData(prev => ({ ...prev, callToAction: e.target.value }))}
                  placeholder="What are you seeking? e.g., Investment, strategic partnerships, customers..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="best.email@company.com"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">AI Executive Summary Generator</h2>
              <p className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            <Card>
              <CardContent className="p-6">
                {renderStepContent()}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 p-6 border-t bg-gray-50">
        {/* AI Disclaimer */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>AI-Generated Content:</strong> This document is created using AI for informational purposes only. 
            Not financial, legal, or investment advice. <a href="#" className="underline hover:text-blue-800">View full disclaimer</a>
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!canProceed && (
              <div className="flex items-center space-x-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Please fill in required fields</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={generateDocument}
                disabled={!canProceed || isGenerating}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>Generate Executive Summary</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { ExecutiveSummaryGenerator };