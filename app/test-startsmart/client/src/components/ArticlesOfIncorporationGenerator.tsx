import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Building, Plus, Trash2, FileText, Download, Send, ArrowLeft, ArrowRight, DollarSign, Users } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Director {
  name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface ArticlesOfIncorporationData {
  corporation_name: string;
  state_of_incorporation: string;
  duration: string;
  purpose: string;
  registered_agent: {
    name: string;
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
  };
  principal_office: {
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
  };
  authorized_shares: {
    number_of_shares: number;
    class: string;
    par_value: string;
  };
  incorporator: {
    name: string;
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
  };
  directors: Director[];
  limitation_of_liability: boolean;
  indemnification: boolean;
  additional_provisions: string;
  notarization_required: boolean;
  notary_details: {
    notary_name: string;
    county: string;
  };
  execution_date: string;
  execution_month_year: string;
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const STOCK_CLASSES = ['Common Stock', 'Preferred Stock', 'Class A Common Stock', 'Class B Common Stock'];

export function ArticlesOfIncorporationGenerator({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<string>('');

  const [formData, setFormData] = useState<ArticlesOfIncorporationData>({
    corporation_name: '',
    state_of_incorporation: '',
    duration: 'Perpetual',
    purpose: 'To engage in any lawful business activity',
    registered_agent: {
      name: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: ''
    },
    principal_office: {
      street_address: '',
      city: '',
      state: '',
      zip_code: ''
    },
    authorized_shares: {
      number_of_shares: 1000,
      class: 'Common Stock',
      par_value: '0.01'
    },
    incorporator: {
      name: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: ''
    },
    directors: [],
    limitation_of_liability: true,
    indemnification: true,
    additional_provisions: '',
    notarization_required: true,
    notary_details: {
      notary_name: '',
      county: ''
    },
    execution_date: '',
    execution_month_year: ''
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/articles-of-incorporation/generate', formData);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedDocument(data.document);
      setShowPreview(true);
      toast({
        title: "Articles of Incorporation Generated",
        description: "Your personalized Articles of Incorporation are ready for review.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate your articles of incorporation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const steps = [
    "Basic Information",
    "Registered Agent & Office",
    "Principal Office & Shares",
    "Incorporator & Directors",
    "Legal Provisions",
    "Execution Details",
    "Review & Generate"
  ];

  const updateFormData = (field: keyof ArticlesOfIncorporationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedFormData = (section: keyof ArticlesOfIncorporationData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value
      }
    }));
  };

  const addDirector = () => {
    setFormData(prev => ({
      ...prev,
      directors: [...prev.directors, {
        name: '',
        street_address: '',
        city: '',
        state: '',
        zip_code: ''
      }]
    }));
  };

  const removeDirector = (index: number) => {
    setFormData(prev => ({
      ...prev,
      directors: prev.directors.filter((_, i) => i !== index)
    }));
  };

  const updateDirector = (index: number, field: keyof Director, value: string) => {
    setFormData(prev => ({
      ...prev,
      directors: prev.directors.map((director, i) => 
        i === index ? { ...director, [field]: value } : director
      )
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(formData.corporation_name && formData.state_of_incorporation);
      case 1:
        return !!(formData.registered_agent.name && formData.registered_agent.street_address);
      case 2:
        return formData.authorized_shares.number_of_shares > 0;
      case 3:
        return !!(formData.incorporator.name && formData.incorporator.street_address);
      case 4:
        return true; // Optional provisions
      case 5:
        return !!(formData.execution_date && formData.execution_month_year);
      case 6:
        return true; // Review step
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateDocument = () => {
    generateMutation.mutate();
  };

  const downloadDocument = (format: 'txt' | 'docx' | 'pdf' = 'txt') => {
    const fileName = `${formData.corporation_name.replace(/[^a-zA-Z0-9]/g, '_')}_Articles_of_Incorporation`;
    
    if (format === 'txt') {
      const blob = new Blob([generatedDocument], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.txt`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else if (format === 'docx') {
      // Create RTF format that Word can properly open
      const rtfHeader = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} \\f0\\fs24`;
      const rtfTitle = `\\par\\qc\\b\\fs28 ${formData.corporation_name} Articles of Incorporation\\b0\\fs24\\par\\par`;
      const rtfContent = generatedDocument.replace(/\n/g, '\\par ');
      const rtfFooter = `}`;
      
      const rtfDocument = rtfHeader + rtfTitle + rtfContent + rtfFooter;
      
      const blob = new Blob([rtfDocument], { type: 'application/rtf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.rtf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Word Document Downloaded",
        description: "Your Articles of Incorporation has been saved as an RTF file that opens in Word.",
      });
    } else if (format === 'pdf') {
      // Use browser's print dialog to save as PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${fileName}</title>
            <style>
              @media print {
                body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 0.5in; font-size: 12pt; }
                .header { text-align: center; font-weight: bold; margin-bottom: 20px; font-size: 14pt; }
                .content { white-space: pre-line; page-break-inside: avoid; }
                @page { margin: 0.75in; }
              }
              body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 1in; font-size: 12pt; }
              .header { text-align: center; font-weight: bold; margin-bottom: 20px; font-size: 14pt; }
              .content { white-space: pre-line; }
            </style>
          </head>
          <body>
            <div class="header">${formData.corporation_name} Articles of Incorporation</div>
            <div class="content">${generatedDocument}</div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 500);
              }
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
      
      toast({
        title: "Print Dialog Opened",
        description: "Use the print dialog to save as PDF. Choose 'Save as PDF' as your destination.",
      });
    }
  };

  if (showPreview) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center border-b">
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <FileText className="h-6 w-6 text-emerald-600" />
            {formData.corporation_name} Articles of Incorporation
          </CardTitle>
          <CardDescription>Generated AI-Powered Articles of Incorporation</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg max-h-96 overflow-y-auto border">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {generatedDocument}
            </pre>
          </div>
          
          {/* Legal Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mt-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">Legal Disclaimer</h3>
                <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                  <p className="mb-2">
                    <strong>This document is for informational purposes only and does not constitute legal advice.</strong> 
                    The AI-generated articles of incorporation are a template that requires review and customization by a qualified attorney 
                    licensed in your state.
                  </p>
                  <p className="mb-2">
                    Corporate law varies by state and changes frequently. This template may not comply with current laws in your jurisdiction 
                    or address your specific business needs. Always consult with a licensed attorney before filing any legal document.
                  </p>
                  <p>
                    NexTax.AI and StartSmart disclaim all warranties and assume no liability for the use of this template. 
                    Professional legal review is strongly recommended before filing with your state.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Form
            </Button>
            <div className="flex gap-3">
              <div className="flex gap-2">
                <Button onClick={() => downloadDocument('txt')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download TXT
                </Button>
                <Button onClick={() => downloadDocument('docx')} className="bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download Word
                </Button>
                <Button onClick={() => downloadDocument('pdf')} className="bg-red-600 hover:bg-red-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
              <Button variant="outline" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto h-full flex flex-col">
      <CardHeader className="text-center border-b flex-shrink-0">
        <CardTitle className="flex items-center justify-center gap-2 text-xl">
          <Building className="h-6 w-6 text-emerald-600" />
          Create Articles of Incorporation
        </CardTitle>
        <CardDescription>
          AI-powered document generation for corporation formation
          <br />
          <span className="text-xs text-amber-600 font-medium">Template only - Professional legal review required</span>
        </CardDescription>
        <div className="mt-4">
          <Progress value={(currentStep / (steps.length - 1)) * 100} className="w-full" />
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            {steps.map((step, index) => (
              <span key={index} className={index === currentStep ? "text-emerald-600 font-medium" : ""}>
                {step}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 flex-1 overflow-y-auto">
        {/* Step 0: Basic Information */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="corporation_name">Full Legal Name of Corporation *</Label>
              <Input
                id="corporation_name"
                value={formData.corporation_name}
                onChange={(e) => updateFormData('corporation_name', e.target.value)}
                placeholder="e.g., ABC Corporation"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="state_of_incorporation">State of Incorporation *</Label>
              <Select value={formData.state_of_incorporation} onValueChange={(value) => updateFormData('state_of_incorporation', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duration">Duration of Corporation</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => updateFormData('duration', e.target.value)}
                placeholder="Perpetual"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="purpose">Business Purpose</Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) => updateFormData('purpose', e.target.value)}
                placeholder="To engage in any lawful business activity"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Step 1: Registered Agent & Office */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="registered_agent_name">Registered Agent Name *</Label>
              <Input
                id="registered_agent_name"
                value={formData.registered_agent.name}
                onChange={(e) => updateNestedFormData('registered_agent', 'name', e.target.value)}
                placeholder="e.g., John Smith"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="registered_agent_address">Registered Office Street Address *</Label>
              <Input
                id="registered_agent_address"
                value={formData.registered_agent.street_address}
                onChange={(e) => updateNestedFormData('registered_agent', 'street_address', e.target.value)}
                placeholder="e.g., 123 Main Street"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="registered_agent_city">City *</Label>
                <Input
                  id="registered_agent_city"
                  value={formData.registered_agent.city}
                  onChange={(e) => updateNestedFormData('registered_agent', 'city', e.target.value)}
                  placeholder="City"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="registered_agent_state">State *</Label>
                <Select value={formData.registered_agent.state} onValueChange={(value) => updateNestedFormData('registered_agent', 'state', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="registered_agent_zip">ZIP Code *</Label>
                <Input
                  id="registered_agent_zip"
                  value={formData.registered_agent.zip_code}
                  onChange={(e) => updateNestedFormData('registered_agent', 'zip_code', e.target.value)}
                  placeholder="12345"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Principal Office & Shares */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Principal Office (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="principal_office_address">Principal Office Street Address</Label>
                  <Input
                    id="principal_office_address"
                    value={formData.principal_office.street_address}
                    onChange={(e) => updateNestedFormData('principal_office', 'street_address', e.target.value)}
                    placeholder="e.g., 456 Business Ave"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="principal_office_city">City</Label>
                    <Input
                      id="principal_office_city"
                      value={formData.principal_office.city}
                      onChange={(e) => updateNestedFormData('principal_office', 'city', e.target.value)}
                      placeholder="City"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="principal_office_state">State</Label>
                    <Select value={formData.principal_office.state} onValueChange={(value) => updateNestedFormData('principal_office', 'state', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="principal_office_zip">ZIP Code</Label>
                    <Input
                      id="principal_office_zip"
                      value={formData.principal_office.zip_code}
                      onChange={(e) => updateNestedFormData('principal_office', 'zip_code', e.target.value)}
                      placeholder="12345"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Authorized Shares
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="number_of_shares">Number of Shares *</Label>
                  <Input
                    id="number_of_shares"
                    type="number"
                    value={formData.authorized_shares.number_of_shares}
                    onChange={(e) => updateNestedFormData('authorized_shares', 'number_of_shares', parseInt(e.target.value) || 0)}
                    placeholder="1000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="share_class">Class of Stock</Label>
                  <Select value={formData.authorized_shares.class} onValueChange={(value) => updateNestedFormData('authorized_shares', 'class', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {STOCK_CLASSES.map(stockClass => (
                        <SelectItem key={stockClass} value={stockClass}>{stockClass}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="par_value">Par Value per Share</Label>
                  <Input
                    id="par_value"
                    value={formData.authorized_shares.par_value}
                    onChange={(e) => updateNestedFormData('authorized_shares', 'par_value', e.target.value)}
                    placeholder="0.01"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Incorporator & Directors */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Incorporator Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="incorporator_name">Incorporator Name *</Label>
                  <Input
                    id="incorporator_name"
                    value={formData.incorporator.name}
                    onChange={(e) => updateNestedFormData('incorporator', 'name', e.target.value)}
                    placeholder="e.g., Jane Doe"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="incorporator_address">Incorporator Street Address *</Label>
                  <Input
                    id="incorporator_address"
                    value={formData.incorporator.street_address}
                    onChange={(e) => updateNestedFormData('incorporator', 'street_address', e.target.value)}
                    placeholder="e.g., 789 Incorporator Lane"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="incorporator_city">City *</Label>
                    <Input
                      id="incorporator_city"
                      value={formData.incorporator.city}
                      onChange={(e) => updateNestedFormData('incorporator', 'city', e.target.value)}
                      placeholder="City"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="incorporator_state">State *</Label>
                    <Select value={formData.incorporator.state} onValueChange={(value) => updateNestedFormData('incorporator', 'state', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="incorporator_zip">ZIP Code *</Label>
                    <Input
                      id="incorporator_zip"
                      value={formData.incorporator.zip_code}
                      onChange={(e) => updateNestedFormData('incorporator', 'zip_code', e.target.value)}
                      placeholder="12345"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  Initial Directors (Optional)
                </h3>
                <Button onClick={addDirector} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Director
                </Button>
              </div>
              
              {formData.directors.map((director, index) => (
                <Card key={index} className="p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Director {index + 1}</h4>
                    <Button 
                      onClick={() => removeDirector(index)} 
                      size="sm" 
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={director.name}
                        onChange={(e) => updateDirector(index, 'name', e.target.value)}
                        placeholder="Director name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Street Address</Label>
                      <Input
                        value={director.street_address}
                        onChange={(e) => updateDirector(index, 'street_address', e.target.value)}
                        placeholder="Street address"
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label>City</Label>
                        <Input
                          value={director.city}
                          onChange={(e) => updateDirector(index, 'city', e.target.value)}
                          placeholder="City"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Select value={director.state} onValueChange={(value) => updateDirector(index, 'state', value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATES.map(state => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>ZIP</Label>
                        <Input
                          value={director.zip_code}
                          onChange={(e) => updateDirector(index, 'zip_code', e.target.value)}
                          placeholder="12345"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Legal Provisions */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Legal Provisions</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="limitation_of_liability"
                checked={formData.limitation_of_liability}
                onCheckedChange={(checked) => updateFormData('limitation_of_liability', checked)}
              />
              <Label htmlFor="limitation_of_liability">
                Include limitation of liability for directors
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="indemnification"
                checked={formData.indemnification}
                onCheckedChange={(checked) => updateFormData('indemnification', checked)}
              />
              <Label htmlFor="indemnification">
                Include indemnification for officers and directors
              </Label>
            </div>
            
            <div>
              <Label htmlFor="additional_provisions">Additional Provisions (Optional)</Label>
              <Textarea
                id="additional_provisions"
                value={formData.additional_provisions}
                onChange={(e) => updateFormData('additional_provisions', e.target.value)}
                placeholder="Any additional provisions to include..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Step 5: Execution Details */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="execution_date">Execution Date *</Label>
              <Input
                id="execution_date"
                type="date"
                value={formData.execution_date}
                onChange={(e) => updateFormData('execution_date', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="execution_month_year">Execution Month and Year *</Label>
              <Input
                id="execution_month_year"
                value={formData.execution_month_year}
                onChange={(e) => updateFormData('execution_month_year', e.target.value)}
                placeholder="e.g., January 2025"
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center space-x-2 mt-4">
              <Checkbox
                id="notarization_required"
                checked={formData.notarization_required}
                onCheckedChange={(checked) => updateFormData('notarization_required', checked)}
              />
              <Label htmlFor="notarization_required">
                Notarization required in your state
              </Label>
            </div>
            
            {formData.notarization_required && (
              <div className="space-y-4 mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div>
                  <Label htmlFor="notary_name">Notary Name</Label>
                  <Input
                    id="notary_name"
                    value={formData.notary_details.notary_name}
                    onChange={(e) => updateNestedFormData('notary_details', 'notary_name', e.target.value)}
                    placeholder="Notary public name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="notary_county">County</Label>
                  <Input
                    id="notary_county"
                    value={formData.notary_details.county}
                    onChange={(e) => updateNestedFormData('notary_details', 'county', e.target.value)}
                    placeholder="County name"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Review & Generate */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium mb-4">Review Your Information</h3>
            
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Corporation Details</h4>
                <p><strong>Name:</strong> {formData.corporation_name}</p>
                <p><strong>State:</strong> {formData.state_of_incorporation}</p>
                <p><strong>Duration:</strong> {formData.duration}</p>
                <p><strong>Purpose:</strong> {formData.purpose}</p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Registered Agent</h4>
                <p><strong>Name:</strong> {formData.registered_agent.name}</p>
                <p><strong>Address:</strong> {formData.registered_agent.street_address}, {formData.registered_agent.city}, {formData.registered_agent.state} {formData.registered_agent.zip_code}</p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Authorized Shares</h4>
                <p><strong>Number:</strong> {formData.authorized_shares.number_of_shares.toLocaleString()}</p>
                <p><strong>Class:</strong> {formData.authorized_shares.class}</p>
                <p><strong>Par Value:</strong> ${formData.authorized_shares.par_value}</p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Incorporator</h4>
                <p><strong>Name:</strong> {formData.incorporator.name}</p>
                <p><strong>Address:</strong> {formData.incorporator.street_address}, {formData.incorporator.city}, {formData.incorporator.state} {formData.incorporator.zip_code}</p>
              </div>
              
              {formData.directors.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Directors ({formData.directors.length})</h4>
                  {formData.directors.map((director, index) => (
                    <p key={index}><strong>{director.name}</strong> - {director.city}, {director.state}</p>
                  ))}
                </div>
              )}
              
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Ready to generate your Articles of Incorporation! This AI-powered document will include all 
                  standard corporate provisions, state-specific compliance, and comprehensive clauses ready for attorney review.
                </p>
              </div>
            </div>
          </div>
        )}

      </CardContent>
      
      {/* Fixed Navigation at Bottom */}
      <div className="flex justify-between items-center p-6 border-t bg-white dark:bg-card flex-shrink-0">
        <Button
          onClick={prevStep}
          variant="outline"
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="text-sm text-slate-500">
          Step {currentStep + 1} of {steps.length}
        </div>

        {currentStep === steps.length - 1 ? (
          <Button
            onClick={generateDocument}
            disabled={!validateStep(currentStep) || generateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {generateMutation.isPending ? (
              "Generating..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Generate Articles
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={nextStep}
            disabled={!validateStep(currentStep)}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  );
}