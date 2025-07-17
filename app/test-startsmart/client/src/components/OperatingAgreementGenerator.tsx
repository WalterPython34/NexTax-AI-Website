import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Plus, Trash2, FileText, Download, Send, ArrowLeft, ArrowRight, Building, DollarSign } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Member {
  name: string;
  address: string;
  capital_contribution: number;
  ownership_percentage: number;
}

interface OperatingAgreementData {
  llc_name: string;
  agreement_date: string;
  state_of_formation: string;
  formation_date: string;
  registered_office_address: string;
  registered_agent_name: string;
  members: Member[];
  management_structure: string;
  financial_institution: string;
  authorized_signatories: string[];
  tax_election: string;
  valuation_method: string;
  dissolution_terms: string;
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

const TAX_ELECTIONS = ['Partnership', 'S-Corp', 'C-Corp'];
const MANAGEMENT_TYPES = ['Member-managed', 'Manager-managed'];
const VALUATION_METHODS = [
  'Mutual agreement',
  'Professional appraisal',
  'Book value method',
  'Fair market value',
  'Formula-based valuation'
];

interface OperatingAgreementGeneratorProps {
  onClose: () => void;
}

export default function OperatingAgreementGenerator({ onClose }: OperatingAgreementGeneratorProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OperatingAgreementData>({
    llc_name: '',
    agreement_date: new Date().toISOString().split('T')[0],
    state_of_formation: '',
    formation_date: '',
    registered_office_address: '',
    registered_agent_name: '',
    members: [{ name: '', address: '', capital_contribution: 0, ownership_percentage: 0 }],
    management_structure: 'Member-managed',
    financial_institution: '',
    authorized_signatories: [],
    tax_election: 'Partnership',
    valuation_method: 'Mutual agreement',
    dissolution_terms: 'Default per state law'
  });

  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/operating-agreement/generate', formData);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedDocument(data.document);
      setShowPreview(true);
      toast({
        title: "Operating Agreement Generated",
        description: "Your personalized LLC Operating Agreement is ready for review.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate your operating agreement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const steps = [
    "Basic Information",
    "Formation Details", 
    "Members & Ownership",
    "Management & Finance",
    "Legal Preferences",
    "Review & Generate"
  ];

  const updateFormData = (field: keyof OperatingAgreementData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addMember = () => {
    setFormData(prev => ({
      ...prev,
      members: [...prev.members, { name: '', address: '', capital_contribution: 0, ownership_percentage: 0 }]
    }));
  };

  const removeMember = (index: number) => {
    if (formData.members.length > 1) {
      setFormData(prev => ({
        ...prev,
        members: prev.members.filter((_, i) => i !== index)
      }));
    }
  };

  const updateMember = (index: number, field: keyof Member, value: any) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return formData.llc_name.trim() !== '' && formData.agreement_date !== '';
      case 1:
        return formData.state_of_formation !== '' && formData.formation_date !== '' &&
               formData.registered_office_address.trim() !== '' && formData.registered_agent_name.trim() !== '';
      case 2:
        return formData.members.every(m => m.name.trim() !== '' && m.address.trim() !== '' &&
               m.capital_contribution >= 0 && m.ownership_percentage > 0) &&
               Math.abs(formData.members.reduce((sum, m) => sum + m.ownership_percentage, 0) - 100) < 0.01;
      case 3:
        return formData.management_structure !== '' && formData.tax_election !== '';
      case 4:
        return formData.valuation_method !== '' && formData.dissolution_terms.trim() !== '';
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateDocument = () => {
    // Update authorized signatories based on members if not set
    if (formData.authorized_signatories.length === 0) {
      setFormData(prev => ({
        ...prev,
        authorized_signatories: prev.members.map(m => m.name).filter(name => name.trim() !== '')
      }));
    }
    generateMutation.mutate();
  };

  const downloadDocument = (format: 'txt' | 'docx' | 'pdf' = 'txt') => {
    const fileName = `${formData.llc_name.replace(/[^a-zA-Z0-9]/g, '_')}_Operating_Agreement`;
    
    if (format === 'txt') {
      // Plain text download
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
      const rtfTitle = `\\par\\qc\\b\\fs28 ${formData.llc_name} Operating Agreement\\b0\\fs24\\par\\par`;
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
        description: "Your Operating Agreement has been saved as an RTF file that opens in Word.",
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
            <div class="header">${formData.llc_name} Operating Agreement</div>
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
            {formData.llc_name} Operating Agreement
          </CardTitle>
          <CardDescription>Generated AI-Powered Operating Agreement</CardDescription>
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
                    The AI-generated operating agreement is a template that requires review and customization by a qualified attorney 
                    licensed in your state.
                  </p>
                  <p className="mb-2">
                    Laws vary by state and change frequently. This template may not comply with current laws in your jurisdiction 
                    or address your specific business needs. Always consult with a licensed attorney before executing any legal document.
                  </p>
                  <p>
                    NexTax.AI and StartSmart disclaim all warranties and assume no liability for the use of this template. 
                    Professional legal review is strongly recommended.
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

  const ownershipTotal = formData.members.reduce((sum, member) => sum + member.ownership_percentage, 0);

  return (
    <Card className="w-full max-w-3xl mx-auto h-full flex flex-col">
      <CardHeader className="text-center border-b flex-shrink-0">
        <CardTitle className="flex items-center justify-center gap-2 text-xl">
          <Building className="h-6 w-6 text-emerald-600" />
          Create LLC Operating Agreement
        </CardTitle>
        <CardDescription>
          AI-powered document generation with legal compliance
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
              <Label htmlFor="llc_name">Full LLC Name *</Label>
              <Input
                id="llc_name"
                value={formData.llc_name}
                onChange={(e) => updateFormData('llc_name', e.target.value)}
                placeholder="e.g., ABC Holdings LLC"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="agreement_date">Agreement Date *</Label>
              <Input
                id="agreement_date"
                type="date"
                value={formData.agreement_date}
                onChange={(e) => updateFormData('agreement_date', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Step 1: Formation Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="state_of_formation">State of Formation *</Label>
              <Select value={formData.state_of_formation} onValueChange={(value) => updateFormData('state_of_formation', value)}>
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
              <Label htmlFor="formation_date">LLC Formation Date *</Label>
              <Input
                id="formation_date"
                type="date"
                value={formData.formation_date}
                onChange={(e) => updateFormData('formation_date', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="registered_office_address">Registered Office Address *</Label>
              <Textarea
                id="registered_office_address"
                value={formData.registered_office_address}
                onChange={(e) => updateFormData('registered_office_address', e.target.value)}
                placeholder="Full address including street, city, state, ZIP"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="registered_agent_name">Registered Agent Name *</Label>
              <Input
                id="registered_agent_name"
                value={formData.registered_agent_name}
                onChange={(e) => updateFormData('registered_agent_name', e.target.value)}
                placeholder="Full name of registered agent"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Step 2: Members & Ownership */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Users className="h-5 w-5" />
                LLC Members
              </h3>
              <Button onClick={addMember} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Member
              </Button>
            </div>
            
            {formData.members.map((member, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Member {index + 1}</h4>
                  {formData.members.length > 1 && (
                    <Button onClick={() => removeMember(index)} size="sm" variant="ghost">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={member.name}
                      onChange={(e) => updateMember(index, 'name', e.target.value)}
                      placeholder="Member's full legal name"
                    />
                  </div>
                  <div>
                    <Label>Ownership Percentage *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={member.ownership_percentage}
                      onChange={(e) => updateMember(index, 'ownership_percentage', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Capital Contribution ($) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={member.capital_contribution}
                      onChange={(e) => updateMember(index, 'capital_contribution', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Address *</Label>
                    <Textarea
                      value={member.address}
                      onChange={(e) => updateMember(index, 'address', e.target.value)}
                      placeholder="Full address"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Total Ownership:</span>
                <Badge variant={Math.abs(ownershipTotal - 100) < 0.01 ? "default" : "destructive"}>
                  {ownershipTotal.toFixed(2)}%
                </Badge>
              </div>
              {Math.abs(ownershipTotal - 100) >= 0.01 && (
                <p className="text-sm text-red-600 mt-1">Ownership percentages must total 100%</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Management & Finance */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Management Structure *</Label>
              <Select value={formData.management_structure} onValueChange={(value) => updateFormData('management_structure', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANAGEMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tax Election *</Label>
              <Select value={formData.tax_election} onValueChange={(value) => updateFormData('tax_election', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_ELECTIONS.map(election => (
                    <SelectItem key={election} value={election}>{election}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="financial_institution">Financial Institution (Optional)</Label>
              <Input
                id="financial_institution"
                value={formData.financial_institution}
                onChange={(e) => updateFormData('financial_institution', e.target.value)}
                placeholder="e.g., Chase Bank, Wells Fargo"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Step 4: Legal Preferences */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <Label>Member Interest Valuation Method *</Label>
              <Select value={formData.valuation_method} onValueChange={(value) => updateFormData('valuation_method', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALUATION_METHODS.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dissolution_terms">Dissolution Terms *</Label>
              <Textarea
                id="dissolution_terms"
                value={formData.dissolution_terms}
                onChange={(e) => updateFormData('dissolution_terms', e.target.value)}
                placeholder="Specify how the LLC should be dissolved, or use 'Default per state law'"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 5: Review & Generate */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Review Your Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div>
                  <span className="font-medium">LLC Name:</span>
                  <p className="text-slate-600 dark:text-slate-400">{formData.llc_name}</p>
                </div>
                <div>
                  <span className="font-medium">State:</span>
                  <p className="text-slate-600 dark:text-slate-400">{formData.state_of_formation}</p>
                </div>
                <div>
                  <span className="font-medium">Management:</span>
                  <p className="text-slate-600 dark:text-slate-400">{formData.management_structure}</p>
                </div>
                <div>
                  <span className="font-medium">Tax Election:</span>
                  <p className="text-slate-600 dark:text-slate-400">{formData.tax_election}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Members ({formData.members.length}):</span>
                  {formData.members.map((member, index) => (
                    <div key={index} className="text-slate-600 dark:text-slate-400 ml-2">
                      {member.name} - {member.ownership_percentage}%
                    </div>
                  ))}
                </div>
                <div>
                  <span className="font-medium">Registered Agent:</span>
                  <p className="text-slate-600 dark:text-slate-400">{formData.registered_agent_name}</p>
                </div>
                <div>
                  <span className="font-medium">Valuation Method:</span>
                  <p className="text-slate-600 dark:text-slate-400">{formData.valuation_method}</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-emerald-800 dark:text-emerald-200">Pro Plan Features</h4>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                    Your AI-generated Operating Agreement includes professional legal formatting, 
                    state-specific compliance, and comprehensive clauses ready for attorney review.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </CardContent>
      
      {/* AI Disclaimer */}
      <div className="px-6 py-3 bg-blue-50 border-t border-blue-200">
        <p className="text-xs text-blue-700">
          <strong>AI-Generated Content:</strong> This document is created using AI for informational purposes only. 
          Not financial, legal, or investment advice. <a href="#" className="underline hover:text-blue-800">View full disclaimer</a>
        </p>
      </div>
      
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
                Generate Agreement
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