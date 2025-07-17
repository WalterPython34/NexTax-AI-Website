import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, TrendingUp, FileText, Users, Target, Mail, Calendar, BarChart } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PremiumAutomationTemplatesProps {
  onClose: () => void;
}

export default function PremiumAutomationTemplates({ onClose }: PremiumAutomationTemplatesProps) {
  const [activeTab, setActiveTab] = useState('investor-one-pager');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    // Investor One-Pager
    companyName: '',
    fundingAsk: '',
    team: '',
    traction: '',
    product: '',
    marketSize: '',
    useOfFunds: '',
    
    // Grant Application
    grantType: '',
    businessSummary: '',
    fundingAmount: '',
    projectDescription: '',
    
    // Due Diligence Pack
    raiseAmount: '',
    stage: '',
    hasCapTable: 'No',
    
    // KPI Dashboard
    businessModel: '',
    goals: '',
    revenueModel: '',
    industry: '',
    
    // CRM Email Scripts
    productType: '',
    audience: '',
    salesStrategy: '',
    
    // Marketing Plan
    monthlyBudget: '',
    channels: '',
    audienceGoals: '',
    businessGoals: '',
    
    // Launch Timeline
    launchDate: '',
    steps: '',
    teamSize: '',
    dependencies: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateTemplate = async (templateType: string) => {
    setIsGenerating(true);
    setGeneratedContent(null);
    
    try {
      const endpoint = `/api/generate/${templateType}`;
      const response = await apiRequest('POST', endpoint, formData);
      const data = await response.json();
      
      setGeneratedContent(data);
      toast({
        title: "Template Generated",
        description: "Your premium template has been created successfully!",
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadContent = (content: string, filename: string, type: string = 'text') => {
    let blob;
    let downloadName;
    
    if (type === 'csv') {
      blob = new Blob([content], { type: 'text/csv' });
      downloadName = `${filename}.csv`;
    } else if (type === 'pdf') {
      // For PDF, we'll use the browser's print functionality
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>${filename}</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <pre style="white-space: pre-wrap;">${content}</pre>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
      return;
    } else {
      blob = new Blob([content], { type: 'text/plain' });
      downloadName = `${filename}.txt`;
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const templates = [
    {
      id: 'investor-one-pager',
      title: 'Investor One-Pager Generator',
      description: 'Professional one-page investor pitch document',
      icon: TrendingUp,
      badge: 'AI-Powered'
    },
    {
      id: 'grant-application',
      title: 'Grant Application Writer',
      description: 'Complete grant applications with AI assistance',
      icon: FileText,
      badge: 'Government Ready'
    },
    {
      id: 'due-diligence-pack',
      title: 'Due Diligence Document Pack',
      description: 'Investor-ready document package builder',
      icon: Users,
      badge: 'Investor Ready'
    },
    {
      id: 'kpi-dashboard',
      title: 'KPI Dashboard Blueprint',
      description: 'Industry-specific KPI tracking spreadsheet',
      icon: BarChart,
      badge: 'Excel Template'
    },
    {
      id: 'crm-email-scripts',
      title: 'Sales CRM Email Scripts',
      description: 'Professional email templates for CRM systems',
      icon: Mail,
      badge: 'CRM Ready'
    },
    {
      id: 'marketing-plan',
      title: 'AI Marketing Plan Creator',
      description: '12-month comprehensive marketing strategy',
      icon: Target,
      badge: '12-Month Plan'
    },
    {
      id: 'launch-timeline',
      title: 'Launch Plan Timeline',
      description: 'Gantt-style launch roadmap with milestones',
      icon: Calendar,
      badge: 'Gantt Chart'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Premium Automation Templates</h2>
          <p className="text-muted-foreground">Investor-focused, high-value business automation tools</p>
        </div>
        <Badge variant="outline" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          Premium $79/month
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-1">
          {templates.map(template => (
            <TabsTrigger
              key={template.id}
              value={template.id}
              className="text-xs p-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500"
            >
              <template.icon className="h-4 w-4" />
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Investor One-Pager */}
        <TabsContent value="investor-one-pager">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Investor One-Pager Generator
              </CardTitle>
              <CardDescription>
                Create a professional one-page investor pitch document with AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    placeholder="Your company name"
                  />
                </div>
                <div>
                  <Label htmlFor="fundingAsk">Funding Ask</Label>
                  <Input
                    id="fundingAsk"
                    value={formData.fundingAsk}
                    onChange={(e) => handleInputChange('fundingAsk', e.target.value)}
                    placeholder="e.g., $500K Seed Round"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="team">Team Overview</Label>
                <Textarea
                  id="team"
                  value={formData.team}
                  onChange={(e) => handleInputChange('team', e.target.value)}
                  placeholder="Key team members and their expertise"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="traction">Traction Highlights</Label>
                <Textarea
                  id="traction"
                  value={formData.traction}
                  onChange={(e) => handleInputChange('traction', e.target.value)}
                  placeholder="Revenue, users, partnerships, milestones"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product">Product Description</Label>
                  <Textarea
                    id="product"
                    value={formData.product}
                    onChange={(e) => handleInputChange('product', e.target.value)}
                    placeholder="What you're building"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="marketSize">Market Size</Label>
                  <Textarea
                    id="marketSize"
                    value={formData.marketSize}
                    onChange={(e) => handleInputChange('marketSize', e.target.value)}
                    placeholder="TAM, SAM, SOM"
                    rows={2}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="useOfFunds">Use of Funds</Label>
                <Textarea
                  id="useOfFunds"
                  value={formData.useOfFunds}
                  onChange={(e) => handleInputChange('useOfFunds', e.target.value)}
                  placeholder="How you'll use the investment"
                  rows={2}
                />
              </div>
              
              <Button 
                onClick={() => generateTemplate('investor-one-pager')}
                disabled={isGenerating || !formData.companyName}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating One-Pager...
                  </>
                ) : (
                  'Generate Investor One-Pager'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grant Application */}
        <TabsContent value="grant-application">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Grant Application Writer
              </CardTitle>
              <CardDescription>
                AI-assisted grant application creation for startup funding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grantType">Grant Type</Label>
                  <Select value={formData.grantType} onValueChange={(value) => handleInputChange('grantType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grant type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SBIR">Small Business Innovation Research (SBIR)</SelectItem>
                      <SelectItem value="STTR">Small Business Technology Transfer (STTR)</SelectItem>
                      <SelectItem value="state-grant">State Small Business Grant</SelectItem>
                      <SelectItem value="neh">National Endowment for the Humanities</SelectItem>
                      <SelectItem value="nsf">National Science Foundation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fundingAmount">Funding Amount</Label>
                  <Input
                    id="fundingAmount"
                    value={formData.fundingAmount}
                    onChange={(e) => handleInputChange('fundingAmount', e.target.value)}
                    placeholder="e.g., $50,000"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="businessSummary">Business Summary</Label>
                <Textarea
                  id="businessSummary"
                  value={formData.businessSummary}
                  onChange={(e) => handleInputChange('businessSummary', e.target.value)}
                  placeholder="Brief overview of your business and mission"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="projectDescription">Project Description</Label>
                <Textarea
                  id="projectDescription"
                  value={formData.projectDescription}
                  onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                  placeholder="Detailed description of the project you're seeking funding for"
                  rows={4}
                />
              </div>
              
              <Button 
                onClick={() => generateTemplate('grant-application')}
                disabled={isGenerating || !formData.grantType}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Writing Application...
                  </>
                ) : (
                  'Generate Grant Application'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Due Diligence Pack */}
        <TabsContent value="due-diligence-pack">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Due Diligence Document Pack
              </CardTitle>
              <CardDescription>
                Comprehensive investor-ready document package builder
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="raiseAmount">Raise Amount</Label>
                  <Input
                    id="raiseAmount"
                    value={formData.raiseAmount}
                    onChange={(e) => handleInputChange('raiseAmount', e.target.value)}
                    placeholder="e.g., $2M Series A"
                  />
                </div>
                <div>
                  <Label htmlFor="stage">Company Stage</Label>
                  <Select value={formData.stage} onValueChange={(value) => handleInputChange('stage', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series-a">Series A</SelectItem>
                      <SelectItem value="series-b">Series B</SelectItem>
                      <SelectItem value="growth">Growth Stage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="hasCapTable">Cap Table Available</Label>
                <Select value={formData.hasCapTable} onValueChange={(value) => handleInputChange('hasCapTable', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes, I have a cap table</SelectItem>
                    <SelectItem value="No">No, need help creating one</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={() => generateTemplate('due-diligence-pack')}
                disabled={isGenerating || !formData.companyName}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building Document Pack...
                  </>
                ) : (
                  'Generate Due Diligence Pack'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI Dashboard */}
        <TabsContent value="kpi-dashboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                KPI Dashboard Blueprint
              </CardTitle>
              <CardDescription>
                Industry-specific KPI tracking spreadsheet with formulas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessModel">Business Model</Label>
                  <Select value={formData.businessModel} onValueChange={(value) => handleInputChange('businessModel', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SaaS">SaaS</SelectItem>
                      <SelectItem value="E-commerce">E-commerce</SelectItem>
                      <SelectItem value="B2B">B2B Services</SelectItem>
                      <SelectItem value="Marketplace">Marketplace</SelectItem>
                      <SelectItem value="Subscription">Subscription</SelectItem>
                      <SelectItem value="Default">Other/General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="revenueModel">Revenue Model</Label>
                  <Input
                    id="revenueModel"
                    value={formData.revenueModel}
                    onChange={(e) => handleInputChange('revenueModel', e.target.value)}
                    placeholder="e.g., Monthly subscriptions"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="goals">Business Goals</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => handleInputChange('goals', e.target.value)}
                  placeholder="Key business objectives and targets"
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={() => generateTemplate('kpi-dashboard')}
                disabled={isGenerating || !formData.businessModel}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Dashboard...
                  </>
                ) : (
                  'Generate KPI Dashboard'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRM Email Scripts */}
        <TabsContent value="crm-email-scripts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Sales CRM Email Scripts
              </CardTitle>
              <CardDescription>
                Professional email templates ready for CRM import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productType">Product/Service Type</Label>
                  <Input
                    id="productType"
                    value={formData.productType}
                    onChange={(e) => handleInputChange('productType', e.target.value)}
                    placeholder="e.g., SaaS platform, consulting service"
                  />
                </div>
                <div>
                  <Label htmlFor="audience">Target Audience</Label>
                  <Input
                    id="audience"
                    value={formData.audience}
                    onChange={(e) => handleInputChange('audience', e.target.value)}
                    placeholder="e.g., Small business owners, CTOs"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="salesStrategy">Sales Strategy</Label>
                <Select value={formData.salesStrategy} onValueChange={(value) => handleInputChange('salesStrategy', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold-outreach">Cold Outreach</SelectItem>
                    <SelectItem value="warm-nurture">Warm Lead Nurture</SelectItem>
                    <SelectItem value="follow-up">Follow-up Sequence</SelectItem>
                    <SelectItem value="upsell">Upsell/Cross-sell</SelectItem>
                    <SelectItem value="retention">Customer Retention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={() => generateTemplate('crm-email-scripts')}
                disabled={isGenerating || !formData.productType}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Writing Email Scripts...
                  </>
                ) : (
                  'Generate Email Scripts'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Plan */}
        <TabsContent value="marketing-plan">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                AI Marketing Plan Creator
              </CardTitle>
              <CardDescription>
                Comprehensive 12-month marketing strategy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthlyBudget">Monthly Budget</Label>
                  <Input
                    id="monthlyBudget"
                    value={formData.monthlyBudget}
                    onChange={(e) => handleInputChange('monthlyBudget', e.target.value)}
                    placeholder="e.g., $5,000"
                  />
                </div>
                <div>
                  <Label htmlFor="channels">Marketing Channels</Label>
                  <Input
                    id="channels"
                    value={formData.channels}
                    onChange={(e) => handleInputChange('channels', e.target.value)}
                    placeholder="e.g., Social Media, Email, Paid Ads"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="audienceGoals">Audience Goals</Label>
                <Textarea
                  id="audienceGoals"
                  value={formData.audienceGoals}
                  onChange={(e) => handleInputChange('audienceGoals', e.target.value)}
                  placeholder="Target audience and acquisition goals"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="businessGoals">Business Goals</Label>
                <Textarea
                  id="businessGoals"
                  value={formData.businessGoals}
                  onChange={(e) => handleInputChange('businessGoals', e.target.value)}
                  placeholder="Revenue, growth, and business objectives"
                  rows={2}
                />
              </div>
              
              <Button 
                onClick={() => generateTemplate('marketing-plan')}
                disabled={isGenerating || !formData.monthlyBudget}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Marketing Plan...
                  </>
                ) : (
                  'Generate Marketing Plan'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Launch Timeline */}
        <TabsContent value="launch-timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Launch Plan Timeline
              </CardTitle>
              <CardDescription>
                Gantt-style launch roadmap with milestones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="launchDate">Target Launch Date</Label>
                  <Input
                    id="launchDate"
                    type="date"
                    value={formData.launchDate}
                    onChange={(e) => handleInputChange('launchDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="teamSize">Team Size</Label>
                  <Input
                    id="teamSize"
                    value={formData.teamSize}
                    onChange={(e) => handleInputChange('teamSize', e.target.value)}
                    placeholder="e.g., 5 people"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="steps">Launch Steps</Label>
                <Textarea
                  id="steps"
                  value={formData.steps}
                  onChange={(e) => handleInputChange('steps', e.target.value)}
                  placeholder="Key launch activities and milestones"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="dependencies">Dependencies</Label>
                <Textarea
                  id="dependencies"
                  value={formData.dependencies}
                  onChange={(e) => handleInputChange('dependencies', e.target.value)}
                  placeholder="External dependencies, approvals, or blockers"
                  rows={2}
                />
              </div>
              
              <Button 
                onClick={() => generateTemplate('launch-timeline')}
                disabled={isGenerating || !formData.launchDate}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building Timeline...
                  </>
                ) : (
                  'Generate Launch Timeline'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generated Content Display */}
      {generatedContent && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Generated Content
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadContent(
                    generatedContent.content || generatedContent.preview || JSON.stringify(generatedContent, null, 2),
                    `${activeTab}-${Date.now()}`,
                    'text'
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download TXT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadContent(
                    generatedContent.content || generatedContent.preview || JSON.stringify(generatedContent, null, 2),
                    `${activeTab}-${Date.now()}`,
                    'pdf'
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Print PDF
                </Button>
                {(generatedContent.csvContent || generatedContent.excelData) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadContent(
                      generatedContent.csvContent || generatedContent.excelData,
                      `${activeTab}-${Date.now()}`,
                      'csv'
                    )}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">
                {generatedContent.content || generatedContent.preview || JSON.stringify(generatedContent, null, 2)}
              </pre>
            </div>
            {generatedContent.message && (
              <p className="text-sm text-muted-foreground mt-2">{generatedContent.message}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}