import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, FileSpreadsheet, Download, AlertCircle, Lightbulb, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExpenseTrackerGeneratorProps {
  onClose: () => void;
}

export function ExpenseTrackerGenerator({ onClose }: ExpenseTrackerGeneratorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [showProTip, setShowProTip] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    businessType: "",
    expenseCategories: [] as string[],
    includeBudgetTargets: false,
    trackPaymentMethods: false,
    monthlySummaries: false,
    customCategories: ""
  });

  const businessTypes = [
    "Retail Store",
    "SaaS/Software",
    "Consulting Services", 
    "Restaurant/Food Service",
    "Manufacturing",
    "E-commerce",
    "Healthcare Services",
    "Real Estate",
    "Construction",
    "Professional Services",
    "Non-profit Organization",
    "Other"
  ];

  const commonExpenseCategories = [
    "Office Supplies",
    "Software & Subscriptions",
    "Advertising & Marketing",
    "Travel & Transportation",
    "Meals & Entertainment",
    "Professional Services",
    "Equipment & Technology",
    "Rent & Utilities",
    "Insurance",
    "Banking & Financial Fees",
    "Training & Education",
    "Phone & Internet"
  ];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerate();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.businessType;
    }
    if (currentStep === 2) {
      return formData.expenseCategories.length > 0;
    }
    return true;
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      expenseCategories: prev.expenseCategories.includes(category)
        ? prev.expenseCategories.filter(c => c !== category)
        : [...prev.expenseCategories, category]
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/generate/expense-tracker", formData);
      const response = await res.json() as { downloadUrl?: string; document?: any; message?: string };
      
      if (response && response.downloadUrl) {
        setDownloadUrl(response.downloadUrl);
        setGeneratedContent("Expense Tracker generated successfully!");
        setCurrentStep(4);
        
        // Invalidate documents cache to refresh "My Documents"
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        
        toast({
          title: "Expense Tracker Generated",
          description: "Your customized expense tracker is ready for download.",
        });
      } else {
        console.error("No downloadUrl in response:", response);
        toast({
          title: "Generation Issue",
          description: "Tracker generated but download link missing. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Generation failed:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate expense tracker. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Expense_Tracker_${formData.businessType.replace(/\s+/g, '_')}_AI_Generated.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Your Expense Tracker Excel file is downloading.",
      });
      
      // Show ProTip after download
      setTimeout(() => setShowProTip(true), 1000);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="businessType" className="text-base font-medium">
          What type of business are you running? *
        </Label>
        <Select 
          value={formData.businessType} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select your business type" />
          </SelectTrigger>
          <SelectContent>
            {businessTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          This helps us suggest relevant expense categories for your industry
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">
          What expense categories do you want to track? *
        </Label>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Select all categories that apply to your business
        </p>
        
        <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
          {commonExpenseCategories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={category}
                checked={formData.expenseCategories.includes(category)}
                onCheckedChange={() => handleCategoryToggle(category)}
              />
              <Label htmlFor={category} className="text-sm">
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="customCategories" className="text-base font-medium">
          Additional Categories (Optional)
        </Label>
        <Textarea
          id="customCategories"
          placeholder="Enter any specific categories for your business (comma-separated)..."
          value={formData.customCategories}
          onChange={(e) => setFormData(prev => ({ ...prev, customCategories: e.target.value }))}
          className="mt-2"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="includeBudgetTargets"
            checked={formData.includeBudgetTargets}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, includeBudgetTargets: checked as boolean }))
            }
          />
          <Label htmlFor="includeBudgetTargets" className="text-base font-medium">
            Pre-fill budget targets for each category?
          </Label>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
          We'll suggest monthly budget amounts based on your business type and industry averages
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="trackPaymentMethods"
            checked={formData.trackPaymentMethods}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, trackPaymentMethods: checked as boolean }))
            }
          />
          <Label htmlFor="trackPaymentMethods" className="text-base font-medium">
            Track payment methods (Cash, Credit Card, Check, etc.)?
          </Label>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
          Helps with expense categorization and financial reporting
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="monthlySummaries"
            checked={formData.monthlySummaries}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, monthlySummaries: checked as boolean }))
            }
          />
          <Label htmlFor="monthlySummaries" className="text-base font-medium">
            Include monthly summary formulas?
          </Label>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
          Auto-calculates totals by category and month for easy reporting
        </p>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
        <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Expense Tracker Generated!
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Your customized expense tracker for {formData.businessType} is ready.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left">
        <h4 className="font-medium mb-2">Features Included:</h4>
        <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
          <li>• Business type: {formData.businessType}</li>
          <li>• Categories: {formData.expenseCategories.length} pre-selected</li>
          {formData.includeBudgetTargets && <li>• Budget targets pre-filled</li>}
          {formData.trackPaymentMethods && <li>• Payment method tracking</li>}
          {formData.monthlySummaries && <li>• Monthly summary formulas</li>}
          {formData.customCategories && <li>• Custom categories included</li>}
        </ul>
      </div>

      <div className="flex gap-3 justify-center">
        <Button onClick={handleDownload} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Excel File
        </Button>
        <Button variant="outline" onClick={() => setShowProTip(true)} className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          See ProTip
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>AI Disclaimer:</strong> This expense tracker is AI-generated for informational purposes only. 
          Please review and customize for your specific business needs.
          <a href="#" className="text-blue-600 hover:underline ml-1">View full disclaimer</a>
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
          <CardHeader className="flex-shrink-0 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Expense Tracker Generator
                </CardTitle>
                <CardDescription>
                  Create a customized expense tracking spreadsheet for your business
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep 
                      ? 'bg-blue-600 text-white' 
                      : step < currentStep 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      step < currentStep ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </CardContent>

          {currentStep < 4 && (
            <div className="flex-shrink-0 border-t p-4 flex justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isGenerating}
              >
                {isGenerating ? "Generating..." : currentStep === 3 ? "Generate Tracker" : "Next"}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* ProTip Modal */}
      <Dialog open={showProTip} onOpenChange={setShowProTip}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              ProTip: Real-Time Receipt Automation
            </DialogTitle>
            <DialogDescription>
              Take your expense tracking to the next level with Google Sheets automation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Automated Receipt Processing Setup:
              </h4>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                <li>1. Upload your Excel file to Google Sheets</li>
                <li>2. Create a Google Drive folder called "Receipts"</li>
                <li>3. Use Google Apps Script to auto-log new receipts</li>
                <li>4. Receipts automatically appear in your tracker!</li>
              </ol>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-2">Alternative: Manual Entry</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Or simply open the file weekly and enter expenses manually — it works both ways!
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowProTip(false)}>
                Maybe Later
              </Button>
              <Button 
                onClick={() => {
                  window.open('https://script.google.com/home', '_blank');
                  setShowProTip(false);
                }}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Setup Google Apps Script
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}