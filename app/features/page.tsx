import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Bot,
  Zap,
  Shield,
  FileText,
  Calculator,
  Building2,
  CheckCircle,
  Clock,
  DollarSign,
  Globe,
  TrendingUp,
 } from "lucide-react"
import Link from "next/link"

export default function FeaturesPage() {
  const features = [
    {
      icon: Bot,
      title: "Custom Tax GPTs",
      description:
        "AI assistants trained specifically for tax scenarios, business formation, and compliance requirements.",
      benefits: ["24/7 availability", "Expert-level knowledge", "Personalized responses", "Multi-language support"],
      color: "emerald",
    },
    {
      icon: Zap,
      title: "Automated Workflows",
      description: "Streamlined processes that handle complex tax operations and business formation automatically.",
      benefits: ["Reduce manual work by 90%", "Error-free processing", "Real-time updates", "Custom integrations"],
      color: "cyan",
    },
    {
      icon: Shield,
      title: "Compliance Management",
      description: "Stay compliant with automated monitoring, alerts, and filing assistance across all jurisdictions.",
      benefits: ["Real-time compliance tracking", "Automated alerts", "Multi-state support", "Audit preparation"],
      color: "violet",
    },
    {
      icon: FileText,
      title: "Smart Documentation",
      description: "AI-generated forms, filings, and compliance documents with 99% accuracy and instant delivery.",
      benefits: ["Instant document generation", "Legal template library", "Version control", "Digital signatures"],
      color: "orange",
    },
    {
      icon: Calculator,
      title: "Tax Optimization",
      description: "Advanced algorithms identify tax-saving opportunities and optimize your business structure.",
      benefits: ["Maximize deductions", "Structure optimization", "Scenario modeling", "ROI tracking"],
      color: "blue",
    },
    {
      icon: Building2,
      title: "Entity Formation",
      description: "Complete business formation services with AI-guided entity selection and setup.",
      benefits: ["Entity type recommendations", "State selection guidance", "EIN acquisition", "Banking setup"],
      color: "green",
    },
  ]

  const stats = [
    { icon: Clock, value: "48hrs", label: "Average Business Launch Time" },
    { icon: CheckCircle, value: "99%", label: "Document Accuracy Rate" },
    { icon: DollarSign, value: "Zero", label: "Hidden Fees or Add-on Charges" },
    { icon: Globe, value: "50+", label: "States Supported" },
  ]
const integrations = [
    {
      name: "QuickBooks",
      description: "AI-powered sync of financial records, bookkeeping triggers, and automated tax categorization",
      logo: "/images/quickbooks-logo.png",
    },
    {
      name: "DocuSign",
      description: "Integrated signature workflows for EIN filings, agreements, and compliance docs",
      logo: "/images/docusign-logo.png",
    },
    {
      name: "Slack",
      description: "Real-time updates from tax filings, document approvals, and team alerts",
      logo: "/images/slack-logo.png",
    },
    {
      name: "Salesforce",
      description: "Sync client data for compliance workflows and onboarding automation",
      logo: "/images/salesforce-logo.png",
    },
    {
      name: "Microsoft 365",
      description: "Intelligent document collaboration + calendar-based tax reminders",
      logo: "/images/microsoft-365-logo.png",
    },
    {
      name: "Zapier",
      description: "5,000+ integrations with tailored GPT flows for finance, CRM, HR & more",
      logo: "/images/zapier-logo.png",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-800 to-black pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">
            <Bot className="w-4 h-4 mr-2" />
            Advanced AI Features
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Powerful Features for
            <span className="block text-emerald-400">Modern Tax Teams</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Discover how our AI-powered platform revolutionizes tax workflows, business formation, and compliance
            management with cutting-edge technology.
          </p>
        </div>
      </section>

      {/* NexTax.AI Product Suite */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            {/* Large NexTax Logo */}
            <div className="flex justify-center mb-8">
              <img src="/images/nextax-logo-large.png" alt="NexTax.AI" className="h-64 w-auto" />
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Scale Your Business with Advanced AI Tax Solutions
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              As your business grows, access our full suite of specialized AI-powered tax and compliance tools designed
              for complex business needs.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Transfer Pricing GPT */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Transfer Pricing Compliance GPT</h3>
                    <Badge className="bg-violet-500/20 text-violet-300 text-xs">Enterprise</Badge>
                  </div>
                </div>
                <p className="text-slate-300 mb-6">
                  AI-powered benchmark studies and transfer pricing documentation for multinational corporations.
                  Automated compliance with OECD guidelines and local regulations.
                </p>
                <ul className="space-y-2 mb-6">
                  {[
                    "Automated benchmark studies",
                    "OECD compliance documentation",
                    "Economic analysis reports",
                    "Multi-jurisdiction support",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Starting at $2,999/month</span>
                  <Button variant="outline" className="border-violet-500/50 text-violet-300 hover:bg-violet-500/10">
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* State Tax Nexus GPT */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">State Tax Nexus GPT</h3>
                    <Badge className="bg-cyan-500/20 text-cyan-300 text-xs">Multi-State</Badge>
                  </div>
                </div>
                <p className="text-slate-300 mb-6">
                  Navigate complex state tax obligations with AI that monitors nexus thresholds, filing requirements,
                  and compliance deadlines across all 50 states.
                </p>
                <ul className="space-y-2 mb-6">
                  {[
                    "Real-time nexus monitoring",
                    "50-state compliance tracking",
                    "Automated filing alerts",
                    "Economic nexus analysis",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Starting at $799/month</span>
                  <Button variant="outline" className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10">
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sales Tax GPT */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Calculator className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Sales Tax Compliance GPT</h3>
                    <Badge className="bg-orange-500/20 text-orange-300 text-xs">E-commerce</Badge>
                  </div>
                </div>
                <p className="text-slate-300 mb-6">
                  Automated sales tax calculation, filing, and remittance for e-commerce and retail businesses. Handles
                  complex product taxability and exemption certificates.
                </p>
                <ul className="space-y-2 mb-6">
                  {[
                    "Automated tax calculation",
                    "Product taxability analysis",
                    "Exemption certificate management",
                    "Multi-channel integration",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Starting at $299/month</span>
                  <Button variant="outline" className="border-orange-500/50 text-orange-300 hover:bg-orange-500/10">
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Custom AI Solutions */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Custom AI Tax Solutions</h3>
                    <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">Bespoke</Badge>
                  </div>
                </div>
                <p className="text-slate-300 mb-6">
                  Need something specific? Our AI experts can build custom GPTs tailored to your unique tax challenges,
                  industry requirements, or compliance needs.
                </p>
                <ul className="space-y-2 mb-6">
                  {[
                    "Industry-specific solutions",
                    "Custom workflow automation",
                    "Integration with existing systems",
                    "Dedicated support team",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Custom pricing</span>
                  <Button variant="outline" className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10">
                    Contact Sales
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 text-center">
                <CardContent className="p-8">
                  <stat.icon className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-slate-400">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

     {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="bg-gray-900/50 border-gray-700 hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        feature.color === "emerald"
                          ? "bg-emerald-500/20"
                          : feature.color === "cyan"
                            ? "bg-cyan-500/20"
                            : feature.color === "violet"
                              ? "bg-violet-500/20"
                              : feature.color === "orange"
                                ? "bg-orange-500/20"
                                : feature.color === "blue"
                                  ? "bg-blue-500/20"
                                  : "bg-green-500/20"
                      }`}
                    >
                      <feature.icon
                        className={`w-6 h-6 ${
                          feature.color === "emerald"
                            ? "text-emerald-400"
                            : feature.color === "cyan"
                              ? "text-cyan-400"
                              : feature.color === "violet"
                                ? "text-violet-400"
                                : feature.color === "orange"
                                  ? "text-orange-400"
                                  : feature.color === "blue"
                                    ? "text-blue-400"
                                    : "text-green-400"
                        }`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-white text-xl">{feature.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-slate-300">{feature.description}</p>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">Key Benefits:</h4>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, j) => (
                        <li key={j} className="flex items-center gap-2 text-slate-300">
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        </section>

      {/* Customer Journey CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl p-8">
              {/* Centered StartSmart White Logo */}
              <div className="flex justify-center mb-8">
                <img
                  src="/images/startsmart-logo-white-new.png"
                  alt="StartSmart by NexTax.AI"
                  className="h-28 w-auto"
                />
              </div>

              <h3 className="text-2xl font-bold text-white mb-4">Ready to Transform Your Tax Processes?</h3>
              <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
                Start your journey towards efficient and intelligent tax management today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/startsmart">
                  <Button size="lg" className="bg-white text-emerald-600 hover:bg-slate-100 px-8 py-4">
                    Start with Business Launch
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 px-8 py-4 bg-transparent"
                  >
                    Explore Enterprise Solutions
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>   
    </div>
  )
}
