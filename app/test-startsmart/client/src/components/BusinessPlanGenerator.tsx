import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Building2,
  Target,
  Lightbulb,
  TrendingUp,
  Users,
  Package,
  Megaphone,
  DollarSign,
  Zap,
  MapPin,
  Calendar,
  UserCheck,
  PieChart,
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  Minus,
  Mail
} from "lucide-react";

interface TeamMember {
  name: string;
  title: string;
  background: string;
}

interface RevenueProjections {
  year_1: string;
  year_3: string;
}

interface FormData {
  company_name: string;
  industry: string;
  location: string;
  plan_date: string;
  mission_statement: string;
  vision_statement: string;
  business_structure: string;
  founding_story: string;
  core_values: string[];
  key_objectives: string[];
  industry_overview: string;
  target_market: string;
  demographics: string;
  geographics: string;
  psychographics: string;
  market_needs: string;
  competitive_landscape: string[];
  market_share_goal: string;
  product_description: string;
  key_features: string[];
  product_benefits: string;
  unique_selling_proposition: string;
  development_stage: string;
  future_offerings: string[];
  positioning: string;
  marketing_channels: string[];
  sales_strategy: string;
  customer_acquisition_cost: string;
  retention_strategy: string;
  sales_metrics: string[];
  revenue_streams: string[];
  pricing_strategy: string;
  cost_structure: string;
  scalability: string;
  competitor_analysis: string[];
  barriers_to_entry: string[];
  operations_location: string;
  facilities_technology: string;
  team_structure: string;
  key_processes: string[];
  suppliers_partners: string[];
  milestones: string[];
  management_team: TeamMember[];
  advisors: string[];
  hiring_plan: string;
  revenue_projections: RevenueProjections;
  expenses: string[];
  break_even_point: string;
  funding_required: string;
  fund_use: string[];
  financial_assumptions: string[];
  exit_strategy: string;
  investor_roi: string;
  appendices: string[];
}

interface BusinessPlanGeneratorProps {
  onClose: () => void;
}

function BusinessPlanGenerator({ onClose }: BusinessPlanGeneratorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    company_name: "",
    industry: "",
    location: "",
    plan_date: new Date().toLocaleDateString(),
    mission_statement: "",
    vision_statement: "",
    business_structure: "",
    founding_story: "",
    core_values: [""],
    key_objectives: [""],
    industry_overview: "",
    target_market: "",
    demographics: "",
    geographics: "",
    psychographics: "",
    market_needs: "",
    competitive_landscape: [""],
    market_share_goal: "",
    product_description: "",
    key_features: [""],
    product_benefits: "",
    unique_selling_proposition: "",
    development_stage: "",
    future_offerings: [""],
    positioning: "",
    marketing_channels: [""],
    sales_strategy: "",
    customer_acquisition_cost: "",
    retention_strategy: "",
    sales_metrics: [""],
    revenue_streams: [""],
    pricing_strategy: "",
    cost_structure: "",
    scalability: "",
    competitor_analysis: [""],
    barriers_to_entry: [""],
    operations_location: "",
    facilities_technology: "",
    team_structure: "",
    key_processes: [""],
    suppliers_partners: [""],
    milestones: [""],
    management_team: [{ name: "", title: "", background: "" }],
    advisors: [""],
    hiring_plan: "",
    revenue_projections: {
      year_1: "",
      year_3: ""
    },
    expenses: [""],
    break_even_point: "",
    funding_required: "",
    fund_use: [""],
    financial_assumptions: [""],
    exit_strategy: "",
    investor_roi: "",
    appendices: [""]
  });

  const totalSteps = 21;

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

  const updateRevenueProjections = (key: keyof RevenueProjections, value: string) => {
    setFormData(prev => ({
      ...prev,
      revenue_projections: {
        ...prev.revenue_projections,
        [key]: value
      }
    }));
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.company_name && formData.industry && formData.location);
      case 2:
        return !!(formData.mission_statement && formData.vision_statement);
      case 3:
        return !!(formData.business_structure && formData.founding_story);
      case 4:
        return formData.core_values.some(v => v.trim()) && formData.key_objectives.some(o => o.trim());
      case 5:
        return !!formData.industry_overview;
      case 6:
        return !!(formData.target_market && formData.demographics);
      case 7:
        return !!(formData.market_needs && formData.market_share_goal);
      case 8:
        return !!(formData.product_description && formData.unique_selling_proposition);
      case 9:
        return !!(formData.development_stage && formData.product_benefits);
      case 10:
        return !!(formData.positioning && formData.marketing_channels.some(c => c.trim()));
      case 11:
        return !!(formData.sales_strategy && formData.retention_strategy);
      case 12:
        return !!(formData.revenue_streams.some(r => r.trim()) && formData.pricing_strategy);
      case 13:
        return formData.competitor_analysis.some(c => c.trim());
      case 14:
        return !!(formData.operations_location && formData.facilities_technology);
      case 15:
        return formData.milestones.some(m => m.trim());
      case 16:
        return formData.management_team.some(m => m.name && m.title);
      case 17:
        return !!(formData.revenue_projections.year_1 && formData.break_even_point);
      case 18:
        return !!(formData.funding_required && formData.fund_use.some(f => f.trim()));
      case 19:
        return formData.financial_assumptions.some(a => a.trim());
      case 20:
        return !!(formData.exit_strategy && formData.investor_roi);
      case 21:
        return true; // Appendices are optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps && isStepValid(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const generateDocument = async () => {
    if (!isStepValid(20)) { // Allow generation if step 20 is valid (step 21 is optional)
      toast({
        title: "Missing Information",
        description: "Please complete all required fields before generating.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/business-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error("Failed to generate business plan");
      }

      const result = await response.json();
      setGeneratedDocument(result.document);
      setShowPreview(true);
      
      toast({
        title: "Success!",
        description: "Your Business Plan has been generated.",
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

    const companyName = formData.company_name || 'Business';
    const filename = `${companyName}_Business_Plan`;

    if (format === 'txt') {
      const blob = new Blob([generatedDocument], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'docx') {
      // Create a simple Word-compatible document using RTF format
      const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24 
{\\b\\fs28 ${companyName} - Business Plan\\par}
{\\fs20 Generated on ${new Date().toLocaleDateString()}\\par\\par}
${generatedDocument.replace(/\n/g, '\\par ')}}`;
      
      const blob = new Blob([rtfContent], { type: 'application/rtf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename}</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
                h1, h2, h3 { color: #333; page-break-after: avoid; }
                .header { text-align: center; margin-bottom: 30px; }
                @media print { body { margin: 20px; } }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${companyName} - Business Plan</h1>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
              </div>
              ${generatedDocument.split('\n').map(line => {
                if (line.trim().startsWith('#')) {
                  return `<h2>${line.replace(/^#+\s*/, '')}</h2>`;
                }
                return line.trim() ? `<p>${line}</p>` : '<br>';
              }).join('')}
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
      description: `Your Business Plan is being downloaded as ${format.toUpperCase()}.`,
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
                <h2 className="text-xl font-semibold">Business Plan Generated</h2>
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
                          This Business Plan was created using AI for informational purposes only. 
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

              {/* Download Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5 text-blue-600" />
                    <span>Download Options</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => downloadDocument('txt')}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Download TXT</span>
                    </Button>
                    <Button
                      onClick={() => downloadDocument('docx')}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Download DOC</span>
                    </Button>
                    <Button
                      onClick={() => downloadDocument('pdf')}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Download PDF</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getStepIcon = (step: number) => {
    const icons = [
      Building2, Target, Lightbulb, TrendingUp, Users, Package, Megaphone, 
      DollarSign, Zap, MapPin, Calendar, UserCheck, PieChart, Building2,
      Target, Users, DollarSign, PieChart, TrendingUp, Zap, FileText
    ];
    const IconComponent = icons[step - 1] || FileText;
    return <IconComponent className="h-12 w-12 text-blue-600 mx-auto mb-3" />;
  };

  const getStepTitle = (step: number) => {
    const titles = [
      "Company Basics", "Mission & Vision", "Business Structure", "Values & Objectives",
      "Industry Analysis", "Target Market", "Market Needs", "Product/Service",
      "Development Stage", "Market Positioning", "Sales Strategy", "Business Model",
      "Competition", "Operations", "Milestones", "Team", "Financial Projections",
      "Funding Requirements", "Financial Assumptions", "Exit Strategy", "Appendices"
    ];
    return titles[step - 1] || "Step";
  };

  const getStepDescription = (step: number) => {
    const descriptions = [
      "Basic company information and details",
      "Your company's mission and vision statements",
      "Business structure and founding story",
      "Core values and key objectives",
      "Industry landscape and trends",
      "Target customer demographics",
      "Market needs and share goals",
      "Product/service description and USP",
      "Development stage and future offerings",
      "Market positioning and channels",
      "Sales strategy and retention",
      "Revenue model and pricing",
      "Competitive analysis",
      "Operations and facilities",
      "Key milestones and timeline",
      "Management team and advisors",
      "Financial projections and metrics",
      "Funding needs and usage",
      "Financial assumptions",
      "Exit strategy and ROI",
      "Additional materials and appendices"
    ];
    return descriptions[step - 1] || "Step description";
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Enter your company name"
                />
              </div>
              
              <div>
                <Label htmlFor="industry">Industry *</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g., Technology, Healthcare, E-commerce"
                />
              </div>
              
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., San Francisco, CA"
                />
              </div>
              
              <div>
                <Label htmlFor="plan_date">Plan Date</Label>
                <Input
                  id="plan_date"
                  value={formData.plan_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, plan_date: e.target.value }))}
                  placeholder="Date of business plan creation"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="mission_statement">Mission Statement *</Label>
                <Textarea
                  id="mission_statement"
                  value={formData.mission_statement}
                  onChange={(e) => setFormData(prev => ({ ...prev, mission_statement: e.target.value }))}
                  placeholder="What is your company's purpose and reason for existing?"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="vision_statement">Vision Statement *</Label>
                <Textarea
                  id="vision_statement"
                  value={formData.vision_statement}
                  onChange={(e) => setFormData(prev => ({ ...prev, vision_statement: e.target.value }))}
                  placeholder="What does your company aspire to become in the future?"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="business_structure">Business Structure *</Label>
                <Input
                  id="business_structure"
                  value={formData.business_structure}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_structure: e.target.value }))}
                  placeholder="e.g., LLC, Corporation, Partnership"
                />
              </div>
              
              <div>
                <Label htmlFor="founding_story">Founding Story *</Label>
                <Textarea
                  id="founding_story"
                  value={formData.founding_story}
                  onChange={(e) => setFormData(prev => ({ ...prev, founding_story: e.target.value }))}
                  placeholder="How and why was your company founded? What inspired you to start?"
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Core Values *</Label>
                {formData.core_values.map((value, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={value}
                      onChange={(e) => updateArrayItem('core_values', index, e.target.value)}
                      placeholder="Enter a core value"
                    />
                    {formData.core_values.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('core_values', index)}
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
                  onClick={() => addArrayItem('core_values', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Value
                </Button>
              </div>
              
              <div>
                <Label>Key Objectives *</Label>
                {formData.key_objectives.map((objective, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={objective}
                      onChange={(e) => updateArrayItem('key_objectives', index, e.target.value)}
                      placeholder="Enter a key objective"
                    />
                    {formData.key_objectives.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('key_objectives', index)}
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
                  onClick={() => addArrayItem('key_objectives', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Objective
                </Button>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="industry_overview">Industry Overview *</Label>
                <Textarea
                  id="industry_overview"
                  value={formData.industry_overview}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry_overview: e.target.value }))}
                  placeholder="Describe the overall industry landscape, growth trends, and key developments..."
                  rows={5}
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="target_market">Target Market *</Label>
                <Textarea
                  id="target_market"
                  value={formData.target_market}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_market: e.target.value }))}
                  placeholder="Who is your target customer? Be specific about your ideal customer profile..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="demographics">Demographics *</Label>
                <Textarea
                  id="demographics"
                  value={formData.demographics}
                  onChange={(e) => setFormData(prev => ({ ...prev, demographics: e.target.value }))}
                  placeholder="Age, income, education, occupation, family status, etc."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="geographics">Geographic Details</Label>
                <Input
                  id="geographics"
                  value={formData.geographics}
                  onChange={(e) => setFormData(prev => ({ ...prev, geographics: e.target.value }))}
                  placeholder="Geographic location and reach"
                />
              </div>
              
              <div>
                <Label htmlFor="psychographics">Psychographics</Label>
                <Textarea
                  id="psychographics"
                  value={formData.psychographics}
                  onChange={(e) => setFormData(prev => ({ ...prev, psychographics: e.target.value }))}
                  placeholder="Values, interests, lifestyle, behaviors, attitudes..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="market_needs">Market Needs *</Label>
                <Textarea
                  id="market_needs"
                  value={formData.market_needs}
                  onChange={(e) => setFormData(prev => ({ ...prev, market_needs: e.target.value }))}
                  placeholder="What unmet market needs do you address? What problems are you solving?"
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="market_share_goal">Market Share Goal *</Label>
                <Input
                  id="market_share_goal"
                  value={formData.market_share_goal}
                  onChange={(e) => setFormData(prev => ({ ...prev, market_share_goal: e.target.value }))}
                  placeholder="e.g., 5% of local market within 3 years"
                />
              </div>
              
              <div>
                <Label>Competitive Landscape</Label>
                {formData.competitive_landscape.map((competitor, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={competitor}
                      onChange={(e) => updateArrayItem('competitive_landscape', index, e.target.value)}
                      placeholder="Describe a key competitor or market trend"
                    />
                    {formData.competitive_landscape.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('competitive_landscape', index)}
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
                  onClick={() => addArrayItem('competitive_landscape', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Competitor/Trend
                </Button>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="product_description">Product/Service Description *</Label>
                <Textarea
                  id="product_description"
                  value={formData.product_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_description: e.target.value }))}
                  placeholder="Describe your product or service in detail..."
                  rows={4}
                />
              </div>
              
              <div>
                <Label>Key Features</Label>
                {formData.key_features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={feature}
                      onChange={(e) => updateArrayItem('key_features', index, e.target.value)}
                      placeholder="Enter a key feature"
                    />
                    {formData.key_features.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('key_features', index)}
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
                  onClick={() => addArrayItem('key_features', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Feature
                </Button>
              </div>
              
              <div>
                <Label htmlFor="unique_selling_proposition">Unique Selling Proposition *</Label>
                <Textarea
                  id="unique_selling_proposition"
                  value={formData.unique_selling_proposition}
                  onChange={(e) => setFormData(prev => ({ ...prev, unique_selling_proposition: e.target.value }))}
                  placeholder="What makes your product/service unique and better than alternatives?"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="development_stage">Development Stage *</Label>
                <Input
                  id="development_stage"
                  value={formData.development_stage}
                  onChange={(e) => setFormData(prev => ({ ...prev, development_stage: e.target.value }))}
                  placeholder="e.g., MVP, Beta, Launched, Scaling"
                />
              </div>
              
              <div>
                <Label htmlFor="product_benefits">Product Benefits *</Label>
                <Textarea
                  id="product_benefits"
                  value={formData.product_benefits}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_benefits: e.target.value }))}
                  placeholder="What specific benefits do customers receive from your product/service?"
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Future Offerings</Label>
                {formData.future_offerings.map((offering, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={offering}
                      onChange={(e) => updateArrayItem('future_offerings', index, e.target.value)}
                      placeholder="Planned future product or service"
                    />
                    {formData.future_offerings.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('future_offerings', index)}
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
                  onClick={() => addArrayItem('future_offerings', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Future Offering
                </Button>
              </div>
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="positioning">Market Positioning *</Label>
                <Textarea
                  id="positioning"
                  value={formData.positioning}
                  onChange={(e) => setFormData(prev => ({ ...prev, positioning: e.target.value }))}
                  placeholder="How do you position yourself in the market? What's your brand message?"
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Marketing Channels *</Label>
                {formData.marketing_channels.map((channel, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={channel}
                      onChange={(e) => updateArrayItem('marketing_channels', index, e.target.value)}
                      placeholder="e.g., Social Media, Content Marketing, SEO"
                    />
                    {formData.marketing_channels.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('marketing_channels', index)}
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
                  onClick={() => addArrayItem('marketing_channels', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Channel
                </Button>
              </div>
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="sales_strategy">Sales Strategy *</Label>
                <Textarea
                  id="sales_strategy"
                  value={formData.sales_strategy}
                  onChange={(e) => setFormData(prev => ({ ...prev, sales_strategy: e.target.value }))}
                  placeholder="How will you sell your product/service? What's your sales process?"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="customer_acquisition_cost">Customer Acquisition Cost</Label>
                <Input
                  id="customer_acquisition_cost"
                  value={formData.customer_acquisition_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_acquisition_cost: e.target.value }))}
                  placeholder="e.g., $50 per customer"
                />
              </div>
              
              <div>
                <Label htmlFor="retention_strategy">Customer Retention Strategy *</Label>
                <Textarea
                  id="retention_strategy"
                  value={formData.retention_strategy}
                  onChange={(e) => setFormData(prev => ({ ...prev, retention_strategy: e.target.value }))}
                  placeholder="How will you retain customers and build loyalty?"
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Sales Metrics</Label>
                {formData.sales_metrics.map((metric, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={metric}
                      onChange={(e) => updateArrayItem('sales_metrics', index, e.target.value)}
                      placeholder="e.g., Monthly recurring revenue, Conversion rate"
                    />
                    {formData.sales_metrics.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('sales_metrics', index)}
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
                  onClick={() => addArrayItem('sales_metrics', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Metric
                </Button>
              </div>
            </div>
          </div>
        );

      case 12:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Revenue Streams *</Label>
                {formData.revenue_streams.map((stream, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={stream}
                      onChange={(e) => updateArrayItem('revenue_streams', index, e.target.value)}
                      placeholder="e.g., Subscription fees, One-time sales, Licensing"
                    />
                    {formData.revenue_streams.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('revenue_streams', index)}
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
                  onClick={() => addArrayItem('revenue_streams', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Revenue Stream
                </Button>
              </div>
              
              <div>
                <Label htmlFor="pricing_strategy">Pricing Strategy *</Label>
                <Textarea
                  id="pricing_strategy"
                  value={formData.pricing_strategy}
                  onChange={(e) => setFormData(prev => ({ ...prev, pricing_strategy: e.target.value }))}
                  placeholder="How do you price your products/services? What's your pricing model?"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="cost_structure">Cost Structure</Label>
                <Textarea
                  id="cost_structure"
                  value={formData.cost_structure}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_structure: e.target.value }))}
                  placeholder="What are your major costs? Fixed vs variable costs?"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="scalability">Scalability</Label>
                <Textarea
                  id="scalability"
                  value={formData.scalability}
                  onChange={(e) => setFormData(prev => ({ ...prev, scalability: e.target.value }))}
                  placeholder="How will your business model scale? What are the growth levers?"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 13:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Competitor Analysis *</Label>
                {formData.competitor_analysis.map((competitor, index) => (
                  <div key={index} className="mt-2">
                    <Textarea
                      value={competitor}
                      onChange={(e) => updateArrayItem('competitor_analysis', index, e.target.value)}
                      placeholder="Competitor name, strengths, weaknesses, market position..."
                      rows={3}
                    />
                    {formData.competitor_analysis.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('competitor_analysis', index)}
                        className="mt-2"
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('competitor_analysis', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Competitor
                </Button>
              </div>
              
              <div>
                <Label>Barriers to Entry</Label>
                {formData.barriers_to_entry.map((barrier, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={barrier}
                      onChange={(e) => updateArrayItem('barriers_to_entry', index, e.target.value)}
                      placeholder="e.g., High capital requirements, Network effects"
                    />
                    {formData.barriers_to_entry.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('barriers_to_entry', index)}
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
                  onClick={() => addArrayItem('barriers_to_entry', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Barrier
                </Button>
              </div>
            </div>
          </div>
        );

      case 14:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="operations_location">Operations Location *</Label>
                <Input
                  id="operations_location"
                  value={formData.operations_location}
                  onChange={(e) => setFormData(prev => ({ ...prev, operations_location: e.target.value }))}
                  placeholder="Where do you operate from? Remote, office, multiple locations?"
                />
              </div>
              
              <div>
                <Label htmlFor="facilities_technology">Facilities & Technology *</Label>
                <Textarea
                  id="facilities_technology"
                  value={formData.facilities_technology}
                  onChange={(e) => setFormData(prev => ({ ...prev, facilities_technology: e.target.value }))}
                  placeholder="Describe your facilities, technology infrastructure, equipment..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="team_structure">Team Structure</Label>
                <Textarea
                  id="team_structure"
                  value={formData.team_structure}
                  onChange={(e) => setFormData(prev => ({ ...prev, team_structure: e.target.value }))}
                  placeholder="How is your team organized? Departments, reporting structure..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Key Processes</Label>
                {formData.key_processes.map((process, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={process}
                      onChange={(e) => updateArrayItem('key_processes', index, e.target.value)}
                      placeholder="e.g., Order fulfillment, Customer onboarding"
                    />
                    {formData.key_processes.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('key_processes', index)}
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
                  onClick={() => addArrayItem('key_processes', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Process
                </Button>
              </div>
              
              <div>
                <Label>Suppliers & Partners</Label>
                {formData.suppliers_partners.map((partner, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={partner}
                      onChange={(e) => updateArrayItem('suppliers_partners', index, e.target.value)}
                      placeholder="Key supplier or strategic partner"
                    />
                    {formData.suppliers_partners.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('suppliers_partners', index)}
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
                  onClick={() => addArrayItem('suppliers_partners', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Partner
                </Button>
              </div>
            </div>
          </div>
        );

      case 15:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Key Milestones *</Label>
                {formData.milestones.map((milestone, index) => (
                  <div key={index} className="mt-2">
                    <Textarea
                      value={milestone}
                      onChange={(e) => updateArrayItem('milestones', index, e.target.value)}
                      placeholder="Milestone description and timeline (e.g., 'Launch MVP - Q1 2024')"
                      rows={2}
                    />
                    {formData.milestones.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('milestones', index)}
                        className="mt-2"
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('milestones', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </div>
            </div>
          </div>
        );

      case 16:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Management Team *</Label>
                {formData.management_team.map((member, index) => (
                  <Card key={index} className="p-4 mt-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Team Member {index + 1}</h4>
                        {formData.management_team.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeArrayItem('management_team', index)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          value={member.name}
                          onChange={(e) => updateArrayItem('management_team', index, { ...member, name: e.target.value })}
                          placeholder="Full name"
                        />
                        <Input
                          value={member.title}
                          onChange={(e) => updateArrayItem('management_team', index, { ...member, title: e.target.value })}
                          placeholder="Title/Role"
                        />
                      </div>
                      <Textarea
                        value={member.background}
                        onChange={(e) => updateArrayItem('management_team', index, { ...member, background: e.target.value })}
                        placeholder="Background, experience, and relevant qualifications..."
                        rows={2}
                      />
                    </div>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('management_team', { name: '', title: '', background: '' })}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>
              </div>
              
              <div>
                <Label>Advisors</Label>
                {formData.advisors.map((advisor, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={advisor}
                      onChange={(e) => updateArrayItem('advisors', index, e.target.value)}
                      placeholder="Advisor name and expertise"
                    />
                    {formData.advisors.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('advisors', index)}
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
                  onClick={() => addArrayItem('advisors', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Advisor
                </Button>
              </div>
              
              <div>
                <Label htmlFor="hiring_plan">Hiring Plan</Label>
                <Textarea
                  id="hiring_plan"
                  value={formData.hiring_plan}
                  onChange={(e) => setFormData(prev => ({ ...prev, hiring_plan: e.target.value }))}
                  placeholder="What are your hiring plans? Which roles will you add and when?"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 17:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year_1_revenue">Year 1 Revenue Projection *</Label>
                  <Input
                    id="year_1_revenue"
                    value={formData.revenue_projections.year_1}
                    onChange={(e) => updateRevenueProjections('year_1', e.target.value)}
                    placeholder="e.g., $100,000"
                  />
                </div>
                
                <div>
                  <Label htmlFor="year_3_revenue">Year 3 Revenue Projection *</Label>
                  <Input
                    id="year_3_revenue"
                    value={formData.revenue_projections.year_3}
                    onChange={(e) => updateRevenueProjections('year_3', e.target.value)}
                    placeholder="e.g., $1,000,000"
                  />
                </div>
              </div>
              
              <div>
                <Label>Major Expenses</Label>
                {formData.expenses.map((expense, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={expense}
                      onChange={(e) => updateArrayItem('expenses', index, e.target.value)}
                      placeholder="e.g., Salaries - $200k/year, Marketing - $50k/year"
                    />
                    {formData.expenses.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('expenses', index)}
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
                  onClick={() => addArrayItem('expenses', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </div>
              
              <div>
                <Label htmlFor="break_even_point">Break-Even Point *</Label>
                <Input
                  id="break_even_point"
                  value={formData.break_even_point}
                  onChange={(e) => setFormData(prev => ({ ...prev, break_even_point: e.target.value }))}
                  placeholder="e.g., Month 18, $50,000 monthly revenue"
                />
              </div>
            </div>
          </div>
        );

      case 18:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="funding_required">Funding Required *</Label>
                <Input
                  id="funding_required"
                  value={formData.funding_required}
                  onChange={(e) => setFormData(prev => ({ ...prev, funding_required: e.target.value }))}
                  placeholder="e.g., $500,000"
                />
              </div>
              
              <div>
                <Label>Fund Use *</Label>
                {formData.fund_use.map((use, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={use}
                      onChange={(e) => updateArrayItem('fund_use', index, e.target.value)}
                      placeholder="e.g., 40% Product Development, 30% Marketing, 20% Hiring"
                    />
                    {formData.fund_use.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('fund_use', index)}
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
                  onClick={() => addArrayItem('fund_use', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fund Use
                </Button>
              </div>
            </div>
          </div>
        );

      case 19:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Financial Assumptions *</Label>
                {formData.financial_assumptions.map((assumption, index) => (
                  <div key={index} className="mt-2">
                    <Textarea
                      value={assumption}
                      onChange={(e) => updateArrayItem('financial_assumptions', index, e.target.value)}
                      placeholder="Key assumption affecting your financial projections..."
                      rows={2}
                    />
                    {formData.financial_assumptions.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('financial_assumptions', index)}
                        className="mt-2"
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('financial_assumptions', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Assumption
                </Button>
              </div>
            </div>
          </div>
        );

      case 20:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="exit_strategy">Exit Strategy *</Label>
                <Textarea
                  id="exit_strategy"
                  value={formData.exit_strategy}
                  onChange={(e) => setFormData(prev => ({ ...prev, exit_strategy: e.target.value }))}
                  placeholder="How do you plan to exit? IPO, acquisition, management buyout?"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="investor_roi">Projected ROI for Investors *</Label>
                <Input
                  id="investor_roi"
                  value={formData.investor_roi}
                  onChange={(e) => setFormData(prev => ({ ...prev, investor_roi: e.target.value }))}
                  placeholder="e.g., 10x return in 5 years"
                />
              </div>
            </div>
          </div>
        );

      case 21:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">{getStepTitle(currentStep)}</h3>
              <p className="text-gray-600">{getStepDescription(currentStep)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Appendices (Optional)</Label>
                {formData.appendices.map((appendix, index) => (
                  <div key={index} className="flex items-center space-x-2 mt-2">
                    <Input
                      value={appendix}
                      onChange={(e) => updateArrayItem('appendices', index, e.target.value)}
                      placeholder="e.g., Financial models, Product screenshots, Team resumes"
                    />
                    {formData.appendices.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('appendices', index)}
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
                  onClick={() => addArrayItem('appendices', '')}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Appendix
                </Button>
              </div>
              
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <p className="text-sm text-emerald-700">
                  Ready to generate your comprehensive Business Plan! This AI-powered document will include all 
                  sections with detailed analysis, market insights, and professional formatting ready for investors and stakeholders.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Step {currentStep}</h3>
            <p className="text-gray-500">Step content coming soon...</p>
          </div>
        );
    }
  };

  const canProceed = isStepValid(currentStep);

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">AI Business Plan Generator</h2>
              <p className="text-sm text-gray-600">Create a comprehensive business plan with AI assistance</p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
          </div>
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
                    <span>Generate Business Plan</span>
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

export { BusinessPlanGenerator };