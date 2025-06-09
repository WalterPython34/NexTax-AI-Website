import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Zap, Shield, FileText, Calculator, Building2, CheckCircle, Clock, DollarSign, Globe } from "lucide-react"

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
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">AI-Powered Integrations & Automation Consulting</h2>
          <p className="text-xl text-emerald-300 mb-12 max-w-2xl mx-auto">
            Unify your tools, automate your workflow, and scale smarter.
          </p> 
          <p className="text-lg text-slate-400 mb-12 max-w-3xl mx-auto">
  Let NexTax.AI handle your integration strategy. We consult, configure, and deploy seamless automations across your tech stack — so you can focus on growing your business.
</p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "QuickBooks", description: "AI-powered sync of financial records, bookkeeping triggers, and automated tax categorization" },
              { name: "DocuSign", description: "Integrated signature workflows for EIN filings, agreements, and compliance docs" },
              { name: "Slack", description: "Real-time updates from tax filings, document approvals, and team alerts" },
              { name: "Salesforce", description: "Sync client data for compliance workflows and onboarding automation" },
              { name: "Microsoft 365", description: "Intelligent document collaboration + calendar-based tax reminders" },
              { name: "Zapier", description: "5,000+ integrations with tailored GPT flows for finance, CRM, HR & more" },
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
    </div>
  )
}
