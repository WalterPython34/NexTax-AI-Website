import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Eye, Download, Clock, TrendingUp, DollarSign, ChartGantt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function KnowledgeHub() {
  const { toast } = useToast();
  const [showLLCGuideReader, setShowLLCGuideReader] = useState(false);
  const [llcGuideContent, setLLCGuideContent] = useState('');

  const fetchLLCGuideContent = async () => {
    try {
      const response = await fetch('/api/download/llc-vs-corporation-guide');
      const content = await response.text();
      setLLCGuideContent(content);
      setShowLLCGuideReader(true);
    } catch (error) {
      console.error('Failed to fetch LLC vs Corporation guide:', error);
      toast({
        title: "Error",
        description: "Failed to load LLC vs Corporation guide",
        variant: "destructive",
      });
    }
  };

  const downloadLLCGuide = () => {
    fetch('/api/download/llc-vs-corporation-guide')
      .then(response => response.text())
      .then(content => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'LLC_vs_Corporation_Complete_Guide.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Failed to download:', error);
        toast({
          title: "Error",
          description: "Failed to download LLC vs Corporation guide",
          variant: "destructive",
        });
      });
  };

  const featuredResources = [
    {
      key: "llc_vs_corporation",
      title: "LLC vs Corporation: Complete Guide",
      description: "Understand the key differences and choose the right entity structure for your business",
      category: "Essential",
      readTime: "8 min read",
      color: "bg-green-100 dark:bg-green-900/30",
      textColor: "text-green-600 dark:text-green-400",
      action: "read_guide"
    },
    {
      key: "tax_setup",
      title: "Tax Setup for New Businesses",
      description: "Step-by-step guide to EIN application, tax elections, and compliance requirements",
      category: "Financial",
      readTime: "12 min read",
      color: "bg-blue-100 dark:bg-blue-900/30",
      textColor: "text-blue-600 dark:text-blue-400",
      action: "read_guide"
    },
    {
      key: "market_research",
      title: "Market Research Essentials",
      description: "Learn how to validate your business idea and understand your target market",
      category: "Strategy",
      readTime: "15 min read",
      color: "bg-purple-100 dark:bg-purple-900/30",
      textColor: "text-purple-600 dark:text-purple-400",
      action: "read_guide"
    }
  ];

  const categories = [
    {
      title: "Legal & Formation",
      description: "Entity selection, legal documents, and compliance requirements",
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
      count: 12
    },
    {
      title: "Tax & Finance",
      description: "Tax strategies, financial planning, and accounting best practices",
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      count: 8
    },
    {
      title: "Business Strategy",
      description: "Market research, business planning, and growth strategies",
      icon: ChartGantt,
      color: "text-purple-600 dark:text-purple-400",
      count: 15
    }
  ];

  const handleResourceAction = (resource: any) => {
    if (resource.key === "llc_vs_corporation") {
      fetchLLCGuideContent();
    } else {
      // For other resources, show coming soon message
      toast({
        title: "Coming Soon",
        description: `${resource.title} will be available soon!`,
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Essential":
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case "Financial":
        return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
      case "Strategy":
        return <div className="w-2 h-2 bg-purple-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-slate-500 rounded-full"></div>;
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
            Knowledge Hub
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Expert guides and resources to help you launch and grow your business
          </p>
        </div>

        {/* Featured Resources */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">
            Featured Resources
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredResources.map((resource) => (
              <Card key={resource.key} className="group hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(resource.category)}
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {resource.category}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-slate-500 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>{resource.readTime}</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg leading-snug">
                    {resource.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
                    {resource.description}
                  </CardDescription>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleResourceAction(resource)}
                      variant="default"
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Read Guide
                    </Button>
                    {resource.key === "llc_vs_corporation" && (
                      <Button
                        onClick={downloadLLCGuide}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Browse by Category */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">
            Browse by Category
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card key={category.title} className="group hover:shadow-md transition-all duration-200 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg bg-slate-100 dark:bg-slate-800 ${category.color}`}>
                      <category.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">
                        {category.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">
                        {category.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {category.count} resources
                        </span>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Browse →
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* LLC vs Corporation Guide Reader */}
        <Dialog open={showLLCGuideReader} onOpenChange={setShowLLCGuideReader}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>LLC vs Corporation: Complete Guide</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadLLCGuide}
                  className="ml-4"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogTitle>
              <DialogDescription>
                Comprehensive guide to choosing the right business entity structure
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              <div className="prose prose-slate dark:prose-invert max-w-none p-6">
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6', fontFamily: 'system-ui, sans-serif' }}>
                  {llcGuideContent}
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 border-t pt-4 pb-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Essential guide for choosing between LLC and S Corporation structures.
                </p>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={downloadLLCGuide}
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Guide
                  </Button>
                  <Button 
                    variant="default"
                    onClick={() => setShowLLCGuideReader(false)}
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}