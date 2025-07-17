import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, CreditCard, Users, BarChart3, Globe, Mail, ExternalLink, Star } from "lucide-react";

const toolCategories = [
  {
    title: "Financial Management",
    icon: Calculator,
    color: "emerald",
    tools: [
      {
        name: "QuickBooks Online",
        description: "Comprehensive accounting and bookkeeping software",
        rating: 4.5,
        pricing: "From $15/month",
        features: ["Invoicing", "Expense Tracking", "Tax Preparation"],
        url: "https://quickbooks.intuit.com/"
      },
      {
        name: "Stripe",
        description: "Online payment processing for businesses",
        rating: 4.7,
        pricing: "2.9% + 30¢ per transaction",
        features: ["Online Payments", "Subscriptions", "Global Reach"],
        url: "https://stripe.com/"
      },
      {
        name: "Wave Accounting",
        description: "Free accounting software for small businesses",
        rating: 4.2,
        pricing: "Free",
        features: ["Invoicing", "Accounting", "Receipt Scanning"],
        url: "https://waveapps.com/"
      }
    ]
  },
  {
    title: "Team & Communication",
    icon: Users,
    color: "blue",
    tools: [
      {
        name: "Slack",
        description: "Team communication and collaboration platform",
        rating: 4.4,
        pricing: "Free plan available",
        features: ["Messaging", "File Sharing", "App Integrations"],
        url: "https://slack.com/"
      },
      {
        name: "Zoom",
        description: "Video conferencing and online meetings",
        rating: 4.3,
        pricing: "Free plan available",
        features: ["Video Calls", "Screen Sharing", "Recording"],
        url: "https://zoom.us/"
      },
      {
        name: "Asana",
        description: "Project management and task tracking",
        rating: 4.5,
        pricing: "Free for teams up to 15",
        features: ["Task Management", "Project Tracking", "Team Collaboration"],
        url: "https://asana.com/"
      }
    ]
  },
  {
    title: "Marketing & Analytics",
    icon: BarChart3,
    color: "purple",
    tools: [
      {
        name: "Google Analytics",
        description: "Web analytics and performance tracking",
        rating: 4.6,
        pricing: "Free",
        features: ["Traffic Analysis", "User Behavior", "Conversion Tracking"],
        url: "https://analytics.google.com/"
      },
      {
        name: "Mailchimp",
        description: "Email marketing and automation platform",
        rating: 4.2,
        pricing: "Free plan available",
        features: ["Email Campaigns", "Automation", "Analytics"],
        url: "https://mailchimp.com/"
      },
      {
        name: "Canva",
        description: "Graphic design and visual content creation",
        rating: 4.7,
        pricing: "Free plan available",
        features: ["Templates", "Brand Kit", "Social Media Graphics"],
        url: "https://canva.com/"
      }
    ]
  },
  {
    title: "Website & E-commerce",
    icon: Globe,
    color: "orange",
    tools: [
      {
        name: "Shopify",
        description: "Complete e-commerce platform for online stores",
        rating: 4.4,
        pricing: "From $29/month",
        features: ["Online Store", "Payment Processing", "Inventory Management"],
        url: "https://shopify.com/"
      },
      {
        name: "WordPress",
        description: "Website building and content management",
        rating: 4.3,
        pricing: "Free (hosting required)",
        features: ["Customizable", "SEO Friendly", "Plugin Ecosystem"],
        url: "https://wordpress.org/"
      },
      {
        name: "Squarespace",
        description: "Website builder with professional templates",
        rating: 4.2,
        pricing: "From $12/month",
        features: ["Templates", "Drag & Drop", "Built-in SEO"],
        url: "https://squarespace.com/"
      }
    ]
  }
];

const recommendedSetups = [
  {
    title: "Service Business Starter",
    description: "Perfect for consultants, freelancers, and service providers",
    tools: ["QuickBooks Online", "Zoom", "Mailchimp", "WordPress"],
    totalCost: "~$50/month",
    popularity: "Most Popular"
  },
  {
    title: "E-commerce Essentials",
    description: "Everything you need to start selling products online",
    tools: ["Shopify", "Stripe", "Google Analytics", "Canva"],
    totalCost: "~$45/month",
    popularity: "Trending"
  },
  {
    title: "Tech Startup Bundle",
    description: "Advanced tools for technology and SaaS companies",
    tools: ["Stripe", "Slack", "Asana", "Google Analytics"],
    totalCost: "~$35/month",
    popularity: "For Growth"
  }
];

export function StartupTools() {
  const handleToolClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" size={12} className="fill-yellow-400 text-yellow-400 opacity-50" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} size={12} className="text-slate-300" />);
    }

    return stars;
  };

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Startup Tools</h2>
          <p className="text-slate-600 dark:text-slate-300">Recommended software and services to run your business efficiently</p>
        </div>

        {/* Recommended Setups */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recommended Setups</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedSetups.map((setup, index) => (
              <Card key={index} className="relative overflow-hidden">
                {setup.popularity && (
                  <div className="absolute top-2 right-2">
                    <Badge className="nexTax-gradient text-white text-xs">
                      {setup.popularity}
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-base">{setup.title}</CardTitle>
                  <CardDescription>{setup.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Includes:</p>
                      <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        {setup.tools.map((tool, toolIndex) => (
                          <li key={toolIndex}>• {tool}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          Starting at {setup.totalCost}
                        </span>
                        <Button size="sm" className="nexTax-gradient text-white">
                          Get Started
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tool Categories */}
        <div className="space-y-8">
          {toolCategories.map((category) => (
            <div key={category.title}>
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  category.color === "emerald" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                  category.color === "blue" ? "bg-blue-100 dark:bg-blue-900/30" :
                  category.color === "purple" ? "bg-purple-100 dark:bg-purple-900/30" :
                  "bg-orange-100 dark:bg-orange-900/30"
                }`}>
                  <category.icon className={`${
                    category.color === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
                    category.color === "blue" ? "text-blue-600 dark:text-blue-400" :
                    category.color === "purple" ? "text-purple-600 dark:text-purple-400" :
                    "text-orange-600 dark:text-orange-400"
                  }`} size={20} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{category.title}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.tools.map((tool, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{tool.name}</CardTitle>
                          <div className="flex items-center space-x-1 mt-1">
                            {renderStars(tool.rating)}
                            <span className="text-xs text-slate-500 ml-1">({tool.rating})</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToolClick(tool.url)}
                          className="p-1"
                        >
                          <ExternalLink size={14} />
                        </Button>
                      </div>
                      <CardDescription className="text-sm">{tool.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {tool.pricing}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Key Features:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {tool.features.map((feature, featureIndex) => (
                              <Badge key={featureIndex} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleToolClick(tool.url)}
                        >
                          Learn More
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Help Card */}
        <Card className="mt-8 bg-gradient-to-r from-slate-50 to-emerald-50 dark:from-slate-800 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 nexTax-gradient rounded-xl flex items-center justify-center">
                <Users className="text-white" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  Need Help Choosing Tools?
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  Our AI assistant can recommend the perfect tool stack based on your specific business needs and budget.
                </p>
              </div>
              <Button className="nexTax-gradient text-white">
                Get Recommendations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
