import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, FileText, Download, Building, Users, Calendar, Settings, Check, AlertTriangle } from 'lucide-react';

interface CorporateBylawsData {
  corporation_name: string;
  state_of_incorporation: string;
  principal_office_address: string;
  annual_meeting_month_day: string;
  special_meeting_percent: number;
  shareholder_notice_days: number;
  number_of_directors: number;
  director_term_years: number;
  board_meeting_frequency: string;
  officers: string[];
  fiscal_year_end: string;
  amendment_vote_threshold: number;
  certification_day: string;
  certification_month_year: string;
  secretary_name: string;
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

const MEETING_FREQUENCIES = ['Weekly', 'Monthly', 'Quarterly', 'Semi-annually', 'Annually'];
const STANDARD_OFFICERS = ['President', 'Secretary', 'Treasurer', 'Vice President'];

interface CorporateBylawsGeneratorProps {
  onClose: () => void;
}

export function CorporateBylawsGenerator({ onClose }: CorporateBylawsGeneratorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState<CorporateBylawsData>({
    corporation_name: '',
    state_of_incorporation: '',
    principal_office_address: '',
    annual_meeting_month_day: '',
    special_meeting_percent: 10,
    shareholder_notice_days: 10,
    number_of_directors: 3,
    director_term_years: 1,
    board_meeting_frequency: 'Quarterly',
    officers: ['President', 'Secretary', 'Treasurer'],
    fiscal_year_end: 'December 31',
    amendment_vote_threshold: 51,
    certification_day: '',
    certification_month_year: '',
    secretary_name: ''
  });

  const updateFormData = (field: keyof CorporateBylawsData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleOfficer = (officer: string) => {
    setFormData(prev => ({
      ...prev,
      officers: prev.officers.includes(officer)
        ? prev.officers.filter(o => o !== officer)
        : [...prev.officers, officer]
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.corporation_name && formData.state_of_incorporation);
      case 2:
        return !!(formData.principal_office_address);
      case 3:
        return !!(formData.annual_meeting_month_day && formData.special_meeting_percent > 0 && formData.shareholder_notice_days > 0);
      case 4:
        return !!(formData.number_of_directors > 0 && formData.director_term_years > 0);
      case 5:
        return !!(formData.board_meeting_frequency && formData.officers.length > 0);
      case 6:
        return !!(formData.fiscal_year_end && formData.amendment_vote_threshold > 0);
      case 7:
        return !!(formData.certification_day && formData.certification_month_year && formData.secretary_name);
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 7));
    } else {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields before continuing.",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const generateBylaws = async () => {
    if (!validateStep(7)) {
      toast({
        title: "Required Fields Missing",
        description: "Please complete all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/corporate-bylaws/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate Corporate Bylaws');
      }

      const data = await response.json();
      setGeneratedDocument(data.document);
      setCurrentStep(8); // Move to review step
      
      toast({
        title: "Corporate Bylaws Generated!",
        description: "Your professional Corporate Bylaws document is ready for download.",
      });
    } catch (error) {
      console.error('Error generating Corporate Bylaws:', error);
      toast({
        title: "Generation Failed",
        description: "There was an error generating your Corporate Bylaws. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocument = (format: 'txt' | 'docx' | 'pdf' = 'txt') => {
    const fileName = `${formData.corporation_name.replace(/[^a-zA-Z0-9]/g, '_')}_Corporate_Bylaws`;
    
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
      const rtfTitle = `\\par\\qc\\b\\fs28 ${formData.corporation_name} Corporate Bylaws\\b0\\fs24\\par\\par`;
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
        description: "Your Corporate Bylaws has been saved as an RTF file that opens in Word.",
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
            <div class="header">${formData.corporation_name} Corporate Bylaws</div>
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

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return Building;
      case 2: return FileText;
      case 3: return Users;
      case 4: return Users;
      case 5: return Calendar;
      case 6: return Settings;
      case 7: return Check;
      default: return FileText;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return "Basic Information";
      case 2: return "Office Address";
      case 3: return "Shareholder Meetings";
      case 4: return "Board of Directors";
      case 5: return "Board Operations";
      case 6: return "Corporate Details";
      case 7: return "Certification";
      case 8: return "Review & Download";
      default: return "";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900">
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building className="h-8 w-8 text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Corporate Bylaws Generator
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                AI-powered professional document creation
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
            <span>Step {currentStep} of {currentStep === 8 ? 8 : 7}</span>
            <span>{Math.round((currentStep / (currentStep === 8 ? 8 : 7)) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / (currentStep === 8 ? 8 : 7)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentStep < 8 && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                {React.createElement(getStepIcon(currentStep), { className: "h-6 w-6 text-purple-600" })}
                <CardTitle>{getStepTitle(currentStep)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="corporation_name">Corporation Name *</Label>
                    <Input
                      id="corporation_name"
                      value={formData.corporation_name}
                      onChange={(e) => updateFormData('corporation_name', e.target.value)}
                      placeholder="e.g., ABC Corporation"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>State of Incorporation *</Label>
                    <Select value={formData.state_of_incorporation} onValueChange={(value) => updateFormData('state_of_incorporation', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 2: Office Address */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="principal_office_address">Principal Office Address *</Label>
                    <Textarea
                      id="principal_office_address"
                      value={formData.principal_office_address}
                      onChange={(e) => updateFormData('principal_office_address', e.target.value)}
                      placeholder="Full street address, city, state, zip code"
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Shareholder Meetings */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="annual_meeting_month_day">Annual Meeting Date (Month & Day) *</Label>
                    <Input
                      id="annual_meeting_month_day"
                      value={formData.annual_meeting_month_day}
                      onChange={(e) => updateFormData('annual_meeting_month_day', e.target.value)}
                      placeholder="e.g., May 15, Third Tuesday in May"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="special_meeting_percent">Special Meeting Call Threshold (% of shareholders) *</Label>
                    <Input
                      id="special_meeting_percent"
                      type="number"
                      value={formData.special_meeting_percent}
                      onChange={(e) => updateFormData('special_meeting_percent', parseInt(e.target.value) || 0)}
                      placeholder="10"
                      min="1"
                      max="100"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shareholder_notice_days">Meeting Notice Period (days) *</Label>
                    <Input
                      id="shareholder_notice_days"
                      type="number"
                      value={formData.shareholder_notice_days}
                      onChange={(e) => updateFormData('shareholder_notice_days', parseInt(e.target.value) || 0)}
                      placeholder="10"
                      min="1"
                      max="60"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Board of Directors */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="number_of_directors">Number of Directors *</Label>
                    <Input
                      id="number_of_directors"
                      type="number"
                      value={formData.number_of_directors}
                      onChange={(e) => updateFormData('number_of_directors', parseInt(e.target.value) || 0)}
                      placeholder="3"
                      min="1"
                      max="20"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="director_term_years">Director Term Length (years) *</Label>
                    <Input
                      id="director_term_years"
                      type="number"
                      value={formData.director_term_years}
                      onChange={(e) => updateFormData('director_term_years', parseInt(e.target.value) || 0)}
                      placeholder="1"
                      min="1"
                      max="5"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Board Operations */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <Label>Board Meeting Frequency *</Label>
                    <Select value={formData.board_meeting_frequency} onValueChange={(value) => updateFormData('board_meeting_frequency', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEETING_FREQUENCIES.map(freq => (
                          <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Officer Positions *</Label>
                    <div className="mt-2 space-y-2">
                      {STANDARD_OFFICERS.map(officer => (
                        <label key={officer} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.officers.includes(officer)}
                            onChange={() => toggleOfficer(officer)}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">{officer}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Corporate Details */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fiscal_year_end">Fiscal Year End *</Label>
                    <Input
                      id="fiscal_year_end"
                      value={formData.fiscal_year_end}
                      onChange={(e) => updateFormData('fiscal_year_end', e.target.value)}
                      placeholder="December 31"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amendment_vote_threshold">Amendment Vote Threshold (% of shareholders) *</Label>
                    <Input
                      id="amendment_vote_threshold"
                      type="number"
                      value={formData.amendment_vote_threshold}
                      onChange={(e) => updateFormData('amendment_vote_threshold', parseInt(e.target.value) || 0)}
                      placeholder="51"
                      min="1"
                      max="100"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Step 7: Certification */}
              {currentStep === 7 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="certification_day">Certification Date (Day) *</Label>
                    <Input
                      id="certification_day"
                      value={formData.certification_day}
                      onChange={(e) => updateFormData('certification_day', e.target.value)}
                      placeholder="e.g., 15th day"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="certification_month_year">Certification Month/Year *</Label>
                    <Input
                      id="certification_month_year"
                      value={formData.certification_month_year}
                      onChange={(e) => updateFormData('certification_month_year', e.target.value)}
                      placeholder="e.g., June 2025"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="secretary_name">Secretary Name *</Label>
                    <Input
                      id="secretary_name"
                      value={formData.secretary_name}
                      onChange={(e) => updateFormData('secretary_name', e.target.value)}
                      placeholder="Full name of certifying secretary"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Review Step */}
        {currentStep === 8 && (
          <div className="space-y-6">
            {/* Document Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Your Corporate Bylaws</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {generatedDocument.substring(0, 1000)}...
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Download Options */}
            <Card>
              <CardHeader>
                <CardTitle>Download Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => downloadDocument('txt')}
                    variant="outline"
                    className="flex flex-col items-center space-y-2 h-auto py-4"
                  >
                    <FileText className="h-6 w-6" />
                    <span>Text File</span>
                    <span className="text-xs text-slate-500">Plain text format</span>
                  </Button>
                  
                  <Button
                    onClick={() => downloadDocument('docx')}
                    variant="outline"
                    className="flex flex-col items-center space-y-2 h-auto py-4"
                  >
                    <Download className="h-6 w-6" />
                    <span>Word Document</span>
                    <span className="text-xs text-slate-500">Microsoft Word format</span>
                  </Button>
                  
                  <Button
                    onClick={() => downloadDocument('pdf')}
                    variant="outline"
                    className="flex flex-col items-center space-y-2 h-auto py-4"
                  >
                    <FileText className="h-6 w-6" />
                    <span>PDF</span>
                    <span className="text-xs text-slate-500">Print to save as PDF</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Legal Disclaimer */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/10">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-semibold mb-2">Important Legal Notice:</p>
                    <p className="leading-relaxed">
                      This AI-generated Corporate Bylaws is provided for informational purposes only and does not constitute legal advice. 
                      This document should be reviewed and customized by a qualified attorney before use. Corporate bylaws requirements 
                      vary by state and specific circumstances. StartSmart AI and NexTax.AI are not responsible for the legal 
                      sufficiency or accuracy of this document.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* AI Disclaimer */}
      <div className="flex-shrink-0 px-6 py-3 bg-blue-50 border-t border-blue-200">
        <p className="text-xs text-blue-700">
          <strong>AI-Generated Content:</strong> This document is created using AI for informational purposes only. 
          Not financial, legal, or investment advice. <a href="#" className="underline hover:text-blue-800">View full disclaimer</a>
        </p>
      </div>

      {/* Fixed Footer Navigation */}
      <div className="flex-shrink-0 border-t bg-white dark:bg-slate-900 p-4">
        <div className="flex justify-between items-center">
          {currentStep > 1 && currentStep < 8 && (
            <Button variant="outline" onClick={prevStep} className="flex items-center space-x-2">
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
          )}
          
          {currentStep === 1 && <div />}
          
          <div className="flex space-x-2">
            {currentStep < 7 && (
              <Button 
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            
            {currentStep === 7 && (
              <Button 
                onClick={generateBylaws}
                disabled={!validateStep(7) || isGenerating}
                className="flex items-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>Generate Bylaws</span>
                  </>
                )}
              </Button>
            )}
            
            {currentStep === 8 && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}