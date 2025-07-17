import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { Calendar, CheckCircle, PieChart, Mail, FileText, Shield, Zap, Phone, Download, Copy, Settings, Users, Target, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";

export default function ProAutomationTemplates() {
  const { toast } = useToast();

  // 1. Social Media Launch Calendar State
  const [socialCalendar, setSocialCalendar] = useState({
    industry: "",
    launchDate: "",
    productType: "",
    businessName: ""
  });
  const [generatedSocialCalendar, setGeneratedSocialCalendar] = useState<any>(null);
  const [socialLoading, setSocialLoading] = useState(false);

  // 2. Startup Checklist Builder State
  const [checklistBuilder, setChecklistBuilder] = useState({
    businessState: "",
    entityType: "",
    launchDate: "",
    businessName: ""
  });
  const [generatedChecklist, setGeneratedChecklist] = useState<any>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // 3. Founder's Equity Split Calculator State
  const [equityCalculator, setEquityCalculator] = useState({
    numberOfFounders: 2,
    founders: [
      { name: "", skills: 0, capital: 0, time: 0, ip: 0 },
      { name: "", skills: 0, capital: 0, time: 0, ip: 0 }
    ]
  });
  const [equityResults, setEquityResults] = useState<any>(null);

  // 4. Email Welcome Series State
  const [emailSeries, setEmailSeries] = useState({
    companyName: "",
    productService: "",
    tone: "",
    industryType: ""
  });
  const [generatedEmailSeries, setGeneratedEmailSeries] = useState<any>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // 5. Pitch Deck Outline State
  const [pitchDeck, setPitchDeck] = useState({
    businessName: "",
    industry: "",
    fundingGoal: "",
    businessDescription: ""
  });
  const [generatedPitchDeck, setGeneratedPitchDeck] = useState<any>(null);
  const [pitchLoading, setPitchLoading] = useState(false);

  // 6. Business Policy Generator State
  const [policyGenerator, setPolicyGenerator] = useState({
    businessType: "",
    businessModel: "",
    location: "",
    businessName: ""
  });
  const [generatedPolicies, setGeneratedPolicies] = useState<any>(null);
  const [policyLoading, setPolicyLoading] = useState(false);

  // 7. Email Campaign State
  const [emailCampaign, setEmailCampaign] = useState({
    targetAudience: "",
    productService: "",
    tone: "",
    platform: "",
    campaignGoal: ""
  });
  const [generatedCampaign, setGeneratedCampaign] = useState<any>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);

  // 8. Sales Outreach Script State
  const [salesScript, setSalesScript] = useState({
    industry: "",
    product: "",
    targetAudience: "",
    painPoints: "",
    tone: ""
  });
  const [generatedScripts, setGeneratedScripts] = useState<any>(null);
  const [scriptLoading, setScriptLoading] = useState(false);

  // Social Media Launch Calendar Generator
  const generateSocialCalendar = async () => {
    if (!socialCalendar.industry || !socialCalendar.launchDate || !socialCalendar.productType) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setSocialLoading(true);
    try {
      const response = await apiRequest('POST', '/api/generate/social-calendar', socialCalendar);
      const data = await response.json();
      setGeneratedSocialCalendar(data);
      toast({ title: "Calendar Generated!", description: "Your 30-day social media calendar is ready." });
    } catch (error) {
      toast({ title: "Generation Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSocialLoading(false);
    }
  };

  // Startup Checklist Builder
  const generateChecklist = async () => {
    if (!checklistBuilder.businessState || !checklistBuilder.entityType || !checklistBuilder.launchDate) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setChecklistLoading(true);
    try {
      const response = await apiRequest('POST', '/api/generate/startup-checklist', checklistBuilder);
      const data = await response.json();
      setGeneratedChecklist(data);
      toast({ title: "Checklist Generated!", description: "Your customized startup checklist is ready." });
    } catch (error) {
      toast({ title: "Generation Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setChecklistLoading(false);
    }
  };

  // Founder's Equity Calculator
  const calculateEquity = () => {
    const validFounders = equityCalculator.founders.filter(f => f.name.trim() !== "");
    if (validFounders.length < 2) {
      toast({ title: "Minimum Founders Required", description: "Please add at least 2 founders with names.", variant: "destructive" });
      return;
    }

    const totalScores = validFounders.map(founder => {
      const skillsWeight = 0.3;
      const capitalWeight = 0.3;
      const timeWeight = 0.25;
      const ipWeight = 0.15;
      
      return {
        name: founder.name,
        totalScore: (founder.skills * skillsWeight) + (founder.capital * capitalWeight) + 
                   (founder.time * timeWeight) + (founder.ip * ipWeight),
        breakdown: {
          skills: founder.skills,
          capital: founder.capital,
          time: founder.time,
          ip: founder.ip
        }
      };
    });

    const grandTotal = totalScores.reduce((sum, founder) => sum + founder.totalScore, 0);
    
    const equityDistribution = totalScores.map(founder => ({
      ...founder,
      equityPercentage: ((founder.totalScore / grandTotal) * 100).toFixed(1)
    }));

    setEquityResults({
      distribution: equityDistribution,
      reasoning: "Equity calculation based on weighted contributions: Skills (30%), Capital (30%), Time Commitment (25%), and Intellectual Property (15%)"
    });

    toast({ title: "Equity Calculated!", description: "Fair equity distribution has been calculated." });
  };

  // Email Welcome Series Generator
  const generateEmailSeries = async () => {
    if (!emailSeries.companyName || !emailSeries.productService || !emailSeries.tone) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setEmailLoading(true);
    try {
      const response = await apiRequest('POST', '/api/generate/email-series', emailSeries);
      const data = await response.json();
      setGeneratedEmailSeries(data);
      toast({ title: "Email Series Generated!", description: "Your welcome email sequence is ready." });
    } catch (error) {
      toast({ title: "Generation Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  // Pitch Deck Outline Generator
  const generatePitchDeck = async () => {
    if (!pitchDeck.businessName || !pitchDeck.industry || !pitchDeck.fundingGoal) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setPitchLoading(true);
    try {
      const response = await apiRequest('POST', '/api/generate/pitch-deck', pitchDeck);
      const data = await response.json();
      setGeneratedPitchDeck(data);
      toast({ title: "Pitch Deck Generated!", description: "Your investor presentation outline is ready." });
    } catch (error) {
      toast({ title: "Generation Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setPitchLoading(false);
    }
  };

  // Business Policy Generator
  const generatePolicies = async () => {
    if (!policyGenerator.businessType || !policyGenerator.businessModel || !policyGenerator.location) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setPolicyLoading(true);
    try {
      const response = await apiRequest('POST', '/api/generate/business-policies', policyGenerator);
      const data = await response.json();
      setGeneratedPolicies(data);
      toast({ title: "Policies Generated!", description: "Your business policy templates are ready." });
    } catch (error) {
      toast({ title: "Generation Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setPolicyLoading(false);
    }
  };

  // Email Campaign Generator
  const generateEmailCampaign = async () => {
    if (!emailCampaign.targetAudience || !emailCampaign.productService || !emailCampaign.tone) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setCampaignLoading(true);
    try {
      const response = await apiRequest('POST', '/api/generate/email-campaign', emailCampaign);
      const data = await response.json();
      setGeneratedCampaign(data);
      toast({ title: "Campaign Generated!", description: "Your email campaign and automation guide are ready." });
    } catch (error) {
      toast({ title: "Generation Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setCampaignLoading(false);
    }
  };

  // Sales Outreach Script Generator
  const generateSalesScripts = async () => {
    if (!salesScript.industry || !salesScript.product || !salesScript.targetAudience) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setScriptLoading(true);
    try {
      const response = await apiRequest('POST', '/api/generate/sales-scripts', salesScript);
      const data = await response.json();
      setGeneratedScripts(data);
      toast({ title: "Scripts Generated!", description: "Your sales outreach scripts are ready." });
    } catch (error) {
      toast({ title: "Generation Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setScriptLoading(false);
    }
  };

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${title} Copied!`, description: "Content copied to clipboard." });
  };

  const downloadAsFile = (content: string, filename: string, type: string = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateFounder = (index: number, field: string, value: any) => {
    const newFounders = [...equityCalculator.founders];
    newFounders[index] = { ...newFounders[index], [field]: value };
    setEquityCalculator({ ...equityCalculator, founders: newFounders });
  };

  const addFounder = () => {
    if (equityCalculator.founders.length < 5) {
      setEquityCalculator({
        ...equityCalculator,
        founders: [...equityCalculator.founders, { name: "", skills: 0, capital: 0, time: 0, ip: 0 }]
      });
    }
  };

  const removeFounder = (index: number) => {
    if (equityCalculator.founders.length > 2) {
      const newFounders = equityCalculator.founders.filter((_, i) => i !== index);
      setEquityCalculator({ ...equityCalculator, founders: newFounders });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <Settings className="h-8 w-8 text-blue-500" />
          Pro Automation Templates
        </h1>
        <p className="text-slate-600 dark:text-slate-400">Professional tools to accelerate your business growth</p>
        <Badge variant="outline" className="mt-2 text-blue-600 border-blue-200">
          8 Professional Templates + Customization
        </Badge>
      </div>

      <Tabs defaultValue="social-calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="social-calendar" className="text-xs">
            <Calendar className="h-4 w-4 mr-1" />
            Social
          </TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs">
            <CheckCircle className="h-4 w-4 mr-1" />
            Checklist
          </TabsTrigger>
          <TabsTrigger value="equity" className="text-xs">
            <PieChart className="h-4 w-4 mr-1" />
            Equity
          </TabsTrigger>
          <TabsTrigger value="email-series" className="text-xs">
            <Mail className="h-4 w-4 mr-1" />
            Welcome
          </TabsTrigger>
          <TabsTrigger value="pitch-deck" className="text-xs">
            <FileText className="h-4 w-4 mr-1" />
            Pitch
          </TabsTrigger>
          <TabsTrigger value="policies" className="text-xs">
            <Shield className="h-4 w-4 mr-1" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="email-campaign" className="text-xs">
            <Zap className="h-4 w-4 mr-1" />
            Campaign
          </TabsTrigger>
          <TabsTrigger value="sales-scripts" className="text-xs">
            <Phone className="h-4 w-4 mr-1" />
            Scripts
          </TabsTrigger>
        </TabsList>

        {/* 1. Social Media Launch Calendar */}
        <TabsContent value="social-calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Social Media Launch Calendar
              </CardTitle>
              <CardDescription>
                Generate a comprehensive 30-day content calendar for your business launch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={socialCalendar.businessName}
                    onChange={(e) => setSocialCalendar({ ...socialCalendar, businessName: e.target.value })}
                    placeholder="Your business name"
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select onValueChange={(value) => setSocialCalendar({ ...socialCalendar, industry: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="food-beverage">Food & Beverage</SelectItem>
                      <SelectItem value="fitness">Fitness & Wellness</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="real-estate">Real Estate</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="launchDate">Launch Date</Label>
                  <Input
                    id="launchDate"
                    type="date"
                    value={socialCalendar.launchDate}
                    onChange={(e) => setSocialCalendar({ ...socialCalendar, launchDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="productType">Product/Service Type</Label>
                  <Input
                    id="productType"
                    value={socialCalendar.productType}
                    onChange={(e) => setSocialCalendar({ ...socialCalendar, productType: e.target.value })}
                    placeholder="e.g., SaaS platform, fitness coaching, etc."
                  />
                </div>
              </div>
              
              <Button 
                onClick={generateSocialCalendar} 
                className="w-full" 
                disabled={socialLoading}
              >
                {socialLoading ? "Generating Calendar..." : "Generate 30-Day Calendar"}
              </Button>

              {generatedSocialCalendar && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Your Social Media Calendar</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(JSON.stringify(generatedSocialCalendar, null, 2), "Calendar")}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadAsFile(generatedSocialCalendar.csvContent, `${socialCalendar.businessName}-social-calendar.csv`, 'text/csv')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download CSV
                      </Button>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">{generatedSocialCalendar.preview}</pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Startup Checklist Builder */}
        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Startup Checklist Builder
              </CardTitle>
              <CardDescription>
                Create a customized startup checklist based on your state, entity type, and timeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={checklistBuilder.businessName}
                    onChange={(e) => setChecklistBuilder({ ...checklistBuilder, businessName: e.target.value })}
                    placeholder="Your business name"
                  />
                </div>
                <div>
                  <Label htmlFor="businessState">Business State</Label>
                  <Select onValueChange={(value) => setChecklistBuilder({ ...checklistBuilder, businessState: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="california">California</SelectItem>
                      <SelectItem value="texas">Texas</SelectItem>
                      <SelectItem value="florida">Florida</SelectItem>
                      <SelectItem value="new-york">New York</SelectItem>
                      <SelectItem value="illinois">Illinois</SelectItem>
                      <SelectItem value="delaware">Delaware</SelectItem>
                      <SelectItem value="nevada">Nevada</SelectItem>
                      <SelectItem value="other">Other State</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="entityType">Entity Type</Label>
                  <Select onValueChange={(value) => setChecklistBuilder({ ...checklistBuilder, entityType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llc">LLC</SelectItem>
                      <SelectItem value="corporation">Corporation</SelectItem>
                      <SelectItem value="s-corp">S-Corporation</SelectItem>
                      <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="launchDate">Planned Launch Date</Label>
                  <Input
                    id="launchDate"
                    type="date"
                    value={checklistBuilder.launchDate}
                    onChange={(e) => setChecklistBuilder({ ...checklistBuilder, launchDate: e.target.value })}
                  />
                </div>
              </div>
              
              <Button 
                onClick={generateChecklist} 
                className="w-full" 
                disabled={checklistLoading}
              >
                {checklistLoading ? "Generating Checklist..." : "Generate Custom Checklist"}
              </Button>

              {generatedChecklist && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Your Startup Checklist</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedChecklist.textContent, "Checklist")}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadAsFile(generatedChecklist.textContent, `${checklistBuilder.businessName}-startup-checklist.txt`)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {generatedChecklist.tasks.map((task: any, index: number) => (
                        <div key={index} className="flex items-start gap-2 p-2 border rounded">
                          <CheckCircle className="h-4 w-4 mt-1 text-green-500" />
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">{task.description}</div>
                            <div className="text-xs text-blue-600">Due: {task.dueDate}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Founder's Equity Split Calculator */}
        <TabsContent value="equity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Founder's Equity Split Calculator
              </CardTitle>
              <CardDescription>
                Calculate fair equity distribution based on founder contributions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {equityCalculator.founders.map((founder, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Founder {index + 1}</CardTitle>
                        {equityCalculator.founders.length > 2 && (
                          <Button size="sm" variant="destructive" onClick={() => removeFounder(index)}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor={`founder-name-${index}`}>Name</Label>
                        <Input
                          id={`founder-name-${index}`}
                          value={founder.name}
                          onChange={(e) => updateFounder(index, 'name', e.target.value)}
                          placeholder="Founder name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`skills-${index}`}>Skills Contribution (0-10)</Label>
                          <Input
                            id={`skills-${index}`}
                            type="number"
                            min="0"
                            max="10"
                            value={founder.skills}
                            onChange={(e) => updateFounder(index, 'skills', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`capital-${index}`}>Capital Contribution (0-10)</Label>
                          <Input
                            id={`capital-${index}`}
                            type="number"
                            min="0"
                            max="10"
                            value={founder.capital}
                            onChange={(e) => updateFounder(index, 'capital', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`time-${index}`}>Time Commitment (0-10)</Label>
                          <Input
                            id={`time-${index}`}
                            type="number"
                            min="0"
                            max="10"
                            value={founder.time}
                            onChange={(e) => updateFounder(index, 'time', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`ip-${index}`}>IP Contribution (0-10)</Label>
                          <Input
                            id={`ip-${index}`}
                            type="number"
                            min="0"
                            max="10"
                            value={founder.ip}
                            onChange={(e) => updateFounder(index, 'ip', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={calculateEquity} className="flex-1">
                  Calculate Equity Split
                </Button>
                {equityCalculator.founders.length < 5 && (
                  <Button variant="outline" onClick={addFounder}>
                    <Users className="h-4 w-4 mr-1" />
                    Add Founder
                  </Button>
                )}
              </div>

              {equityResults && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Equity Distribution Results</h3>
                  <div className="space-y-2">
                    {equityResults.distribution.map((founder: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div>
                          <div className="font-medium">{founder.name}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Skills: {founder.breakdown.skills}/10 | Capital: {founder.breakdown.capital}/10 | 
                            Time: {founder.breakdown.time}/10 | IP: {founder.breakdown.ip}/10
                          </div>
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                          {founder.equityPercentage}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">{equityResults.reasoning}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Email Welcome Series Generator */}
        <TabsContent value="email-series">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Welcome Series Generator
              </CardTitle>
              <CardDescription>
                Create a 3-5 email welcome sequence for new customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={emailSeries.companyName}
                    onChange={(e) => setEmailSeries({ ...emailSeries, companyName: e.target.value })}
                    placeholder="Your company name"
                  />
                </div>
                <div>
                  <Label htmlFor="productService">Product/Service</Label>
                  <Input
                    id="productService"
                    value={emailSeries.productService}
                    onChange={(e) => setEmailSeries({ ...emailSeries, productService: e.target.value })}
                    placeholder="What you offer"
                  />
                </div>
                <div>
                  <Label htmlFor="tone">Email Tone</Label>
                  <Select onValueChange={(value) => setEmailSeries({ ...emailSeries, tone: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="industryType">Industry Type</Label>
                  <Input
                    id="industryType"
                    value={emailSeries.industryType}
                    onChange={(e) => setEmailSeries({ ...emailSeries, industryType: e.target.value })}
                    placeholder="e.g., SaaS, E-commerce, Consulting"
                  />
                </div>
              </div>
              
              <Button 
                onClick={generateEmailSeries} 
                className="w-full" 
                disabled={emailLoading}
              >
                {emailLoading ? "Generating Email Series..." : "Generate Welcome Series"}
              </Button>

              {generatedEmailSeries && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Your Email Welcome Series</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedEmailSeries.fullContent, "Email Series")}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy All
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadAsFile(generatedEmailSeries.fullContent, `${emailSeries.companyName}-welcome-series.txt`)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {generatedEmailSeries.emails.map((email: any, index: number) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Email {index + 1}: {email.subject}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                            <pre className="text-sm whitespace-pre-wrap">{email.body}</pre>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => copyToClipboard(`Subject: ${email.subject}\n\n${email.body}`, `Email ${index + 1}`)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy This Email
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Pitch Deck Outline Generator */}
        <TabsContent value="pitch-deck">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pitch Deck Outline Writer
              </CardTitle>
              <CardDescription>
                Generate a slide-by-slide structure for investor presentations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={pitchDeck.businessName}
                    onChange={(e) => setPitchDeck({ ...pitchDeck, businessName: e.target.value })}
                    placeholder="Your business name"
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={pitchDeck.industry}
                    onChange={(e) => setPitchDeck({ ...pitchDeck, industry: e.target.value })}
                    placeholder="e.g., FinTech, HealthTech, SaaS"
                  />
                </div>
                <div>
                  <Label htmlFor="fundingGoal">Funding Goal</Label>
                  <Input
                    id="fundingGoal"
                    value={pitchDeck.fundingGoal}
                    onChange={(e) => setPitchDeck({ ...pitchDeck, fundingGoal: e.target.value })}
                    placeholder="e.g., $500K, $2M Series A"
                  />
                </div>
                <div>
                  <Label htmlFor="businessDescription">Brief Business Description</Label>
                  <Input
                    id="businessDescription"
                    value={pitchDeck.businessDescription}
                    onChange={(e) => setPitchDeck({ ...pitchDeck, businessDescription: e.target.value })}
                    placeholder="What your business does in one sentence"
                  />
                </div>
              </div>
              
              <Button 
                onClick={generatePitchDeck} 
                className="w-full" 
                disabled={pitchLoading}
              >
                {pitchLoading ? "Generating Pitch Deck..." : "Generate Pitch Deck Outline"}
              </Button>

              {generatedPitchDeck && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Your Pitch Deck Outline</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedPitchDeck.fullContent, "Pitch Deck")}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadAsFile(generatedPitchDeck.fullContent, `${pitchDeck.businessName}-pitch-deck-outline.txt`)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {generatedPitchDeck.slides.map((slide: any, index: number) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Slide {index + 1}: {slide.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">{slide.content}</div>
                          {slide.speakerNotes && (
                            <div className="text-xs text-slate-500 italic">Speaker Notes: {slide.speakerNotes}</div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Business Policy Generator */}
        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Business Policy Generator
              </CardTitle>
              <CardDescription>
                Generate HR, privacy, and return policies tailored to your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={policyGenerator.businessName}
                    onChange={(e) => setPolicyGenerator({ ...policyGenerator, businessName: e.target.value })}
                    placeholder="Your business name"
                  />
                </div>
                <div>
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select onValueChange={(value) => setPolicyGenerator({ ...policyGenerator, businessType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="service">Service Business</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="businessModel">Business Model</Label>
                  <Select onValueChange={(value) => setPolicyGenerator({ ...policyGenerator, businessModel: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="b2b">B2B</SelectItem>
                      <SelectItem value="b2c">B2C</SelectItem>
                      <SelectItem value="marketplace">Marketplace</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="physical-goods">Physical Goods</SelectItem>
                      <SelectItem value="digital-services">Digital Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">Business Location</Label>
                  <Input
                    id="location"
                    value={policyGenerator.location}
                    onChange={(e) => setPolicyGenerator({ ...policyGenerator, location: e.target.value })}
                    placeholder="State or Country"
                  />
                </div>
              </div>
              
              <Button 
                onClick={generatePolicies} 
                className="w-full" 
                disabled={policyLoading}
              >
                {policyLoading ? "Generating Policies..." : "Generate Business Policies"}
              </Button>

              {generatedPolicies && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Your Business Policies</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedPolicies.fullContent, "Policies")}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy All
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadAsFile(generatedPolicies.fullContent, `${policyGenerator.businessName}-policies.txt`)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {generatedPolicies.policies.map((policy: any, index: number) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{policy.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                            <pre className="text-sm whitespace-pre-wrap">{policy.content}</pre>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => copyToClipboard(policy.content, policy.title)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy This Policy
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Automated Email Campaign Generator */}
        <TabsContent value="email-campaign">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automated Email Campaign + Zapier
              </CardTitle>
              <CardDescription>
                Generate cold outreach campaigns with automation setup instructions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    value={emailCampaign.targetAudience}
                    onChange={(e) => setEmailCampaign({ ...emailCampaign, targetAudience: e.target.value })}
                    placeholder="e.g., Small business owners, SaaS founders"
                  />
                </div>
                <div>
                  <Label htmlFor="productService">Product/Service</Label>
                  <Input
                    id="productService"
                    value={emailCampaign.productService}
                    onChange={(e) => setEmailCampaign({ ...emailCampaign, productService: e.target.value })}
                    placeholder="What you're offering"
                  />
                </div>
                <div>
                  <Label htmlFor="tone">Campaign Tone</Label>
                  <Select onValueChange={(value) => setEmailCampaign({ ...emailCampaign, tone: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="value-add">Value-Add</SelectItem>
                      <SelectItem value="consultative">Consultative</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="platform">Email Platform</Label>
                  <Select onValueChange={(value) => setEmailCampaign({ ...emailCampaign, platform: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="outlook">Outlook</SelectItem>
                      <SelectItem value="mailchimp">Mailchimp</SelectItem>
                      <SelectItem value="convertkit">ConvertKit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="campaignGoal">Campaign Goal</Label>
                  <Input
                    id="campaignGoal"
                    value={emailCampaign.campaignGoal}
                    onChange={(e) => setEmailCampaign({ ...emailCampaign, campaignGoal: e.target.value })}
                    placeholder="e.g., Book demo calls, Generate leads, Drive sales"
                  />
                </div>
              </div>
              
              <Button 
                onClick={generateEmailCampaign} 
                className="w-full" 
                disabled={campaignLoading}
              >
                {campaignLoading ? "Generating Campaign..." : "Generate Email Campaign + Automation"}
              </Button>

              {generatedCampaign && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Your Email Campaign</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedCampaign.fullContent, "Campaign")}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy All
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadAsFile(generatedCampaign.fullContent, `email-campaign-${emailCampaign.targetAudience}.txt`)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Megaphone className="h-4 w-4" />
                          Email Sequence
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {generatedCampaign.emails.map((email: any, index: number) => (
                            <div key={index} className="border rounded-lg p-3">
                              <div className="font-medium mb-1">Email {index + 1}: {email.subject}</div>
                              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">{email.type}</div>
                              <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded text-sm">
                                {email.preview}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Automation Setup Instructions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                          <pre className="text-sm whitespace-pre-wrap">{generatedCampaign.automationInstructions}</pre>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. Sales Outreach Script Generator */}
        <TabsContent value="sales-scripts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Sales Outreach Script Generator
              </CardTitle>
              <CardDescription>
                Create elevator pitch, discovery call opener, and cold outreach scripts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={salesScript.industry}
                    onChange={(e) => setSalesScript({ ...salesScript, industry: e.target.value })}
                    placeholder="e.g., FinTech, Healthcare, E-commerce"
                  />
                </div>
                <div>
                  <Label htmlFor="product">Product/Service</Label>
                  <Input
                    id="product"
                    value={salesScript.product}
                    onChange={(e) => setSalesScript({ ...salesScript, product: e.target.value })}
                    placeholder="What you're selling"
                  />
                </div>
                <div>
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    value={salesScript.targetAudience}
                    onChange={(e) => setSalesScript({ ...salesScript, targetAudience: e.target.value })}
                    placeholder="Who you're selling to"
                  />
                </div>
                <div>
                  <Label htmlFor="painPoints">Key Pain Points</Label>
                  <Input
                    id="painPoints"
                    value={salesScript.painPoints}
                    onChange={(e) => setSalesScript({ ...salesScript, painPoints: e.target.value })}
                    placeholder="Problems your product solves"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="tone">Script Tone</Label>
                  <Select onValueChange={(value) => setSalesScript({ ...salesScript, tone: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="consultative">Consultative</SelectItem>
                      <SelectItem value="high-pressure">High-Pressure</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={generateSalesScripts} 
                className="w-full" 
                disabled={scriptLoading}
              >
                {scriptLoading ? "Generating Scripts..." : "Generate Sales Scripts"}
              </Button>

              {generatedScripts && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Your Sales Scripts</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedScripts.fullContent, "Sales Scripts")}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy All
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadAsFile(generatedScripts.fullContent, `${salesScript.product}-sales-scripts.txt`)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {generatedScripts.scripts.map((script: any, index: number) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            {script.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                            <pre className="text-sm whitespace-pre-wrap">{script.content}</pre>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(script.content, script.title)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy Script
                            </Button>
                            {script.crmFormat && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(script.crmFormat, `${script.title} (CRM Format)`)}
                              >
                                CRM Format
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}