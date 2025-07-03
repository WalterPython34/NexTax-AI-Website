import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Bot,
  Smartphone,
  Monitor,
  Download,
  CheckCircle,
  ArrowRight,
  Shield,
  FileText,
  BarChart3,
  Users,
  Clock,
} from "lucide-react"
import Link from "next/link"

export default function StartSmartGPTPage() {
  const features = [
    {
      icon: Bot,
      title: "AI Business Advisor",
      description: "24/7 AI assistant trained on 20+ years of Big 4 tax expertise",
      tier: "Free",
    },
    {
      icon: FileText,
      title: "Document Generation",
      description: "AI-powered legal documents, contracts, and compliance forms",
      tier: "Pro",
    },
    {
      icon: BarChart3,
      title: "Compliance Tracking",
      description: "Automated compliance monitoring with state-specific deadlines",
      tier: "Pro",
    },
    {
      icon: Shield,
      title: "Tax Optimization",
      description: "Real-time tax strategy recommendations and deduction finder",
      tier: "Premium",
    },
    {
      icon: Users,
      title: "Multi-Entity Management",
      description: "Manage multiple businesses and entities from one dashboard",
      tier: "Premium",
    },
    {
      icon: Clock,
      title: "Priority Support",
      description: "Direct access to CPA experts and priority response times",
      tier: "Premium",
    },
  ]

  const pricingTiers = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for getting started",
      features: [
        "Basic AI chat assistance",
        "Business formation guidance",
        "Free document templates",
        "Community support",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "For growing businesses",
      features: [
        "Everything in Free",
        "AI document generation",
        "Compliance tracking",
        "State-specific guidance",
        "Email support",
      ],
      cta: "Start Pro Trial",
      popular: true,
    },
    {
      name: "Premium",
      price: "$79",
      period: "/month",
      description: "For established businesses",
      features: [
        "Everything in Pro",
        "Advanced tax optimization",
        "Multi-entity management",
        "Priority CPA support",
        "Custom integrations",
      ],
      cta: "Go Premium",
      popular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">
            <Bot className="w-4 h-4 mr-2" />
            Now Available
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Meet Your AI
            <span className="block text-emerald-400">Business Copilot</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
            StartSmartGPT is your 24/7 AI business advisor, trained on decades of Big 4 tax expertise. Get instant
            answers, generate documents, and stay compliant - all in one platform.
          </p>

          {/* App Preview */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <div className="aspect-video bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Bot className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">StartSmartGPT Web App</h3>
                  <p className="text-slate-300">Coming Soon - Full Integration</p>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Availability */}
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6 text-center">
                <Monitor className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Web Platform</h3>
                <p className="text-slate-300 text-sm mb-4">Access from any browser</p>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600">Launch Web App</Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6 text-center">
                <Smartphone className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">iOS App</h3>
                <p className="text-slate-300 text-sm mb-4">Download from App Store</p>
                <Button variant="outline" className="w-full border-slate-600 text-slate-300 bg-transparent">
                  <Download className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6 text-center">
                <Smartphone className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Android App</h3>
                <p className="text-slate-300 text-sm mb-4">Download from Play Store</p>
                <Button variant="outline" className="w-full border-slate-600 text-slate-300 bg-transparent">
                  <Download className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Powerful Features for Every Business</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              From startup to enterprise, StartSmartGPT grows with your business needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                        <Badge
                          className={`text-xs ${
                            feature.tier === "Free"
                              ? "bg-green-500/20 text-green-300"
                              : feature.tier === "Pro"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-purple-500/20 text-purple-300"
                          }`}
                        >
                          {feature.tier}
                        </Badge>
                      </div>
                      <p className="text-slate-300 text-sm">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Choose Your Plan</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">Start free and upgrade as your business grows</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier, i) => (
              <Card
                key={i}
                className={`bg-slate-800/50 border-slate-700 relative ${tier.popular ? "ring-2 ring-emerald-500" : ""}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-xl text-white">{tier.name}</CardTitle>
                  <p className="text-slate-400 text-sm">{tier.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                    <span className="text-slate-400">{tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {tier.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className={`w-full ${
                      tier.popular
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : "bg-slate-700 hover:bg-slate-600 text-white"
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-cyan-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to Start Smart?</h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
              Join thousands of entrepreneurs who trust StartSmartGPT to guide their business journey.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-slate-100 px-8 py-4 text-lg">
                <Bot className="mr-2 w-5 h-5" />
                Try StartSmartGPT Free
              </Button>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 px-8 py-4 text-lg bg-transparent"
                >
                  View All Services
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
