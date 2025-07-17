import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/useAuth";
import { Rocket, Users, FileText, TrendingUp, Shield, Zap, Star } from "lucide-react";

export default function Landing() {
  const { login } = useAuth();
  
  // Debug info for testing
  const isDevelopment = import.meta.env.DEV;
  const isCustomDomain = window.location.hostname === 'startsmart.nextax.ai';

  const handleLogin = () => {
    login();
  };

  const handleAuthTest = () => {
    if (isCustomDomain) {
      // On custom domain, show auth test info in modal/alert instead of navigation
      alert(`Custom Domain Auth Test:\nDomain: ${window.location.hostname}\nThis would redirect to working domain for authentication`);
    } else {
      // On regular domain, use normal navigation
      window.location.href = '/auth-test';
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Logo size="md" />
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">StartSmart</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">by NexTax.AI</p>
              </div>
            </div>
            <Button onClick={handleLogin} className="nexTax-gradient text-white hover:shadow-lg">
              Get Started Free
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
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
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                onClick={handleLogin} 
                className="nexTax-gradient text-white hover:shadow-xl text-lg px-8 py-4"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Launch Your Business
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-slate-300 dark:border-slate-600 text-lg px-8 py-4"
                onClick={handleAuthTest}
              >
                {isCustomDomain ? 'Test Custom Domain Auth' : 'Watch Demo'}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
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
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Everything You Need to Start Smart
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              From business planning to compliance tracking, StartSmart guides you through every step of your entrepreneurial journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-br from-[hsl(174,73%,53%)] to-[hsl(186,91%,44%)] rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-slate-900 dark:text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-300">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Trusted by Entrepreneurs
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              See what business owners are saying about their StartSmart experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center mb-3">
                    {renderStars(testimonial.rating)}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{testimonial.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{testimonial.business}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[hsl(174,73%,53%)] to-[hsl(186,91%,44%)]">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Start Your Business Journey?
            </h3>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of entrepreneurs who've successfully launched their businesses with StartSmart's AI-powered guidance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleLogin}
                className="bg-white text-[hsl(174,73%,53%)] hover:bg-slate-100 text-lg px-8 py-4 font-semibold"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Get Started Free
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-[hsl(174,73%,53%)] text-lg px-8 py-4"
              >
                Schedule Demo
              </Button>
            </div>
            <p className="text-white/80 text-sm mt-6">
              No credit card required • Free forever plan available
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <Logo size="sm" />
              <div>
                <h4 className="font-bold">StartSmart</h4>
                <p className="text-sm text-slate-400">by NexTax.AI</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-slate-400 text-sm">
                © 2024 NexTax.AI. All rights reserved.
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Powered by OpenAI GPT-4o
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
