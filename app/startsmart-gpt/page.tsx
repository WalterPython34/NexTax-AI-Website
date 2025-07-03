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
  BarChart3,
  Target,
  Zap,
  Brain,
  Calendar,
  Bell,
  TrendingUp,
  Star,
  Sparkles,
  Rocket,
  Crown,
} from "lucide-react"
import Link from "next/link"

export default function StartSmartGPTPage() {
  const aiChatFeatures = [
    { tier: "Free", limit: "10 questions/month", icon: Bot, color: "text-green-400" },
    { tier: "Pro", limit: "150 questions/month", icon: Zap, color: "text-blue-400" },
    { tier: "Premium", limit: "Unlimited questions", icon: Crown, color: "text-purple-400" },
  ]

  const documentCategories = [
    {
      title: "Legal Documents",
      icon: Shield,
      documents: [
        { name: "Operating Agreement", free: "Download template", pro: "AI generation", premium: "Full service" },
        { name: "Articles of Incorporation", free: "Download template", pro: "AI generation", premium: "Full service" },
        { name: "Corporate Bylaws", free: "Download template", pro: "AI generation", premium: "Full service" },
      ],
    },
    {
      title: "Tax & Finance",
      icon: BarChart3,
      documents: [
        { name: "SS-4 EIN Form", free: "Blank form", pro: "AI + Typeform", premium: "Full service" },
        { name: "Chart of Accounts", free: "Download template", pro: "AI generation", premium: "Full service" },
        { name: "Budget Template", free: "Download template", pro: "AI generation", premium: "Full service" },
      ],
    },
    {
      title: "Business Plans",
      icon: Target,
      documents: [
        { name: "Executive Summary", free: "Download template", pro: "Basic AI", premium: "Advanced AI" },
        { name: "Lean Canvas", free: "Download template", pro: "Basic AI", premium: "Advanced AI" },
        { name: "Startup Business Plan", free: "Download template", pro: "Basic AI", premium: "Advanced AI" },
      ],
    },
  ]

  const knowledgeHubSections = [
    {
      title: "Getting Started",
      icon: Rocket,
      topics: [
        "Business Idea Validation",
        "Market Research Essentials",
        "Finding Co-founders",
        "Business Model Canvas",
      ],
    },
    {
      title: "Legal & Compliance",
      icon: Shield,
      topics: ["Entity Formation Guide", "Licenses & Permits", "Contracts & Agreements", "Payroll Basics"],
    },
    {
      title: "AI Resources",
      icon: Brain,
      topics: ["Prompt Playground", "AI Provider Directory", "Automation Templates", "Prompt Engineering Library"],
    },
  ]

  const pricingTiers = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for exploring your business idea",
      popular: false,
      features: [
        "10 AI chat questions/month",
        "Progress roadmap (unlimited)",
        "Basic document templates",
        "Featured knowledge resources",
        "Community support",
      ],
      cta: "Start Free Today",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "For entrepreneurs ready to launch",
      popular: true,
      features: [
        "150 AI chat questions/month",
        "AI document generation",
        "100 prompt playground uses",
        "All knowledge hub content",
        "Smart compliance center",
        "Email support",
      ],
      cta: "Start Pro Trial",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      name: "Premium",
      price: "$79",
      period: "/month",
      description: "For scaling businesses",
      popular: false,
      features: [
        "Unlimited AI chat questions",
        "Advanced AI business plans",
        "250 prompt playground uses",
        "Priority compliance notifications",
        "Multi-entity management",
        "Priority support + CPA access",
      ],
      cta: "Go Premium",
      gradient: "from-purple-500 to-pink-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6 text-lg px-6 py-2">
            <Sparkles className="w-5 h-5 mr-2" />
            Revolutionary AI Business Platform
          </Badge>
          <h1 className="text-4xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Your AI Business
            <span className="block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Success Partner
            </span>
          </h1>
          <p className="text-xl lg:text-2xl text-slate-300 max-w-4xl mx-auto mb-12 leading-relaxed">
            StartSmartGPT combines 20+ years of Big 4 expertise with cutting-edge AI to guide you from idea to IPO.
            <span className="block mt-2 text-emerald-300 font-semibold">
              Everything you need to build, launch, and scale your business.
            </span>
          </p>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-8 mb-12 text-slate-400">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <span className="text-sm">Trusted by 10,000+ entrepreneurs</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-sm">Big 4 expertise built-in</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8 py-4 text-lg font-semibold shadow-2xl"
            >
              <Bot className="mr-2 w-6 h-6" />
              Start Your Business Journey Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-4 text-lg bg-transparent"
            >
              <Monitor className="mr-2 w-5 h-5" />
              Watch Demo
            </Button>
          </div>

          {/* App Preview */}
          <div className="max-w-6xl mx-auto">
            <div className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700 shadow-2xl">
              <div className="aspect-video bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-purple-500/10 animate-pulse"></div>
                <div className="text-center z-10">
                  <Bot className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
                  <h3 className="text-3xl font-bold text-white mb-4">StartSmartGPT Platform</h3>
                  <p className="text-slate-300 text-lg">Your complete business command center</p>
                  <Badge className="mt-4 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    Coming Soon - Full Integration
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chat Features */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              AI Chat That Actually
              <span className="text-emerald-400"> Understands Business</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Get instant answers from an AI trained on decades of real-world business experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
            {aiChatFeatures.map((feature, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50"></div>
                <CardContent className="p-8 relative z-10">
                  <feature.icon className={`w-16 h-16 ${feature.color} mx-auto mb-4`} />
                  <h3 className="text-2xl font-bold text-white mb-2">{feature.tier}</h3>
                  <p className="text-slate-300 text-lg font-semibold">{feature.limit}</p>
                  {feature.tier === "Pro" && (
                    <Badge className="mt-4 bg-blue-500/20 text-blue-300 border-blue-500/30">Most Popular</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress Roadmap Feature */}
          <Card className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/30 max-w-4xl mx-auto">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                <Target className="w-12 h-12 text-emerald-400" />
                <div>
                  <h3 className="text-2xl font-bold text-white">Progress Roadmap</h3>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">FREE for All Users</Badge>
                </div>
              </div>
              <p className="text-slate-300 text-lg mb-6">
                Turn every AI conversation into actionable tasks. Track your business-building progress in real-time.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <span className="text-slate-300">Convert AI responses to todos</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <span className="text-slate-300">Custom task creation</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <span className="text-slate-300">Progress tracking</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Document Center */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              Document Center
              <span className="text-emerald-400"> That Works</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              From templates to AI-generated documents to full-service support - we've got every business document you
              need
            </p>
          </div>

          <div className="space-y-12">
            {documentCategories.map((category, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                      <category.icon className="w-8 h-8 text-emerald-400" />
                    </div>
                    <CardTitle className="text-2xl text-white">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {category.documents.map((doc, j) => (
                      <div key={j} className="bg-slate-900/50 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-white mb-4">{doc.name}</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">Free:</span>
                            <Badge className="bg-green-500/20 text-green-300 text-xs">{doc.free}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">Pro:</span>
                            <Badge className="bg-blue-500/20 text-blue-300 text-xs">{doc.pro}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">Premium:</span>
                            <Badge className="bg-purple-500/20 text-purple-300 text-xs">{doc.premium}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Knowledge Hub */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              Knowledge Hub
              <span className="text-emerald-400"> Library</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Comprehensive guides, AI tools, and resources to accelerate your business journey
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {knowledgeHubSections.map((section, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <section.icon className="w-8 h-8 text-emerald-400" />
                    <CardTitle className="text-xl text-white">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {section.topics.map((topic, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="text-slate-300">{topic}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Featured AI Resources */}
          <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">AI-Powered Business Tools</h3>
                <p className="text-slate-300">Revolutionary AI tools designed specifically for entrepreneurs</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">250+</div>
                  <div className="text-slate-300 text-sm">Automation Templates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">100+</div>
                  <div className="text-slate-300 text-sm">Prompt Engineering Scripts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">50+</div>
                  <div className="text-slate-300 text-sm">AI Provider Integrations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">24/7</div>
                  <div className="text-slate-300 text-sm">AI Business Support</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Smart Compliance Center */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              Smart Compliance
              <span className="text-emerald-400"> Center</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Never miss a deadline again. Personalized compliance tracking based on your business type and location.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 mb-8">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <Calendar className="w-12 h-12 text-red-400" />
                  <div>
                    <h3 className="text-2xl font-bold text-white">Personalized Tax Calendar</h3>
                    <p className="text-slate-300">Automatically populated based on your business entity and state</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">0</div>
                    <div className="text-slate-300 text-sm">Completed</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">3</div>
                    <div className="text-slate-300 text-sm">In Progress</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">8</div>
                    <div className="text-slate-300 text-sm">Pending</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-400 mb-1">0</div>
                    <div className="text-slate-300 text-sm">Overdue</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Bell className="w-8 h-8 text-yellow-400" />
                    <h4 className="text-lg font-semibold text-white">Smart Notifications</h4>
                  </div>
                  <p className="text-slate-300 mb-4">Get notified 30 days before any filing deadline</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 text-sm">Email reminders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 text-sm">Mobile push notifications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 text-sm">Dashboard alerts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-8 h-8 text-emerald-400" />
                    <h4 className="text-lg font-semibold text-white">Progress Tracking</h4>
                  </div>
                  <p className="text-slate-300 mb-4">Visual progress tracking for all compliance tasks</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 text-sm">Real-time status updates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 text-sm">Completion percentage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 text-sm">Overdue tracking</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              Choose Your
              <span className="text-emerald-400"> Success Plan</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Start free and scale with your business. Every plan includes our core AI business advisor.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.map((tier, i) => (
              <Card
                key={i}
                className={`bg-slate-800/50 border-slate-700 relative overflow-hidden ${
                  tier.popular ? "ring-2 ring-blue-500 scale-105" : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-blue-500 text-white px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-5`}></div>
                <CardHeader className="text-center pb-6 relative z-10">
                  <CardTitle className="text-2xl text-white mb-2">{tier.name}</CardTitle>
                  <p className="text-slate-400 text-sm mb-4">{tier.description}</p>
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-white">{tier.price}</span>
                    <span className="text-slate-400 text-lg">{tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                  <div className="space-y-4">
                    {tier.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className={`w-full text-lg py-3 ${
                      tier.popular
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                        : tier.name === "Free"
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Money Back Guarantee */}
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-6 py-3">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300 font-semibold">30-Day Money-Back Guarantee</span>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Availability */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Access Anywhere,
              <span className="text-emerald-400"> Anytime</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Your AI business advisor works across all your devices. Start on web, continue on mobile.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
            <Card className="bg-slate-800/50 border-slate-700 text-center">
              <CardContent className="p-8">
                <Monitor className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Web Platform</h3>
                <p className="text-slate-300 mb-6">Full-featured experience in your browser</p>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600">Launch Web App</Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 text-center">
              <CardContent className="p-8">
                <Smartphone className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">iOS App</h3>
                <p className="text-slate-300 mb-6">Native iOS experience with offline features</p>
                <Button variant="outline" className="w-full border-slate-600 text-slate-300 bg-transparent">
                  <Download className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 text-center">
              <CardContent className="p-8">
                <Smartphone className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Android App</h3>
                <p className="text-slate-300 mb-6">Native Android experience with sync</p>
                <Button variant="outline" className="w-full border-slate-600 text-slate-300 bg-transparent">
                  <Download className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-r from-emerald-600 via-cyan-600 to-purple-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6">
              Ready to Build Your
              <span className="block">Business Empire?</span>
            </h2>
            <p className="text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto mb-12">
              Join thousands of entrepreneurs who've accelerated their success with StartSmartGPT.
              <span className="block mt-2 font-semibold">Your AI business partner is waiting.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
              <Button
                size="lg"
                className="bg-white text-emerald-600 hover:bg-slate-100 px-10 py-4 text-xl font-bold shadow-2xl"
              >
                <Rocket className="mr-3 w-6 h-6" />
                Start Your Free Journey Today
              </Button>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 px-10 py-4 text-xl bg-transparent"
                >
                  View All Business Services
                  <ArrowRight className="ml-3 w-6 h-6" />
                </Button>
              </Link>
            </div>

            <div className="text-white/80 text-sm">No credit card required • Start free forever • Upgrade anytime</div>
          </div>
        </div>
      </section>
    </div>
  )
}
