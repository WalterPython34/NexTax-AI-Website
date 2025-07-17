import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ProgressRoadmap } from "@/components/roadmap/progress-roadmap";
import { DocumentCenter } from "@/components/documents/document-center";
import { KnowledgeHub } from "@/components/KnowledgeHub";
import { EnhancedComplianceCenter } from "@/components/compliance/enhanced-compliance-center";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Bolt, Rocket, Users, FileText, TrendingUp, Shield, Zap, Star } from "lucide-react";
import { Logo } from "@/components/ui/logo";

type Section = "home" | "chat" | "roadmap" | "documents" | "knowledge" | "tools" | "compliance";

const StartupTools = () => (
  <div className="flex-1 p-4 lg:p-6">
    <div className="max-w-4xl mx-auto text-center py-20">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
        <Bolt className="h-8 w-8 text-slate-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
        Startup Bolt
      </h2>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        Coming soon - Curated tools and resources for your startup journey.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-4">
            <Settings className="h-6 w-6 text-slate-400 mb-2" />
            <h3 className="font-medium text-slate-900 dark:text-white mb-1">Business Bolt</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Accounting, CRM, and productivity tools</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Bolt className="h-6 w-6 text-slate-400 mb-2" />
            <h3 className="font-medium text-slate-900 dark:text-white mb-1">Development</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Website builders and development platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Settings className="h-6 w-6 text-slate-400 mb-2" />
            <h3 className="font-medium text-slate-900 dark:text-white mb-1">Marketing</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Email marketing and social media tools</p>
          </CardContent>
        </Card>
      </div>
      <Button className="nexTax-gradient text-white mt-6">
        Request Tool Recommendations
      </Button>
    </div>
  </div>
);

const HomePage = () => {
  const features = [
    {
      icon: Zap,
      title: "AI-Powered Guidance",
      description: "Get instant, personalized advice on entity formation, compliance requirements, and business strategy from our advanced AI assistant."
    },
    {
      icon: FileText,
      title: "Document Generation",
      description: "Automatically generate legal documents, business plans, tax forms, and compliance paperwork tailored to your specific business needs."
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Visual roadmap with step-by-step guidance, deadline tracking, and progress monitoring to keep your business launch on track."
    },
    {
      icon: Shield,
      title: "Compliance Assurance",
      description: "Stay compliant with federal and state requirements. Get alerts for filing deadlines, tax obligations, and regulatory changes."
    },
    {
      icon: Users,
      title: "Expert Network",
      description: "Access to vetted professionals including lawyers, accountants, and business consultants when you need specialized help."
    },
    {
      icon: Rocket,
      title: "Launch Acceleration",
      description: "Streamlined workflows and automation tools to help you launch faster, from business formation to first customer acquisition."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      business: "Tech Consulting LLC",
      content: "StartSmart made the complex process of starting my consulting business incredibly simple. The AI guidance was spot-on!",
      rating: 5
    },
    {
      name: "Mike Rodriguez",
      business: "Rodriguez Food Truck",
      content: "From permits to EIN filing, StartSmart guided me through every step. Saved me weeks of research and confusion.",
      rating: 5
    },
    {
      name: "Emma Thompson",
      business: "Creative Design Studio",
      content: "The document generation feature is amazing. Got my operating agreement and business plan done in minutes, not days.",
      rating: 5
    }
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: rating }, (_, i) => (
      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
    ));
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-y-auto">
      {/* Hero Section */}
      <section className="py-12 lg:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <Logo size="xl" className="mx-auto mb-6" />
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
                Your AI Sidekick &
                <br />
                <span className="bg-gradient-to-r from-[hsl(174,73%,53%)] to-[hsl(186,91%,44%)] bg-clip-text text-transparent">
                  LaunchPad
                </span>
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto">
                Navigate every step of starting your business with AI-powered guidance, automated document generation, and comprehensive compliance tracking. From idea to launch in record time.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mb-16">
              <div className="p-4">
                <div className="text-3xl font-bold text-[hsl(174,73%,53%)] mb-1">50+</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">States Supported</div>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold text-[hsl(174,73%,53%)] mb-1">1000+</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Businesses Launched</div>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold text-[hsl(174,73%,53%)] mb-1">24/7</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">AI Support</div>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold text-[hsl(174,73%,53%)] mb-1">100%</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Compliance Ready</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white/50 dark:bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Everything You Need to Start Smart
            </h3>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              From business planning to compliance tracking, StartSmart guides you through every step of your entrepreneurial journey.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 nexTax-gradient rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                    {feature.title}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Trusted by Entrepreneurs
            </h3>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              See what business owners are saying about their StartSmart experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white dark:bg-slate-800">
                <CardContent className="p-6">
                  <div className="flex mb-3">
                    {renderStars(testimonial.rating)}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {testimonial.business}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-[hsl(174,73%,53%)] to-[hsl(186,91%,44%)]">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Business Journey?
          </h3>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of entrepreneurs who've successfully launched their businesses with StartSmart's AI-powered guidance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-[hsl(174,73%,53%)] hover:bg-slate-50 text-lg px-8 py-4 font-semibold"
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              className="bg-[hsl(174,73%,43%)] text-white hover:bg-[hsl(174,73%,38%)] text-lg px-8 py-4 font-semibold"
            >
              Sign up for Pro
            </Button>
            <Button 
              size="lg" 
              className="bg-[hsl(174,73%,38%)] text-white hover:bg-[hsl(174,73%,33%)] text-lg px-8 py-4 font-semibold"
            >
              Sign up for Premium
            </Button>
          </div>
          
          <p className="text-white/80 text-sm mt-4">
            No credit card required • Free forever
          </p>
        </div>
      </section>
    </div>
  );
};

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(174,73%,53%)] mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading StartSmart...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  const renderSection = () => {
    switch (activeSection) {
      case "home":
        return <HomePage />;
      case "chat":
        return <ChatInterface />;
      case "roadmap":
        return <ProgressRoadmap />;
      case "documents":
        return <DocumentCenter />;
      case "knowledge":
        return <KnowledgeHub />;
      case "tools":
        return <StartupTools />;
      case "compliance":
        return <EnhancedComplianceCenter />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 nexTax-gradient rounded-lg flex items-center justify-center">
              <i className="fas fa-rocket text-white text-sm"></i>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">StartSmart</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">by NexTax.AI</p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <i className="fas fa-bars text-sm"></i>
          </button>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          user={user}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {renderSection()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 shadow-xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 nexTax-gradient rounded-xl flex items-center justify-center">
                    <i className="fas fa-rocket text-white"></i>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">StartSmart</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">by NexTax.AI</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <nav className="p-4 space-y-2">
              {[
                { key: "home", icon: "fas fa-home", label: "Home" },
                { key: "chat", icon: "fas fa-comments", label: "AI Chat" },
                { key: "roadmap", icon: "fas fa-route", label: "Progress Roadmap" },
                { key: "documents", icon: "fas fa-file-alt", label: "Document Center" },
                { key: "knowledge", icon: "fas fa-book", label: "Knowledge Hub" },
                { key: "tools", icon: "fas fa-tools", label: "Startup Bolt" },
                { key: "compliance", icon: "fas fa-shield-alt", label: "Compliance" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveSection(item.key as Section);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeSection === item.key
                      ? "nexTax-gradient text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <i className={`${item.icon} w-5`}></i>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
