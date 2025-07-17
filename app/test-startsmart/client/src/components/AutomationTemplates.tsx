import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Download, Copy, Mail, FileText, Calendar, Users, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OnboardingTask {
  id: string;
  task: string;
  description: string;
  completed: boolean;
  notes: string;
}

const defaultOnboardingTasks: OnboardingTask[] = [
  { id: "1", task: "Apply for EIN (Employer Identification Number)", description: "Get your federal tax ID from the IRS", completed: false, notes: "" },
  { id: "2", task: "Open Business Bank Account", description: "Separate business and personal finances", completed: false, notes: "" },
  { id: "3", task: "Register Business Name", description: "File DBA or register with state", completed: false, notes: "" },
  { id: "4", task: "Obtain Business Licenses", description: "Research and apply for required licenses", completed: false, notes: "" },
  { id: "5", task: "Set Up Accounting System", description: "Choose and configure accounting software", completed: false, notes: "" },
  { id: "6", task: "Create Business Logo & Branding", description: "Design logo and brand guidelines", completed: false, notes: "" },
  { id: "7", task: "Build Website or Landing Page", description: "Establish online presence", completed: false, notes: "" },
  { id: "8", task: "Set Up Business Insurance", description: "Protect your business with appropriate coverage", completed: false, notes: "" },
  { id: "9", task: "Create Social Media Profiles", description: "Establish presence on key platforms", completed: false, notes: "" },
  { id: "10", task: "Develop Legal Templates", description: "Contracts, privacy policy, terms of service", completed: false, notes: "" },
  { id: "11", task: "Set Up Business Phone Number", description: "Professional communication line", completed: false, notes: "" },
  { id: "12", task: "Create Business Email Address", description: "Professional email with domain", completed: false, notes: "" },
  { id: "13", task: "Register for Business Address", description: "Physical or virtual business address", completed: false, notes: "" },
  { id: "14", task: "Set Up Payroll System", description: "If hiring employees", completed: false, notes: "" },
  { id: "15", task: "Create Business Plan", description: "Document strategy and projections", completed: false, notes: "" }
];

export default function AutomationTemplates() {
  const { toast } = useToast();
  
  // Onboarding Checklist State
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingTask[]>(() => {
    const saved = localStorage.getItem('startup-onboarding-tasks');
    return saved ? JSON.parse(saved) : defaultOnboardingTasks;
  });

  // Client Intake Form State
  const [intakeForm, setIntakeForm] = useState({
    businessType: "",
    services: "",
    contactFields: ""
  });

  // Email Signature State
  const [emailSignature, setEmailSignature] = useState({
    name: "",
    title: "",
    company: "",
    website: "",
    email: "",
    phone: "",
    logoUrl: ""
  });

  // Business Pitch State
  const [businessPitch, setBusinessPitch] = useState({
    businessName: "",
    problem: "",
    solution: "",
    targetMarket: "",
    uniqueValue: "",
    revenue: "",
    funding: ""
  });

  // Social Media Calendar State
  const [socialCalendar, setSocialCalendar] = useState({
    businessName: "",
    industry: "",
    tone: "",
    goals: [] as string[]
  });

  const [generatedCalendar, setGeneratedCalendar] = useState<any[]>([]);

  // Onboarding Functions
  const updateTask = (id: string, field: 'completed' | 'notes', value: boolean | string) => {
    const updatedTasks = onboardingTasks.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    );
    setOnboardingTasks(updatedTasks);
    localStorage.setItem('startup-onboarding-tasks', JSON.stringify(updatedTasks));
  };

  const resetOnboarding = () => {
    setOnboardingTasks(defaultOnboardingTasks);
    localStorage.removeItem('startup-onboarding-tasks');
    toast({ title: "Checklist Reset", description: "All tasks have been reset to pending." });
  };

  // Client Intake Form Functions
  const generateIntakeForm = () => {
    const formUrl = `https://docs.google.com/forms/d/e/1FAIpQLSdABC123/viewform?usp=pp_url&entry.1=${encodeURIComponent(intakeForm.businessType)}&entry.2=${encodeURIComponent(intakeForm.services)}`;
    
    const htmlForm = `
<!DOCTYPE html>
<html>
<head>
    <title>${intakeForm.businessType} Client Intake Form</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        .submit-btn { background: #007cba; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <h2>${intakeForm.businessType} Client Intake Form</h2>
    <form>
        <div class="form-group">
            <label>Full Name:</label>
            <input type="text" name="name" required>
        </div>
        <div class="form-group">
            <label>Email:</label>
            <input type="email" name="email" required>
        </div>
        <div class="form-group">
            <label>Phone:</label>
            <input type="tel" name="phone">
        </div>
        <div class="form-group">
            <label>Service Needed:</label>
            <select name="service">
                ${intakeForm.services.split(',').map(service => `<option value="${service.trim()}">${service.trim()}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Project Details:</label>
            <textarea name="details" rows="4"></textarea>
        </div>
        <div class="form-group">
            <label>Budget Range:</label>
            <select name="budget">
                <option>Under $1,000</option>
                <option>$1,000 - $5,000</option>
                <option>$5,000 - $10,000</option>
                <option>$10,000+</option>
            </select>
        </div>
        <button type="submit" class="submit-btn">Submit Inquiry</button>
    </form>
</body>
</html>`;

    // Copy HTML to clipboard
    navigator.clipboard.writeText(htmlForm);
    toast({ title: "Form Generated!", description: "HTML form copied to clipboard. Paste into your website." });
  };

  // Email Signature Functions
  const generateEmailSignature = () => {
    const signature = `
<table style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
  <tr>
    <td style="padding-right: 20px;">
      ${emailSignature.logoUrl ? `<img src="${emailSignature.logoUrl}" alt="Logo" style="max-width: 80px; max-height: 80px;">` : ''}
    </td>
    <td style="border-left: 2px solid #007cba; padding-left: 20px;">
      <div style="font-weight: bold; font-size: 16px; color: #007cba;">${emailSignature.name}</div>
      <div style="color: #666; margin: 2px 0;">${emailSignature.title}</div>
      <div style="font-weight: bold; margin: 5px 0;">${emailSignature.company}</div>
      <div style="margin: 5px 0;">
        ${emailSignature.email ? `<a href="mailto:${emailSignature.email}" style="color: #007cba; text-decoration: none;">${emailSignature.email}</a>` : ''}
        ${emailSignature.phone ? ` | <a href="tel:${emailSignature.phone}" style="color: #007cba; text-decoration: none;">${emailSignature.phone}</a>` : ''}
      </div>
      ${emailSignature.website ? `<div><a href="${emailSignature.website}" style="color: #007cba; text-decoration: none;">${emailSignature.website}</a></div>` : ''}
    </td>
  </tr>
</table>`;

    navigator.clipboard.writeText(signature);
    toast({ title: "Signature Generated!", description: "HTML signature copied to clipboard." });
  };

  // Business Pitch Functions
  const generateBusinessPitch = () => {
    const pitch = `
# ${businessPitch.businessName} - Business Pitch

## The Problem
${businessPitch.problem}

## Our Solution
${businessPitch.solution}

## Target Market
${businessPitch.targetMarket}

## Unique Value Proposition
${businessPitch.uniqueValue}

## Revenue Model
${businessPitch.revenue}

## Funding Requirements
${businessPitch.funding}

---
*Generated by StartSmart AI - Business Formation Assistant*`;

    // Create downloadable file
    const blob = new Blob([pitch], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${businessPitch.businessName}-pitch.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Pitch Generated!", description: "Your business pitch has been downloaded." });
  };

  // Social Media Calendar Functions
  const generateSocialMediaCalendar = () => {
    const contentThemes = {
      Monday: "Motivation Monday - Inspirational content",
      Tuesday: "Tips Tuesday - Industry insights and advice",
      Wednesday: "Behind-the-scenes - Company culture",
      Thursday: "Throwback Thursday - Company milestones",
      Friday: "Feature Friday - Product/service highlights",
      Saturday: "Community Spotlight - Customer stories",
      Sunday: "Sunday Prep - Week ahead preview"
    };

    const calendar = [];
    const startDate = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      calendar.push({
        date: date.toLocaleDateString(),
        day: dayName,
        theme: contentThemes[dayName as keyof typeof contentThemes] || "General content",
        goal: socialCalendar.goals[0] || "Brand Awareness"
      });
    }

    setGeneratedCalendar(calendar);
    toast({ title: "Calendar Generated!", description: "Your 30-day social media calendar is ready." });
  };

  const downloadCalendarCSV = () => {
    const csvContent = [
      "Date,Day,Content Theme,Goal",
      ...generatedCalendar.map(item => `${item.date},${item.day},"${item.theme}",${item.goal}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${socialCalendar.businessName}-social-calendar.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completedTasks = onboardingTasks.filter(task => task.completed).length;
  const progress = (completedTasks / onboardingTasks.length) * 100;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Free Automation Templates</h1>
        <p className="text-slate-600 dark:text-slate-400">Essential tools to streamline your startup operations</p>
      </div>

      <Tabs defaultValue="onboarding" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="onboarding" className="text-xs">
            <CheckCircle className="h-4 w-4 mr-1" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="intake" className="text-xs">
            <Users className="h-4 w-4 mr-1" />
            Client Form
          </TabsTrigger>
          <TabsTrigger value="signature" className="text-xs">
            <Mail className="h-4 w-4 mr-1" />
            Email Sig
          </TabsTrigger>
          <TabsTrigger value="pitch" className="text-xs">
            <FileText className="h-4 w-4 mr-1" />
            Pitch
          </TabsTrigger>
          <TabsTrigger value="social" className="text-xs">
            <Calendar className="h-4 w-4 mr-1" />
            Social
          </TabsTrigger>
        </TabsList>

        {/* Startup Onboarding Checklist */}
        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Startup Onboarding Checklist
              </CardTitle>
              <CardDescription>
                Complete these essential steps to properly launch your business
              </CardDescription>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {completedTasks} of {onboardingTasks.length} tasks completed ({Math.round(progress)}%)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {onboardingTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) => updateTask(task.id, 'completed', checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h4 className={`font-medium ${task.completed ? 'line-through text-slate-500' : ''}`}>
                        {task.task}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`notes-${task.id}`} className="text-xs">Notes:</Label>
                    <Textarea
                      id={`notes-${task.id}`}
                      value={task.notes}
                      onChange={(e) => updateTask(task.id, 'notes', e.target.value)}
                      placeholder="Add your notes or progress updates..."
                      className="text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-4">
                <Button onClick={resetOnboarding} variant="outline" size="sm">
                  Reset Checklist
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Intake Form Generator */}
        <TabsContent value="intake">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Client Intake Form Generator
              </CardTitle>
              <CardDescription>
                Create a customizable client form for consultations and service requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessType">Business Type</Label>
                <Input
                  id="businessType"
                  value={intakeForm.businessType}
                  onChange={(e) => setIntakeForm({ ...intakeForm, businessType: e.target.value })}
                  placeholder="e.g., Consulting, Design Agency, Law Firm"
                />
              </div>
              <div>
                <Label htmlFor="services">Services Offered (comma-separated)</Label>
                <Textarea
                  id="services"
                  value={intakeForm.services}
                  onChange={(e) => setIntakeForm({ ...intakeForm, services: e.target.value })}
                  placeholder="e.g., Web Design, SEO, Marketing Strategy, Consulting"
                  rows={3}
                />
              </div>
              <Button onClick={generateIntakeForm} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Generate HTML Form
              </Button>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ProTip: The HTML form will be copied to your clipboard. Paste it into your website or send to your web developer.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Signature Generator */}
        <TabsContent value="signature">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Signature Generator
              </CardTitle>
              <CardDescription>
                Create a professional email signature for your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={emailSignature.name}
                    onChange={(e) => setEmailSignature({ ...emailSignature, name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={emailSignature.title}
                    onChange={(e) => setEmailSignature({ ...emailSignature, title: e.target.value })}
                    placeholder="CEO & Founder"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={emailSignature.company}
                  onChange={(e) => setEmailSignature({ ...emailSignature, company: e.target.value })}
                  placeholder="Your Company Inc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={emailSignature.email}
                    onChange={(e) => setEmailSignature({ ...emailSignature, email: e.target.value })}
                    placeholder="john@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={emailSignature.phone}
                    onChange={(e) => setEmailSignature({ ...emailSignature, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={emailSignature.website}
                  onChange={(e) => setEmailSignature({ ...emailSignature, website: e.target.value })}
                  placeholder="https://yourcompany.com"
                />
              </div>
              <div>
                <Label htmlFor="logoUrl">Logo URL (optional)</Label>
                <Input
                  id="logoUrl"
                  value={emailSignature.logoUrl}
                  onChange={(e) => setEmailSignature({ ...emailSignature, logoUrl: e.target.value })}
                  placeholder="https://yourcompany.com/logo.png"
                />
              </div>
              <Button onClick={generateEmailSignature} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy HTML Signature
              </Button>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ProTip: Paste the copied HTML into your email client's signature settings.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Pitch Outline */}
        <TabsContent value="pitch">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Business Pitch Outline Generator
              </CardTitle>
              <CardDescription>
                Create a simple one-page pitch outline for your startup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessPitch.businessName}
                  onChange={(e) => setBusinessPitch({ ...businessPitch, businessName: e.target.value })}
                  placeholder="Your Company Name"
                />
              </div>
              <div>
                <Label htmlFor="problem">What problem does your business solve?</Label>
                <Textarea
                  id="problem"
                  value={businessPitch.problem}
                  onChange={(e) => setBusinessPitch({ ...businessPitch, problem: e.target.value })}
                  placeholder="Describe the pain point your customers face..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="solution">What is your solution?</Label>
                <Textarea
                  id="solution"
                  value={businessPitch.solution}
                  onChange={(e) => setBusinessPitch({ ...businessPitch, solution: e.target.value })}
                  placeholder="How does your product/service solve the problem..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="targetMarket">Who is your target market?</Label>
                <Textarea
                  id="targetMarket"
                  value={businessPitch.targetMarket}
                  onChange={(e) => setBusinessPitch({ ...businessPitch, targetMarket: e.target.value })}
                  placeholder="Describe your ideal customers..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="uniqueValue">What makes you unique?</Label>
                <Textarea
                  id="uniqueValue"
                  value={businessPitch.uniqueValue}
                  onChange={(e) => setBusinessPitch({ ...businessPitch, uniqueValue: e.target.value })}
                  placeholder="Your competitive advantage..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="revenue">How will you make money?</Label>
                <Textarea
                  id="revenue"
                  value={businessPitch.revenue}
                  onChange={(e) => setBusinessPitch({ ...businessPitch, revenue: e.target.value })}
                  placeholder="Your revenue model..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="funding">Funding requirements (if any)</Label>
                <Textarea
                  id="funding"
                  value={businessPitch.funding}
                  onChange={(e) => setBusinessPitch({ ...businessPitch, funding: e.target.value })}
                  placeholder="How much funding do you need and what for..."
                  rows={2}
                />
              </div>
              <Button onClick={generateBusinessPitch} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Pitch Outline
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Launch Calendar */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Social Media Launch Calendar Generator
              </CardTitle>
              <CardDescription>
                Create a 30-day social media content calendar for your launch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="socialBusinessName">Business Name</Label>
                <Input
                  id="socialBusinessName"
                  value={socialCalendar.businessName}
                  onChange={(e) => setSocialCalendar({ ...socialCalendar, businessName: e.target.value })}
                  placeholder="Your Business Name"
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select onValueChange={(value) => setSocialCalendar({ ...socialCalendar, industry: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">Technology</SelectItem>
                    <SelectItem value="wellness">Health & Wellness</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="food">Food & Beverage</SelectItem>
                    <SelectItem value="professional">Professional Services</SelectItem>
                    <SelectItem value="creative">Creative Services</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="finance">Financial Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tone">Voice/Tone</Label>
                <Select onValueChange={(value) => setSocialCalendar({ ...socialCalendar, tone: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your brand tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="authoritative">Authoritative</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Primary Goals (select up to 2)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {["Brand Awareness", "Lead Generation", "Website Traffic", "Sales", "Community Building", "Thought Leadership"].map((goal) => (
                    <div key={goal} className="flex items-center space-x-2">
                      <Checkbox
                        id={goal}
                        checked={socialCalendar.goals.includes(goal)}
                        onCheckedChange={(checked) => {
                          if (checked && socialCalendar.goals.length < 2) {
                            setSocialCalendar({ ...socialCalendar, goals: [...socialCalendar.goals, goal] });
                          } else if (!checked) {
                            setSocialCalendar({ ...socialCalendar, goals: socialCalendar.goals.filter(g => g !== goal) });
                          }
                        }}
                        disabled={!socialCalendar.goals.includes(goal) && socialCalendar.goals.length >= 2}
                      />
                      <label htmlFor={goal} className="text-sm">{goal}</label>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={generateSocialMediaCalendar} className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Generate 30-Day Calendar
              </Button>

              {generatedCalendar.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Your 30-Day Social Media Calendar</h3>
                    <Button onClick={downloadCalendarCSV} size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Day</th>
                          <th className="p-2 text-left">Content Theme</th>
                          <th className="p-2 text-left">Goal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedCalendar.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{item.date}</td>
                            <td className="p-2">{item.day}</td>
                            <td className="p-2">{item.theme}</td>
                            <td className="p-2">{item.goal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    ProTip: Schedule these posts with tools like Buffer, Hootsuite, or Later for maximum consistency.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}