"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Bot,
  FileText,
  Calculator,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Globe,
  BarChart3,
  Target,
  Lightbulb,
} from "lucide-react"
import Link from "next/link"

export default function FeaturesPage() {
  const coreFeatures = [
    {
      icon: Bot,
      title: "AI-Powered Tax Copilot",
      description: "Advanced AI assistant trained on 20+ years of Big 4 tax expertise",
      features: [
        "Natural language queries",
        "Context-aware responses",
        "Multi-jurisdictional knowledge",
        "Real-time updates",
      ],
      color: "emerald",
    },
    {
      icon: FileText,
      title: "Automated Document Generation",
      description: "Generate complex tax documents and compliance forms instantly",
      features: ["Smart form filling", "Multi-state compliance", "Version control", "Audit trails"],
      color: "blue",
    },
    {
      icon: Calculator,
      title: "Advanced Tax Calculations",
      description: "Sophisticated calculation engines for complex tax scenarios",
      features: ["Multi-entity structures", "International tax", "Transfer pricing", "State nexus analysis"],
      color: "purple",
    },
    {
      icon: Shield,
      title: "Compliance Management",
      description: "Never miss a deadline with intelligent compliance tracking",
      features: ["Automated reminders", "Regulatory updates", "Risk assessment", "Audit preparation"],
      color: "orange",
    },
  ]

  const integrations = [
    {
      name: "QuickBooks",
      description: "AI-powered sync of financial records, bookkeeping triggers, and automated tax categorization",
      logo: "📊",
    },
    {
      name: "DocuSign",
      description: "Integrated signature workflows for EIN filings, agreements, and compliance docs",
      logo: "✍️",
    },
    {
      name: "Slack",
      description: "Real-time updates from tax filings, document approvals, and team alerts",
      logo: "💬",
    },
    {
      name: "Salesforce",
      description: "Sync client data for compliance workflows and onboarding automation",
      logo: "☁️",
    },
    {
      name: "Microsoft 365",
      description: "Intelligent document collaboration + calendar-based tax reminders",
      logo: "📅",
    },
    {
      name: "Zapier",
      description: "5,000+ integrations with tailored GPT flows for finance, CRM, HR & more",
      logo: "⚡",
    },
  ]

  const advancedFeatures = [
    {
      icon: BarChart3,
      title: "Transfer Pricing Compliance GPT",
      description: "AI-powered transfer pricing documentation and compliance management",
      badge: "Enterprise",
    },
    {
      icon: Globe,
      title: "State Tax Nexus GPT",
      description: "Intelligent multi-state tax nexus analysis and compliance tracking",
      badge: "Pro",
    },
    {
      icon: Target,
      title: "Tax Planning Optimizer",
      description: "Advanced AI-driven tax planning and optimization strategies",
      badge: "Pro",
    },
    {
      icon: Lightbulb,
      title: "Research Assistant GPT",
      description: "AI-powered tax research with real-time regulatory updates",
      badge: "Enterprise",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-transparent to-blue-900/20" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-6 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              <Zap className="mr-2 h-4 w-4" />
              Advanced AI Features
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Powerful Features for
              <span className="block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Modern Tax Teams
              </span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-slate-300 max-w-3xl mx-auto">
              Discover how our AI-powered platform revolutionizes tax workflows, business formation, and compliance
              management with cutting-edge technology.
            </p>
          </div>
        </div>
      </section>

      {/* NexTax Logo Section */}
      <section className="py-20 bg-slate-800/50">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <div className="mb-12">
            <img src="/images/nextax-logo-large-new.png" alt="NexTax.AI" className="h-64 w-auto mx-auto mb-8" />
            <h2 className="text-3xl font-bold text-white mb-4">Scale Your Business with Advanced AI Tax Solutions</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              As your business grows, access our full suite of specialized AI-powered tax and compliance tools designed
              for complex business needs.
            </p>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Core AI Features</h2>
            <p className="mt-4 text-lg text-slate-300">
              Powerful AI-driven tools that transform how you handle tax and compliance work
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {coreFeatures.map((feature, index) => (
              <Card
                key={index}
                className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-lg p-3 ${
                        feature.color === "emerald"
                          ? "bg-emerald-500/20"
                          : feature.color === "blue"
                            ? "bg-blue-500/20"
                            : feature.color === "purple"
                              ? "bg-purple-500/20"
                              : "bg-orange-500/20"
                      }`}
                    >
                      <feature.icon
                        className={`h-8 w-8 ${
                          feature.color === "emerald"
                            ? "text-emerald-400"
                            : feature.color === "blue"
                              ? "text-blue-400"
                              : feature.color === "purple"
                                ? "text-purple-400"
                                : "text-orange-400"
                        }`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                      <CardDescription className="mt-1 text-slate-300">{feature.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.features.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 bg-slate-800/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Specialized AI Tools</h2>
            <p className="mt-4 text-lg text-slate-300">
              Advanced AI assistants for complex tax and compliance scenarios
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {advancedFeatures.map((feature, index) => (
              <Card
                key={index}
                className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <feature.icon className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-white">{feature.title}</CardTitle>
                        <CardDescription className="text-slate-400">{feature.description}</CardDescription>
                      </div>
                    </div>
                    <Badge
                      className={
                        feature.badge === "Enterprise"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                          : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                      }
                    >
                      {feature.badge}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Seamless Integrations</h2>
            <p className="mt-4 text-lg text-slate-300">
              Connect with your existing tools and workflows for maximum efficiency
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration, index) => (
              <Card
                key={index}
                className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{integration.logo}</div>
                    <div>
                      <CardTitle className="text-lg text-white">{integration.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-300">{integration.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-cyan-600">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Transform Your Tax Workflow?
          </h2>
          <p className="mt-4 text-xl text-emerald-100">
            Experience the power of AI-driven tax and compliance management
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/startsmart-gpt">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
                Try StartSmart GPT
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 px-8 py-4 text-lg bg-transparent"
              >
                View Pricing
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-emerald-200">Start your free trial • No credit card required</p>
        </div>
      </section>
    </div>
  )
}
