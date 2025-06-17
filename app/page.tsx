import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Rocket,
  Shield,
  CheckCircle,
  Zap,
  Bot,
  Building2,
  TrendingUp,
  Globe,
  Calculator,
  Clock,
  DollarSign,
  MessageSquare,
} from "lucide-react"
import Link from "next/link"
import { ChatBot } from "@/components/chat-bot"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      {/* Hero Section - AI-Powered StartSmart */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10" />
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {/* NEW: AI-Powered Badge */}
              <Badge className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-blue-300 border-blue-500/30 text-lg px-4 py-2">
                <Bot className="w-5 h-5 mr-2" />
                Powered by StartSmartGPT AI
              </Badge>

              {/* StartSmart Logo */}
              <div className="flex items-center space-x-4">
                <img src="/images/startsmart-logo-black-cropped.jpg" alt="StartSmart" className="h-28 w-auto" />
              </div>

              <div className="space-y-6">
                <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                  Start Smart.
                  <span className="block text-emerald-400">Scale Smarter.</span>
                  <span className="block text-white text-3xl lg:text-4xl mt-4">With Your AI Business Copilot</span>
                </h1>

                <p className="text-xl text-slate-300 leading-relaxed max-w-lg">
                  The only business formation service that includes a custom-trained AI advisor. Get your business
                  launched in 48 hours PLUS ongoing AI guidance for growth, compliance, and strategy.
                </p>
              </div>

              {/* NEW: Unique AI Value Props */}
              <div className="space-y-3">
                {[
                  "Custom AI trained on 20+ years Big 4 tax expertise",
                  "24/7 business advisor that knows YOUR company",
                  "From formation to IPO - your AI grows with you",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Enhanced CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/startsmart-gpt-demo">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-500 text-white px-8 py-6 text-xl font-semibold w-full sm:w-auto"
                  >
                    <Bot className="mr-3 w-6 h-6" />
                    Try StartSmartGPT Demo
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-xl font-semibold w-full sm:w-auto"
                  >
                    Launch My Business
                    <Rocket className="ml-3 w-6 h-6" />
                  </Button>
                </Link>
              </div>

              {/* Updated Social Proof */}
              <div className="bg-slate-800/30 rounded-lg p-4 border border-emerald-500/30">
                <p className="text-emerald-300 font-medium text-center mb-2">🔒 100% Transparent Pricing Promise</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-slate-300">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>No Hidden Fees</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>No Add-On Charges</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>No Surprises</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">AI-Powered</div>
                  <div className="text-sm text-slate-400">Formation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">48hrs</div>
                  <div className="text-sm text-slate-400">Guaranteed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">24/7</div>
                  <div className="text-sm text-slate-400">AI Support</div>
                </div>
              </div>
            </div>

            {/* NEW: AI Demo Preview */}
            <div className="relative">
              <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-2xl" />
                <div className="relative space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">StartSmartGPT</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <Badge className="bg-green-500/20 text-green-300 text-xs">Online & Ready</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Sample AI Conversation */}
                  <div className="space-y-4">
                    <div className="bg-slate-900/30 rounded-lg p-4">
                      <p className="text-slate-300 text-sm">
                        <strong className="text-emerald-400">You:</strong> "Should I elect S-Corp status for my new
                        LLC?"
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg p-4 border border-emerald-500/20">
                      <p className="text-slate-300 text-sm">
                        <strong className="text-emerald-400">StartSmartGPT:</strong> "Based on your projected $85K
                        revenue and single-member structure, S-Corp election could save you ~$6,500 annually in
                        self-employment taxes. However, you'll need to run payroll. Let me show you the breakeven
                        analysis..."
                      </p>
                    </div>
                    <div className="bg-slate-900/30 rounded-lg p-4">
                      <p className="text-slate-300 text-sm">
                        <strong className="text-emerald-400">You:</strong> "What about multi-state tax implications?"
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg p-4 border border-emerald-500/20">
                      <p className="text-slate-300 text-sm">
                        <strong className="text-emerald-400">StartSmartGPT:</strong> "Great question! Since you
                        mentioned clients in NY and CA, you'll need to consider nexus thresholds..."
                      </p>
                    </div>
                  </div>

                  <Link href="/startsmart-gpt-demo">
                    <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                      <MessageSquare className="mr-2 w-4 h-4" />
                      Try StartSmartGPT Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: AI Differentiator Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Why StartSmartGPT Changes Everything</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Other services stop at paperwork. We give you an AI business partner trained on decades of real-world
              experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: Bot,
                title: "Custom-Trained on Your Business",
                description:
                  "Not generic ChatGPT. StartSmartGPT knows your entity type, industry, state requirements, and growth plans.",
                color: "purple",
              },
              {
                icon: Shield,
                title: "Big 4 Tax Expertise Built-In",
                description:
                  "Trained on 20+ years of Morgan Stanley, PwC, and KPMG tax strategies. Get enterprise-level advice instantly.",
                color: "emerald",
              },
              {
                icon: TrendingUp,
                title: "Grows With Your Business",
                description:
                  "From startup questions to scaling challenges. Your AI advisor evolves as your business grows.",
                color: "cyan",
              },
            ].map((feature, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
                <CardContent className="p-8 text-center">
                  <div
                    className={`w-16 h-16 mx-auto mb-6 rounded-full ${
                      feature.color === "purple"
                        ? "bg-purple-500/20"
                        : feature.color === "emerald"
                          ? "bg-emerald-500/20"
                          : "bg-cyan-500/20"
                    } flex items-center justify-center`}
                  >
                    <feature.icon
                      className={`w-8 h-8 ${
                        feature.color === "purple"
                          ? "text-purple-400"
                          : feature.color === "emerald"
                            ? "text-emerald-400"
                            : "text-cyan-400"
                      }`}
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                  <p className="text-slate-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Competitive Comparison */}
          <div className="bg-slate-800/30 rounded-2xl p-8 border border-slate-700">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">What Makes Us Different</h3>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="space-y-4">
                <div className="text-red-400 font-semibold">❌ LegalZoom</div>
                <p className="text-slate-400">"File your LLC" → Done. Good luck!</p>
              </div>
              <div className="space-y-4">
                <div className="text-red-400 font-semibold">❌ Incfile</div>
                <p className="text-slate-400">"Here's your paperwork" → You're on your own.</p>
              </div>
              <div className="space-y-4">
                <div className="text-emerald-400 font-semibold">✅ StartSmart</div>
                <p className="text-emerald-300">"Meet your AI business advisor" → Lifetime guidance.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Everything You Need to Start</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              One simple price includes everything required to legally operate your business.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: Building2,
                title: "Legal Entity Formation",
                items: [
                  "LLC or Corporation filing",
                  "Articles of organization",
                  "State compliance",
                  "Registered agent service",
                ],
              },
              {
                icon: Shield,
                title: "Tax & Compliance Setup",
                items: ["Federal EIN number", "State tax registration", "Operating agreements", "Compliance calendar"],
              },
              {
                icon: Zap,
                title: "Business Essentials",
                items: [
                  "Business bank account prep",
                  "Digital document vault",
                  "Ongoing support",
                  "Future filing reminders",
                ],
              },
            ].map((feature, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <feature.icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4 text-center">{feature.title}</h3>
                  <ul className="space-y-2">
                    {feature.items.map((item, j) => (
                      <li key={j} className="flex items-center gap-2 text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pricing CTA */}
          <div className="text-center">
            <div className="inline-block bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">$499</span>
                <span className="text-slate-400 ml-2">one-time fee</span>
              </div>
              <div className="space-y-4 mb-6">
                <p className="text-slate-300">Everything included. What you see is what you pay.</p>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <h4 className="text-emerald-300 font-semibold mb-2">Our Transparency Guarantee:</h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>✓ No hidden state filing fees</li>
                    <li>✓ No surprise registered agent charges</li>
                    <li>✓ No mandatory add-ons or upsells</li>
                    <li>✓ No recurring fees unless you choose them</li>
                  </ul>
                </div>
              </div>
              <Link href="/pricing">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 text-lg">
                  Get Started Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Transparency & Trust Section */}
      <section className="py-20 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="bg-red-500/20 text-red-300 px-4 py-2 mb-4">🚨 Tired of Hidden Fees?</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Why Other Services Frustrate Customers</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              We've read the Reddit reviews. We know what's broken. Here's how we're different.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Problems with Competitors */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-red-400 mb-6">❌ What Customers Hate About Our Competitors</h3>

              <div className="space-y-4">
                {[
                  {
                    problem: "Hidden State Filing Fees",
                    description: '"$49 to start" becomes $300+ with mandatory state fees they don\'t mention upfront.',
                  },
                  {
                    problem: "Forced Registered Agent Upsells",
                    description: '"Free formation" requires $199/year registered agent service to complete.',
                  },
                  {
                    problem: "Terrible Customer Service",
                    description: "Outsourced support that doesn't understand your business or tax implications.",
                  },
                  {
                    problem: "Confusing Add-On Pricing",
                    description:
                      "EIN filing, operating agreements, and compliance - all separate charges that add up fast.",
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <h4 className="text-red-300 font-semibold mb-2">{item.problem}</h4>
                    <p className="text-slate-300 text-sm italic">"{item.description}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Our Solution */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-emerald-400 mb-6">✅ The StartSmart Difference</h3>

              <div className="space-y-4">
                {[
                  {
                    solution: "100% Transparent Pricing",
                    description:
                      "$499 includes EVERYTHING. State fees, registered agent, EIN, operating agreement, AI support.",
                  },
                  {
                    solution: "No Mandatory Add-Ons",
                    description:
                      "Everything you need is included. Optional services are clearly marked and genuinely optional.",
                  },
                  {
                    solution: "Expert Support + AI",
                    description: "CPA founder with 20+ years experience PLUS 24/7 AI advisor trained on your business.",
                  },
                  {
                    solution: "All-Inclusive Packages",
                    description:
                      "One price covers formation through compliance. No surprise bills or hidden requirements.",
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <h4 className="text-emerald-300 font-semibold mb-2">{item.solution}</h4>
                    <p className="text-slate-300 text-sm">{item.description}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-lg p-6 border border-emerald-500/30">
                <h4 className="text-white font-bold mb-3">Our Money-Back Guarantee:</h4>
                <p className="text-slate-300 text-sm mb-3">
                  If you find ANY hidden fees or charges not clearly disclosed upfront, we'll refund your entire payment
                  and complete your formation for free.
                </p>
                <p className="text-emerald-300 text-xs font-semibold">
                  That's how confident we are in our transparent pricing.
                </p>
              </div>
            </div>
          </div>

          {/* Price Comparison Table */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">Real Cost Comparison</h3>
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-3 text-slate-300">Service</th>
                      <th className="text-center py-3 text-slate-300">Advertised Price</th>
                      <th className="text-center py-3 text-slate-300">Hidden Fees</th>
                      <th className="text-center py-3 text-slate-300">Real Total</th>
                      <th className="text-center py-3 text-slate-300">What's Missing</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-700">
                      <td className="py-3 font-medium">Tailor Brands</td>
                      <td className="text-center py-3">$49</td>
                      <td className="text-center py-3 text-red-400">+$199 agent +$50 EIN</td>
                      <td className="text-center py-3 text-red-400">$298+</td>
                      <td className="text-center py-3 text-xs">No AI, poor support</td>
                    </tr>
                    <tr className="border-b border-slate-700">
                      <td className="py-3 font-medium">LegalZoom</td>
                      <td className="text-center py-3">$79</td>
                      <td className="text-center py-3 text-red-400">+$299 agent +$79 EIN</td>
                      <td className="text-center py-3 text-red-400">$457+</td>
                      <td className="text-center py-3 text-xs">No ongoing support</td>
                    </tr>
                    <tr className="bg-emerald-500/10 border border-emerald-500/30">
                      <td className="py-3 font-bold text-emerald-300">StartSmart</td>
                      <td className="text-center py-3 font-bold text-emerald-300">$499</td>
                      <td className="text-center py-3 text-emerald-300">$0</td>
                      <td className="text-center py-3 font-bold text-emerald-300">$499</td>
                      <td className="text-center py-3 text-xs text-emerald-300">Includes AI advisor</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projected Customer Success Stories */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">What Our Customers Will Experience</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Based on our founder's 20+ years of experience, here's what entrepreneurs can expect with StartSmart.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Tech Startup Founder",
                business: "SaaS Platform",
                scenario: "E-commerce Entrepreneur",
                quote:
                  "Instead of spending weeks researching business formation and paying $3,000+ in legal fees, I'll get my LLC formed, EIN obtained, and operating agreements ready in 48 hours for under $500.",
                projectedOutcome: "Saves 4-6 weeks and $2,500+ in costs",
                timeframe: "48 hours vs 6 weeks traditionally",
                savings: "$2,500+ saved",
                icon: Rocket,
              },
              {
                name: "Service Business Owner",
                business: "Consulting Practice",
                scenario: "Professional Services",
                quote:
                  "Our AI will recommend the optimal business structure for my consulting practice, handle multi-state compliance, and ensure I'm set up for maximum tax efficiency from day one.",
                projectedOutcome: "Optimal structure + compliance setup",
                timeframe: "Expert recommendations instantly",
                savings: "Ongoing tax optimization",
                icon: TrendingUp,
              },
              {
                name: "First-Time Entrepreneur",
                business: "Local Service Business",
                scenario: "New Business Owner",
                quote:
                  "As someone with no legal or tax background, I'll have confidence knowing that Big 4-trained experts and AI are handling all the complex compliance requirements correctly.",
                projectedOutcome: "100% compliant from launch",
                timeframe: "Peace of mind immediately",
                savings: "Avoid costly mistakes",
                icon: Shield,
              },
            ].map((story, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <story.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{story.scenario}</div>
                      <div className="text-slate-400 text-sm">{story.business}</div>
                    </div>
                  </div>

                  <p className="text-slate-300 mb-6 italic">"{story.quote}"</p>

                  <div className="space-y-3 border-t border-slate-700 pt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 text-sm">{story.timeframe}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 text-sm">{story.savings}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 text-sm">{story.projectedOutcome}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Founder Credibility Note */}
          <div className="mt-12 text-center">
            <Card className="bg-slate-800/30 border-slate-600 max-w-4xl mx-auto">
              <CardContent className="p-8">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <img
                    src="/images/steve-morello-headshot.jpg"
                    alt="Steve Morello"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <div className="font-semibold text-white">Steve Morello, CPA</div>
                    <div className="text-emerald-400 text-sm">Founder & CEO</div>
                    <div className="text-slate-400 text-xs">Former Morgan Stanley, 20+ Years Big 4</div>
                  </div>
                </div>
                <p className="text-slate-300 italic">
                  "These scenarios are based on my two decades of experience helping businesses with formation and tax
                  optimization. I've seen the same challenges repeatedly - high costs, long timelines, and complexity.
                  StartSmart solves all three."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Industry Case Studies */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Real-World Business Formation Insights</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Based on our founder's experience with 500+ business formations across fintech, cybersecurity, and
              traditional industries.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {[
              {
                industry: "Technology Startups",
                challenge: "Complex equity structures and multi-state operations",
                traditionalApproach: "6-8 weeks, $5,000-15,000 in legal fees, manual compliance tracking",
                ourApproach: "48 hours, $499, AI-powered compliance monitoring",
                keyInsight:
                  "Most tech startups over-complicate their initial structure. Our AI recommends starting simple and scaling complexity as you grow.",
                metrics: {
                  timeSaved: "85% faster",
                  costSaved: "$4,500+ saved",
                  accuracy: "99.7% compliance rate",
                },
              },
              {
                industry: "Professional Services",
                challenge: "Multi-state licensing and tax optimization",
                traditionalApproach: "4-6 weeks, $3,000-8,000 in fees, ongoing compliance confusion",
                ourApproach: "48 hours, $499-699, automated multi-state monitoring",
                keyInsight:
                  "Service businesses often miss state-specific requirements. Our AI ensures compliance across all operating jurisdictions from day one.",
                metrics: {
                  timeSaved: "90% faster",
                  costSaved: "$2,500+ saved",
                  accuracy: "100% state compliance",
                },
              },
              {
                industry: "E-commerce & Retail",
                challenge: "Sales tax nexus and inventory management structures",
                traditionalApproach: "3-5 weeks, $2,500-6,000 in setup costs, manual nexus tracking",
                ourApproach: "48 hours, $499, AI nexus monitoring included",
                keyInsight:
                  "E-commerce businesses face complex sales tax requirements. Our AI tracks nexus thresholds and automates compliance across all states.",
                metrics: {
                  timeSaved: "80% faster",
                  costSaved: "$2,000+ saved",
                  accuracy: "Real-time nexus tracking",
                },
              },
              {
                industry: "Healthcare & Life Sciences",
                challenge: "Regulatory compliance and specialized entity structures",
                traditionalApproach: "8-12 weeks, $10,000+ in specialized legal fees",
                ourApproach: "48 hours base + specialized compliance add-ons",
                keyInsight:
                  "Healthcare businesses need specialized structures but often start with unnecessarily complex setups. Our AI recommends phased approaches.",
                metrics: {
                  timeSaved: "75% faster",
                  costSaved: "$8,000+ saved",
                  accuracy: "Industry-specific compliance",
                },
              },
            ].map((study, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-white mb-2">{study.industry}</h3>
                    <p className="text-slate-400 text-sm">{study.challenge}</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <h4 className="text-red-400 font-semibold mb-2 text-sm">Traditional Approach</h4>
                        <p className="text-slate-300 text-sm">{study.traditionalApproach}</p>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <h4 className="text-emerald-400 font-semibold mb-2 text-sm">StartSmart Approach</h4>
                        <p className="text-slate-300 text-sm">{study.ourApproach}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-700 pt-4">
                      <h4 className="text-white font-semibold mb-2 text-sm">Key Insight</h4>
                      <p className="text-slate-300 text-sm italic">{study.keyInsight}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-emerald-400 font-bold text-sm">{study.metrics.timeSaved}</div>
                        <div className="text-slate-400 text-xs">Time Saved</div>
                      </div>
                      <div>
                        <div className="text-emerald-400 font-bold text-sm">{study.metrics.costSaved}</div>
                        <div className="text-slate-400 text-xs">Cost Saved</div>
                      </div>
                      <div>
                        <div className="text-emerald-400 font-bold text-sm">{study.metrics.accuracy}</div>
                        <div className="text-slate-400 text-xs">Accuracy</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Credibility Footer */}
          <div className="text-center">
            <Card className="bg-slate-800/30 border-slate-600 max-w-3xl mx-auto">
              <CardContent className="p-6">
                <p className="text-slate-300 text-sm">
                  <strong className="text-white">Based on Real Experience:</strong> These insights come from Steve
                  Morello's 20+ years structuring businesses across Big 4 firms, Wall Street, and high-growth technology
                  companies. Every scenario reflects actual challenges we've solved.
                </p>
              </CardContent>
            </Card>
          </div>
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

          {/* Customer Journey CTA */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl p-8">
              {/* Centered StartSmart White Logo */}
              <div className="flex justify-center mb-8">
                <img src="/images/startsmart-logo-white.png" alt="StartSmart by NexTax.AI" className="h-28 w-auto" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-4">Start Simple, Scale Smart</h3>
              <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
                Begin with StartSmart to launch your business, then add advanced AI tools as you grow. Our platform
                scales with your needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/startsmart">
                  <Button size="lg" className="bg-white text-emerald-600 hover:bg-slate-100 px-8 py-4">
                    Start with Business Launch
                    <Rocket className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-4">
                    Explore Enterprise Solutions
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chatbot */}
      <ChatBot />
    </div>
  )
}
