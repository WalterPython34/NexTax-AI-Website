import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Zap, Shield, FileText, Calculator, Building2, CheckCircle, Clock, DollarSign, Globe } from "lucide-react"
import Image from "next/image"

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
    { icon: DollarSign, value: "$127K", label: "Average Tax Savings" },
    { icon: Globe, value: "50+", label: "States Supported" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
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
              <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg bg-${feature.color}-500/20 flex items-center justify-center`}>
                      <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
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

      {/* Integration Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Seamless Integrations</h2>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Connect with your existing tools and workflows for a unified experience.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "QuickBooks", description: "Sync financial data automatically" },
              { name: "DocuSign", description: "Digital signature integration" },
              { name: "Slack", description: "Team notifications and updates" },
              { name: "Salesforce", description: "CRM data synchronization" },
              { name: "Microsoft 365", description: "Document collaboration" },
              { name: "Zapier", description: "Connect 5000+ apps" },
            ].map((integration, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-slate-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-emerald-400">{integration.name[0]}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{integration.name}</h3>
                  <p className="text-slate-400 text-sm">{integration.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* NexTax.AI Product Suite Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 text-center">
          <Image src="/nextax-logo-white.svg" alt="NexTax.AI Logo" width={200} height={50} className="mx-auto mb-8" />
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-12">
            Scale Your Business with Advanced AI Tax Solutions
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Product Cards */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-white mb-2 text-lg">Transfer Pricing Compliance GPT (Enterprise)</h3>
                <p className="text-slate-400 text-sm">AI-powered solution for transfer pricing compliance.</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-white mb-2 text-lg">State Tax Nexus GPT (Multi-State)</h3>
                <p className="text-slate-400 text-sm">Manage state tax nexus with AI-driven insights.</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-white mb-2 text-lg">Sales Tax Compliance GPT (E-commerce)</h3>
                <p className="text-slate-400 text-sm">Automate sales tax compliance for your online store.</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-white mb-2 text-lg">Custom AI Tax Solutions (Bespoke)</h3>
                <p className="text-slate-400 text-sm">Tailored AI solutions to meet your unique tax needs.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Customer Journey CTA Section */}
      <section className="py-24 bg-emerald-900">
        <div className="container mx-auto px-4 text-center">
          <Image
            src="/startsmart-logo-white.svg"
            alt="StartSmart Logo"
            width={150}
            height={40}
            className="mx-auto mb-8"
          />
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to Transform Your Tax Processes?</h2>
          <p className="text-xl text-emerald-200 mb-12 max-w-2xl mx-auto">
            Start your journey towards efficient and intelligent tax management today.
          </p>

          <div className="flex justify-center gap-8">
            <button className="bg-white text-emerald-700 font-semibold py-3 px-8 rounded-md hover:bg-emerald-100 transition-colors">
              Start with Business Launch
            </button>
            <button className="bg-emerald-700 text-white font-semibold py-3 px-8 rounded-md hover:bg-emerald-600 transition-colors">
              Explore Enterprise Solutions
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
