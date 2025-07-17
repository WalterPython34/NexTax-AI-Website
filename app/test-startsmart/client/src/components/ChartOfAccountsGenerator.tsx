import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, FileSpreadsheet, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChartOfAccountsGeneratorProps {
  onClose: () => void;
}

export function ChartOfAccountsGenerator({ onClose }: ChartOfAccountsGeneratorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    businessType: "",
    complexityLevel: "",
    trackInventory: false,
    includeStatementMapping: false,
    additionalRequirements: ""
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
    "Professional Services (Legal, Accounting, etc.)",
    "Non-profit Organization",
    "Other"
  ];

  const complexityLevels = [
    { value: "basic", label: "Basic", description: "Essential accounts for small businesses" },
    { value: "standard", label: "Standard", description: "Comprehensive accounts for growing businesses" },
    { value: "advanced", label: "Advanced", description: "Detailed accounts for complex operations" }
  ];

  const handleNext = () => {
    if (currentStep < 2) {
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
      return formData.businessType && formData.complexityLevel;
    }
    return true;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/generate/chart-of-accounts", formData);
      const response = await res.json() as { downloadUrl?: string; document?: any; message?: string };
      
      console.log("Chart generation response:", response); // Debug log
      
      if (response && response.downloadUrl) {
        setDownloadUrl(response.downloadUrl);
        setGeneratedContent("Chart of Accounts generated successfully!");
        setCurrentStep(3);
        
        // Invalidate documents cache to refresh "My Documents"
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        
        toast({
          title: "Chart of Accounts Generated",
          description: "Your customized chart of accounts is ready for download.",
        });
      } else {
        // If no downloadUrl, show error
        console.error("No downloadUrl in response:", response);
        toast({
          title: "Generation Issue",
          description: "Chart generated but download link missing. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Generation failed:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate chart of accounts. Please try again.",
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
      link.download = `Chart_of_Accounts_${formData.businessType.replace(/\s+/g, '_')}_AI_Generated.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Your Chart of Accounts Excel file is downloading.",
      });
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="businessType" className="text-base font-medium">
          What type of business are you starting? *
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
      </div>

      <div>
        <Label className="text-base font-medium">
          Chart of Accounts Complexity Level *
        </Label>
        <div className="mt-3 space-y-3">
          {complexityLevels.map((level) => (
            <Card 
              key={level.value} 
              className={`cursor-pointer transition-colors ${
                formData.complexityLevel === level.value 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                  : 'hover:border-gray-300'
              }`}
              onClick={() => setFormData(prev => ({ ...prev, complexityLevel: level.value }))}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    formData.complexityLevel === level.value 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {formData.complexityLevel === level.value && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{level.label}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{level.description}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="trackInventory"
            checked={formData.trackInventory}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, trackInventory: checked as boolean }))
            }
          />
          <Label htmlFor="trackInventory" className="text-base font-medium">
            Will you track inventory or cost of goods sold?
          </Label>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
          This adds inventory-related accounts like Raw Materials, Work in Progress, and COGS
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="includeStatementMapping"
            checked={formData.includeStatementMapping}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, includeStatementMapping: checked as boolean }))
            }
          />
          <Label htmlFor="includeStatementMapping" className="text-base font-medium">
            Include financial statement mapping column?
          </Label>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
          Shows where each account appears (Income Statement, Balance Sheet, Cash Flow)
        </p>
      </div>

      <div>
        <Label htmlFor="additionalRequirements" className="text-base font-medium">
          Additional Requirements (Optional)
        </Label>
        <Textarea
          id="additionalRequirements"
          placeholder="Any specific accounts you need or industry-specific requirements..."
          value={formData.additionalRequirements}
          onChange={(e) => setFormData(prev => ({ ...prev, additionalRequirements: e.target.value }))}
          className="mt-2 min-h-[100px]"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
        <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Chart of Accounts Generated!
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Your customized {formData.complexityLevel} chart of accounts for {formData.businessType} is ready.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left">
        <h4 className="font-medium mb-2">Customizations Applied:</h4>
        <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
          <li>• Business type: {formData.businessType}</li>
          <li>• Complexity: {formData.complexityLevel}</li>
          {formData.trackInventory && <li>• Inventory tracking enabled</li>}
          {formData.includeStatementMapping && <li>• Financial statement mapping included</li>}
          {formData.additionalRequirements && <li>• Custom requirements applied</li>}
        </ul>
      </div>

      <div className="flex gap-3 justify-center">
        <Button onClick={handleDownload} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Excel File
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>AI Disclaimer:</strong> This chart of accounts is AI-generated for informational purposes only. 
          Please review with your accountant or financial advisor before implementation. 
          <a href="#" className="text-blue-600 hover:underline ml-1">View full disclaimer</a>
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Chart of Accounts Generator
              </CardTitle>
              <CardDescription>
                Create a customized chart of accounts for your business
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((step) => (
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
                {step < 3 && (
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
        </CardContent>

        {currentStep < 3 && (
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
              {isGenerating ? "Generating..." : currentStep === 2 ? "Generate Chart" : "Next"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}