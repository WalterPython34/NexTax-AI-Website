import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { X, ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface LeanCanvasGeneratorProps {
  onClose: () => void;
}

export function LeanCanvasGenerator({ onClose }: LeanCanvasGeneratorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for 9 Lean Canvas blocks
  const [formData, setFormData] = useState({
    problem: "",
    customerSegments: "",
    uniqueValueProposition: "",
    solution: "",
    channels: "",
    revenueStreams: "",
    costStructure: "",
    keyMetrics: "",
    unfairAdvantage: ""
  });

  const steps = [
    {
      title: "Problem",
      description: "What top 1-3 problems does your startup solve?",
      field: "problem" as keyof typeof formData,
      placeholder: "e.g., Small business owners struggle with understanding compliance requirements..."
    },
    {
      title: "Customer Segments", 
      description: "Who are your target customers (personas)?",
      field: "customerSegments" as keyof typeof formData,
      placeholder: "e.g., Aspiring entrepreneurs, startup founders, freelancers launching LLCs..."
    },
    {
      title: "Unique Value Proposition",
      description: "Your clear, compelling statement of differentiation.",
      field: "uniqueValueProposition" as keyof typeof formData,
      placeholder: "e.g., An AI-powered launch assistant providing personalized compliance, legal, and business tools in one place..."
    },
    {
      title: "Solution",
      description: "Outline of the core solution to each problem.",
      field: "solution" as keyof typeof formData,
      placeholder: "e.g., Automated document creation, state-specific compliance roadmaps, integrated AI chat support..."
    },
    {
      title: "Channels",
      description: "How you reach your customers (marketing/sales).",
      field: "channels" as keyof typeof formData,
      placeholder: "e.g., Content marketing, Google Ads, affiliate partners, organic social media..."
    },
    {
      title: "Revenue Streams",
      description: "How does your business make money?",
      field: "revenueStreams" as keyof typeof formData,
      placeholder: "e.g., Monthly subscription plans, EIN filing upsell, premium document services..."
    },
    {
      title: "Cost Structure",
      description: "What are your biggest costs (fixed/variable)?",
      field: "costStructure" as keyof typeof formData,
      placeholder: "e.g., Software development, marketing & advertising, customer support..."
    },
    {
      title: "Key Metrics",
      description: "What are your key success metrics?",
      field: "keyMetrics" as keyof typeof formData,
      placeholder: "e.g., User activation rate, monthly recurring revenue (MRR), churn rate, conversion from free to paid..."
    },
    {
      title: "Unfair Advantage",
      description: "What can't easily be copied or bought?",
      field: "unfairAdvantage" as keyof typeof formData,
      placeholder: "e.g., AI integrations tailored to state-specific startup rules + bundled legal/tax automation no competitor offers..."
    }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/generate-lean-canvas", formData);
      const response = await res.json() as { downloadUrl?: string; document?: any; message?: string };
      
      if (response && response.document) {
        setDownloadUrl(response.downloadUrl || '');
        setGeneratedContent(response.document.content || "Lean Canvas generated successfully!");
        setCurrentStep(10); // Final step
        
        // Invalidate documents cache to refresh "My Documents"
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        
        toast({
          title: "Lean Canvas Generated",
          description: "Your business model canvas is ready for download.",
        });
      } else {
        console.error("No downloadUrl in response:", response);
        toast({
          title: "Generation Issue",
          description: "Canvas generated but download link missing. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Generation failed:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate Lean Canvas. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 9) {
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

  const handleDownload = (format: 'txt' | 'pdf' = 'txt') => {
    const businessName = formData.customerSegments ? 
      formData.customerSegments.split(' ')[0] : 'Business';
    const fileName = `${businessName}_Lean_Canvas`;
    
    if (format === 'txt') {
      const blob = new Blob([generatedContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.txt`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "Your Lean Canvas is downloading as a text file.",
      });
    } else if (format === 'pdf') {
      // Open print dialog for PDF generation
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${fileName}</title>
            <style>
              body { 
                font-family: 'Times New Roman', serif; 
                line-height: 1.6; 
                margin: 1in; 
                font-size: 11pt; 
                color: black; 
              }
              .header { 
                text-align: center; 
                font-weight: bold; 
                margin-bottom: 30px; 
                font-size: 16pt; 
                border-bottom: 2px solid #333;
                padding-bottom: 10px;
              }
              .content { 
                white-space: pre-line; 
                text-align: justify;
              }
              @media print {
                body { margin: 0.5in; }
                .header { page-break-after: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">${businessName} - Lean Canvas</div>
            <div class="content">${generatedContent}</div>
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
      
      toast({
        title: "PDF Ready",
        description: "Use your browser's print dialog to save as PDF.",
      });
    }
  };

  const isStepValid = () => {
    if (currentStep <= 9) {
      const currentField = steps[currentStep - 1].field;
      return formData[currentField].trim().length > 0;
    }
    return true;
  };

  const renderStep = () => {
    if (currentStep <= 9) {
      const step = steps[currentStep - 1];
      return (
        <div className="space-y-6">
          <div>
            <Label htmlFor={step.field} className="text-base font-medium">
              {step.title} *
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">
              {step.description}
            </p>
            <Textarea
              id={step.field}
              placeholder={step.placeholder}
              value={formData[step.field]}
              onChange={(e) => setFormData(prev => ({ ...prev, [step.field]: e.target.value }))}
              className="min-h-[120px]"
            />
          </div>
        </div>
      );
    }
    
    // Final step - generation complete
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <Download className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Lean Canvas Generated!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your one-page business model canvas is ready for download and review.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>📋 Your Lean Canvas includes:</strong><br/>
            ✓ Problem identification and customer segments<br/>
            ✓ Value proposition and solution overview<br/>
            ✓ Revenue model and cost structure<br/>
            ✓ Key metrics and competitive advantages
          </p>
        </div>

        {generatedContent && generatedContent !== "Lean Canvas generated successfully!" && (
          <div className="space-y-3">
            <div className="flex space-x-3">
              <Button
                onClick={() => handleDownload('txt')}
                variant="outline"
                className="flex items-center space-x-2 flex-1"
              >
                <Download className="h-4 w-4" />
                <span>Download TXT</span>
              </Button>
              <Button
                onClick={() => handleDownload('pdf')}
                variant="outline"
                className="flex items-center space-x-2 flex-1"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF</span>
              </Button>
            </div>
          </div>
        )}

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>⚠️ AI-Generated Business Model:</strong> This canvas provides a foundation for your business model. Review and refine each section based on market research, customer feedback, and professional advice.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Lean Canvas Generator
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {currentStep <= 9 ? `Step ${currentStep} of 9: ${steps[currentStep - 1]?.title}` : "Generation Complete"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {renderStep()}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || currentStep === 10}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep <= 9 && (
            <Button
              onClick={handleNext}
              disabled={!isStepValid() || isGenerating}
            >
              {isGenerating ? (
                "Generating..."
              ) : currentStep === 9 ? (
                "Generate Canvas"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}

          {currentStep === 10 && (
            <Button onClick={onClose}>
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}