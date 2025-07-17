import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Lightbulb, 
  Users, 
  Map, 
  Building, 
  Award, 
  Handshake,
  ChevronRight,
  ExternalLink
} from "lucide-react";

export function KnowledgeHub() {
  const [searchQuery, setSearchQuery] = useState("");

  const featuredResources = [
    {
      title: "LLC vs Corporation: Complete Guide",
      description: "Understand the key differences and choose the right entity structure for your business.",
      category: "Essential",
      categoryColor: "bg-[hsl(174,73%,53%)] text-white",
      readTime: "8 min read",
      completed: false,
      personalizationTags: ["LLC-specific", "Entity Formation"],
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=200",
    },
    {
      title: "Tax Setup for New Businesses",
      description: "Step-by-step guide to EIN application, tax elections, and compliance requirements.",
      category: "Financial",
      categoryColor: "bg-green-500 text-white",
      readTime: "12 min read",
      completed: true,
      personalizationTags: ["Tax Planning", "Small Business"],
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=200",
    },
    {
      title: "Market Research Essentials",
      description: "Learn how to validate your business idea and understand your target market.",
      category: "Strategy",
      categoryColor: "bg-purple-500 text-white",
      readTime: "15 min read",
      completed: false,
      personalizationTags: ["Market Analysis", "Service Business"],
      image: "https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=200",
    },
  ];

  const knowledgeCategories = [
    {
      title: "Getting Started",
      articles: [
        { icon: Lightbulb, title: "Business Idea Validation", color: "text-amber-500" },
        { icon: Users, title: "Finding Co-founders", color: "text-blue-500" },
        { icon: Map, title: "Business Model Canvas", color: "text-green-500" },
      ],
    },
    {
      title: "Legal & Compliance",
      articles: [
        { icon: Building, title: "Entity Formation Guide", color: "text-[hsl(174,73%,53%)]" },
        { icon: Award, title: "Licenses & Permits", color: "text-purple-500" },
        { icon: Handshake, title: "Contracts & Agreements", color: "text-orange-500" },
      ],
    },
  ];

  const externalResources = [
    { title: "IRS Small Business Resources", url: "https://www.irs.gov/businesses/small-businesses-self-employed" },
    { title: "SBA Startup Guide", url: "https://www.sba.gov/business-guide" },
    { title: "SCORE Business Mentors", url: "https://www.score.org/" },
    { title: "Census Business Data", url: "https://www.census.gov/programs-surveys/abs.html" },
  ];

  return (
    <section className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Knowledge Hub</h2>
          <p className="text-slate-600 dark:text-slate-300">Comprehensive guides and resources for startup success</p>
          
          {/* Progress Overview */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-8 bg-green-500 rounded"></div>
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">Guides Completed</p>
                    <p className="text-xl font-bold text-green-900 dark:text-green-100">1 of 3</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-8 bg-blue-500 rounded"></div>
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Recommended for You</p>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">2 guides</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-8 bg-purple-500 rounded"></div>
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300">Learning Streak</p>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100">3 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search guides, articles, and resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        {/* Featured Resources */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Featured Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredResources.map((resource, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700 relative">
                  <img
                    src={resource.image}
                    alt={resource.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <div className="text-slate-400 text-4xl">📊</div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={resource.categoryColor}>{resource.category}</Badge>
                    {resource.completed && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        ✓ Completed
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{resource.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                    {resource.description}
                  </p>
                  
                  {/* Personalization Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {resource.personalizationTags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{resource.readTime}</span>
                    <Button variant="ghost" size="sm" className="text-[hsl(174,73%,53%)] hover:text-[hsl(165,93%,38%)]">
                      {resource.completed ? "Review Guide" : "Read Guide"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Knowledge Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {knowledgeCategories.map((category, index) => (
            <div key={index}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{category.title}</h3>
              <div className="space-y-3">
                {category.articles.map((article, articleIndex) => (
                  <Button
                    key={articleIndex}
                    variant="ghost"
                    className="w-full justify-between px-4 py-3 h-auto border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <div className="flex items-center space-x-3">
                      <article.icon className={`h-5 w-5 ${article.color}`} />
                      <span className="text-slate-900 dark:text-white">{article.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* External Resources */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">External Resources</h3>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {externalResources.map((resource, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="justify-between px-4 py-3 h-auto"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    <span className="text-slate-900 dark:text-white">{resource.title}</span>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <Card className="border-[hsl(174,73%,53%)] bg-gradient-to-r from-[hsl(174,73%,53%)]/5 to-[hsl(186,91%,44%)]/5">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Need Personalized Help?
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Our AI assistant can provide tailored guidance based on your specific business needs.
              </p>
              <Button className="nexTax-gradient text-white">
                Ask AI Assistant
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
