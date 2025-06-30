import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Smartphone,
  Download,
  CheckCircle,
  Zap,
  FileText,
  MessageSquare,
  BarChart3,
  Shield,
  ArrowRight,
} from "lucide-react"

export default function StartSmartGPTPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white pt-20">
      {/* Hero Section */}
      <section className="py-16 text-center">
        <div className="container mx-auto px-4">
          <Badge className="bg-emerald-500 text-white px-4 py-2 mb-6 text-lg">🚀 Now Available - StartSmart GPT</Badge>
          <h1 className="text-5xl lg:text-6xl font-bold mb-6">
            Your AI Business
            <span className="text-emerald-400"> Copilot</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            The complete AI-powered platform to launch, manage, and scale your business. From idea validation to
            compliance tracking - all in one place.
          </p>

          {/* App Store Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              size="lg"
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-xl flex items-center gap-3"
            >
              <Download className="w-6 h-6" />
              <div className="text-left">
                <div className="text-xs text-gray-300">Download on the</div>
                <div className="text-lg font-semibold">App Store</div>
              </div>
            </Button>
            <Button
              size="lg"
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-xl flex items-center gap-3"
            >
              <Download className="w-6 h-6" />
              <div className="text-left">
                <div className="text-xs text-gray-300">Get it on</div>
                <div className="text-lg font-semibold">Google Play</div>
              </div>
            </Button>
          </div>

          {/* Web App Access */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">🌐 Access Web Version</h3>
            <p className="text-slate-300 mb-6">
              Get started immediately with our web-based platform. No download required!
            </p>

            {/* Embedded App Container */}
            <div className="bg-slate-900 border border-slate-600 rounded-xl p-4 mb-6">
              <div className="text-center text-slate-400 py-12">
                <Zap className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
                <h4 className="text-xl font-semibold mb-2">StartSmart GPT Web App</h4>
                <p className="mb-4">Your comprehensive business management platform</p>
                <div className="text-sm text-slate-500">🔄 App will be embedded here when ready for deployment</div>
              </div>
            </div>

            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4">
              Launch Web App
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Everything You Need to Succeed</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Four powerful modules working together to accelerate your business journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: MessageSquare,
                title: "AI Sidekick",
                description: "24/7 AI business advisor for instant guidance and strategic insights",
                features: ["Business validation", "Market research", "Strategic planning"],
              },
              {
                icon: FileText,
                title: "Document Center",
                description: "AI-powered legal documents and templates for your startup",
                features: ["Operating agreements", "Articles of incorporation", "Tax forms"],
              },
              {
                icon: BarChart3,
                title: "Knowledge Hub",
                description: "Comprehensive guides and resources for every business stage",
                features: ["Step-by-step guides", "Best practices", "Industry insights"],
              },
              {
                icon: Shield,
                title: "Compliance Center",
                description: "Automated compliance tracking with state-specific deadlines",
                features: ["Tax deadlines", "Filing reminders", "Compliance scoring"],
              },
            ].map((feature, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.features.map((item, j) => (
                      <li key={j} className="flex items-center text-sm text-slate-400">
                        <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">Start free and upgrade as your business grows</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                period: "/month",
                description: "Perfect for exploring and getting started",
                features: [
                  "Basic AI Chat access",
                  "Free knowledge base articles",
                  "Basic document templates",
                  "Community support",
                ],
                cta: "Get Started Free",
                popular: false,
              },
              {
                name: "Starter",
                price: "$29",
                period: "/month",
                description: "For entrepreneurs ready to launch",
                features: [
                  "Unlimited AI Chat",
                  "AI document generation",
                  "Premium templates",
                  "Compliance tracking",
                  "Priority support",
                ],
                cta: "Start Free Trial",
                popular: true,
              },
              {
                name: "Growth",
                price: "$79",
                period: "/month",
                description: "For scaling businesses",
                features: [
                  "Everything in Starter",
                  "Advanced compliance automation",
                  "Custom document creation",
                  "Multi-state support",
                  "Dedicated account manager",
                ],
                cta: "Contact Sales",
                popular: false,
              },
            ].map((plan, i) => (
              <Card
                key={i}
                className={`relative bg-slate-800/50 border-slate-700 ${plan.popular ? "border-emerald-500 scale-105" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-white">
                    {plan.price}
                    <span className="text-lg text-slate-400">{plan.period}</span>
                  </div>
                  <p className="text-slate-300">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center text-slate-300">
                        <CheckCircle className="w-4 h-4 mr-3 text-emerald-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-700 hover:bg-slate-600"} text-white`}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile Benefits */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                Take Your Business
                <span className="text-emerald-400"> Anywhere</span>
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                Access your AI business copilot on any device. Get instant answers, generate documents, and stay
                compliant - whether you're in the office or on the go.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  "Offline document access",
                  "Push notifications for deadlines",
                  "Sync across all devices",
                  "Mobile-optimized AI chat",
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-emerald-400" />
                    <span className="text-slate-300">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Download App
                </Button>
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                  Try Web Version
                </Button>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-slate-800 rounded-3xl p-8 inline-block">
                <Smartphone className="w-32 h-32 text-emerald-400 mx-auto" />
                <p className="text-slate-400 mt-4">Mobile App Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">Ready to Launch Your Business?</h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            Join thousands of entrepreneurs who've accelerated their business journey with StartSmart GPT
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4">
              Start Free Today
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-4 bg-transparent"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
