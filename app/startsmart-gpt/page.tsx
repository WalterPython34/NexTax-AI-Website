"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  Star,
  Zap,
  Shield,
  Smartphone,
  Globe,
  ArrowRight,
  MessageSquare,
  FileText,
  BookOpen,
  Calendar,
  Users,
} from "lucide-react"
import { AuthModal } from "@/components/auth/auth-modal"

export default function StartSmartGPTPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)

  const features = [
    {
      icon: MessageSquare,
      title: "AI Business Sidekick",
      description: "Get expert guidance on business formation, compliance, and growth strategies",
      tiers: ["10 questions/month", "150 questions/month", "Unlimited questions"],
    },
    {
      icon: FileText,
      title: "Smart Document Center",
      description: "Generate legal documents, tax forms, and business plans with AI assistance",
      tiers: ["Download templates", "AI-generated docs", "Premium templates + AI"],
    },
    {
      icon: BookOpen,
      title: "Knowledge Hub",
      description: "Access comprehensive guides, resources, and AI-powered business tools",
      tiers: ["Basic resources", "Advanced guides + 100 AI prompts", "Everything + 250 AI prompts"],
    },
    {
      icon: Calendar,
      title: "Smart Compliance Center",
      description: "Never miss a deadline with personalized tax and compliance tracking",
      tiers: ["Basic tracking", "Advanced notifications", "Full automation + alerts"],
    },
  ]

  const pricingTiers = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for exploring your business idea",
      features: [
        "10 AI questions per month",
        "Basic document templates",
        "Essential business guides",
        "Progress roadmap",
        "Community support",
      ],
      cta: "Start Free",
      popular: false,
      color: "border-gray-200",
    },
    {
      name: "Pro",
      price: "$29",
      period: "per month",
      description: "Ideal for serious entrepreneurs ready to launch",
      features: [
        "150 AI questions per month",
        "AI-generated documents",
        "Advanced business guides",
        "Smart compliance tracking",
        "100+ AI prompt templates",
        "Priority email support",
        "30-day money-back guarantee",
      ],
      cta: "Start Pro Trial",
      popular: true,
      color: "border-emerald-500",
    },
    {
      name: "Premium",
      price: "$79",
      period: "per month",
      description: "For ambitious founders building scalable businesses",
      features: [
        "Unlimited AI questions",
        "Premium document suite",
        "Executive business plans",
        "Full compliance automation",
        "250+ AI prompt templates",
        "1-on-1 expert consultations",
        "White-glove onboarding",
        "Custom integrations",
      ],
      cta: "Start Premium Trial",
      popular: false,
      color: "border-purple-500",
    },
  ]

  const documentTypes = [
    {
      category: "Legal Documents",
      items: [
        { name: "Operating Agreement", free: "Template", pro: "AI Generated", premium: "AI + Expert Review" },
        { name: "Articles of Incorporation", free: "Template", pro: "AI Generated", premium: "AI + Expert Review" },
        { name: "Corporate Bylaws", free: "Template", pro: "AI Generated", premium: "AI + Expert Review" },
      ],
    },
    {
      category: "Tax & Finance",
      items: [
        { name: "SS-4 EIN Form", free: "Blank Form", pro: "AI Questionnaire", premium: "Full Service" },
        { name: "Chart of Accounts", free: "Template", pro: "AI Generated", premium: "Industry Specific" },
        { name: "Budget Template", free: "Basic Template", pro: "AI Customized", premium: "Advanced Forecasting" },
      ],
    },
    {
      category: "Business Plans",
      items: [
        { name: "Executive Summary", free: "Template", pro: "Basic AI", premium: "AI Generated" },
        { name: "Lean Canvas", free: "Template", pro: "Basic AI", premium: "AI Generated" },
        { name: "Full Business Plan", free: "Template", pro: "Basic AI", premium: "AI Generated" },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-20">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-4 bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
              <Star className="mr-1 h-3 w-3" />
              Trusted by 10,000+ entrepreneurs
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              Your AI Business
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                {" "}
                Success Partner
              </span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
              From idea to IPO - StartSmart GPT guides you through every step of building a successful business. Get
              expert advice, generate documents, and stay compliant with AI-powered precision.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg"
                onClick={() => setShowAuthModal(true)}
              >
                Try StartSmart GPT Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg bg-transparent">
                Watch Demo
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Big 4 Expertise</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" />
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <span>10,000+ Users</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to build a successful business
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Four powerful tools working together to accelerate your entrepreneurial journey
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-emerald-100 p-3">
                      <feature.icon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="mt-1">{feature.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {feature.tiers.map((tier, tierIndex) => (
                      <div
                        key={tierIndex}
                        className={`rounded-lg p-3 text-center ${
                          tierIndex === 0
                            ? "bg-gray-50 text-gray-600"
                            : tierIndex === 1
                              ? "bg-emerald-50 text-emerald-700 font-medium"
                              : "bg-purple-50 text-purple-700 font-medium"
                        }`}
                      >
                        {tier}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Document Center Showcase */}
      <section className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Smart Document Generation</h2>
            <p className="mt-4 text-lg text-gray-600">
              From templates to AI-generated documents, we've got every business document you need
            </p>
          </div>

          <div className="space-y-12">
            {documentTypes.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  {category.category}
                </h3>
                <div className="grid gap-4">
                  {category.items.map((item, itemIndex) => (
                    <Card key={itemIndex} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-center">
                            <Badge variant="outline" className="text-gray-600">
                              {item.free}
                            </Badge>
                          </div>
                          <div className="text-center">
                            <Badge className="bg-emerald-100 text-emerald-800">{item.pro}</Badge>
                          </div>
                          <div className="text-center">
                            <Badge className="bg-purple-100 text-purple-800">{item.premium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Choose your success plan</h2>
            <p className="mt-4 text-lg text-gray-600">Start free and upgrade as your business grows</p>
          </div>
          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
            {pricingTiers.map((tier, index) => (
              <Card
                key={index}
                className={`relative ${tier.color} ${tier.popular ? "ring-2 ring-emerald-500 scale-105" : ""}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-gray-600">/{tier.period}</span>
                  </div>
                  <CardDescription className="mt-2">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full mt-8 ${tier.popular ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                    variant={tier.popular ? "default" : "outline"}
                    onClick={() => setShowAuthModal(true)}
                  >
                    {tier.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Center Preview */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Never Miss a Deadline Again</h2>
            <p className="mt-4 text-lg text-gray-600">
              Smart Compliance Center tracks all your business obligations automatically
            </p>
          </div>

          <Card className="max-w-4xl mx-auto overflow-hidden shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Smart Compliance Center
              </CardTitle>
              <CardDescription className="text-emerald-100">
                Automated compliance tracking with state-specific deadlines
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">0</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">2</div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">11</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <div className="text-sm text-gray-600">Overdue</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <div className="font-medium text-gray-900">Federal Estimated Tax Payment - Q3</div>
                    <div className="text-sm text-gray-600">Due 9/14/2025</div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <div className="font-medium text-gray-900">Articles of Organization Filing</div>
                    <div className="text-sm text-gray-600">State registration</div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Platform Availability */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Available Everywhere You Work
            </h2>
            <p className="mt-4 text-lg text-gray-600">Access StartSmart GPT on web, iOS, and Android</p>
          </div>
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 lg:grid-cols-3">
            <Card className="text-center">
              <CardHeader>
                <Globe className="h-12 w-12 text-emerald-600 mx-auto" />
                <CardTitle>Web App</CardTitle>
                <CardDescription>Full-featured web application</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setShowAuthModal(true)}>
                  Launch Web App
                </Button>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <Smartphone className="h-12 w-12 text-blue-600 mx-auto" />
                <CardTitle>iOS App</CardTitle>
                <CardDescription>Coming soon to App Store</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent" disabled>
                  Download iOS App
                </Button>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <Smartphone className="h-12 w-12 text-green-600 mx-auto" />
                <CardTitle>Android App</CardTitle>
                <CardDescription>Coming soon to Google Play</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent" disabled>
                  Download Android App
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-blue-600">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to build your dream business?
          </h2>
          <p className="mt-4 text-xl text-emerald-100">
            Join thousands of entrepreneurs who trust StartSmart GPT to guide their success
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button
              size="lg"
              className="bg-white text-emerald-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
              onClick={() => setShowAuthModal(true)}
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-emerald-200">No credit card required • 30-day money-back guarantee</p>
        </div>
      </section>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} mode="signup" source="startsmart-gpt" />
    </div>
  )
}
