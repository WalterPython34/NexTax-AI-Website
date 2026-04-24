import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Target, Award, TrendingUp, Bot, Zap, Shield, ExternalLink, Linkedin } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  const team = [
    {
      name: "Steve Morello",
      role: "CEO & Founder",
      bio: `After over two decades in tax, M&A structuring, and financial operations — including experience supporting private equity transactions and global tax functions — Steve Morello saw a consistent gap in the SMB market:

            Buyers lacked access to structured, decision-grade underwriting.

            Deals were evaluated with inconsistent assumptions, limited benchmarking, and heavy reliance on seller-provided narratives.

            NexTax.AI was built to bring institutional discipline to SMB acquisitions — combining financial rigor, tax insight, and automation into a single decision workflow.

            The goal is simple:
            Help buyers make better decisions, faster — and avoid costly mistakes.`,
      image: "/images/steve-morello-headshot.jpg",
      credentials: [        
        "Former Morgan Stanley Private Equity",
        "Big 4 Tax Experience (EY, KPMG)",
        "20+ Years Tax & Deal Structuring",
        "M&A Tax & Transaction Specialist",
        "Finance Leader in Cybersecurity & Fintech",
      ],
      linkedin: "https://www.linkedin.com/in/steve-morello-95b468365/",
    },
  ]

  const values = [
    {
      icon: Bot,
      title: "Signal Over Noise",
      description:
        "We don’t surface more data — we surface the right data. Every metric, adjustment, and flag is designed to improve decision quality, not overwhelm it.",
    },
    {
      icon: Shield,
      title: "Lender-Grade Thinking",
      description:
        "Our models reflect how lenders and experienced operators actually evaluate deals — from DSCR durability to earnings quality and structure risk.",
    },
    {
      icon: Zap,
      title: "Truth Over Marketing",
      description:
        "We normalize earnings, challenge add-backs, and highlight risks — even when it makes a deal look worse. Better inputs lead to better outcomes.",
    },
    {
      icon: Users,
      title: "Built for Real Decisions",
      description:
        "This isn’t a dashboard. It’s a workflow — from first pass to LOI — designed to help buyers move faster without sacrificing rigor.",
    },
  ]

  const stats = [
    { number: "< 60 sec", label: "Time to analyze a deal" },
    { number: "41+", label: "Industries benchmarked with real transaction data" },
    { number: "100+", label: "Financial signals evaluated per deal" },
    { number: "24/7", label: "AI-powered underwriting assistant" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      {/* Hero Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">
            <Users className="w-4 h-4 mr-2" />
            About NexTax.AI
          </Badge>
          <div className="relative">
              <video
                src="/videos/Exploding_NexTax.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="max-h-[240px] mx-auto rounded-xl border border-slate-700 object-contain bg-slate-900 py-2"
              />
            </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-8">
            Bringing Institutional-Grade Deal Analysis 
            <span className="block text-emerald-400">to SMB Buyers</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            NexTax.AI combines Big 4 tax expertise, private equity experience, and real transaction data to help buyers underwrite deals with clarity, confidence, and lender-ready precision.
          </p>          
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-2">{stat.number}</div>
                <div className="text-slate-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
           <h2 className="text-3xl lg:text-4xl font-bold text-emerald-400 mb-6">
            Why We Built This</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Most SMB buyers aren’t losing deals because of effort — they’re losing because of incomplete information.

              Deals look attractive on the surface but fall apart under scrutiny:
              inflated earnings, aggressive add-backs, weak coverage, or unrealistic pricing.

              At the same time, institutional-quality underwriting is locked behind expensive advisors and slow processes.

              We built NexTax.AI to bridge that gap.

              A platform where any buyer can:
                • Normalize earnings
                • Benchmark against real deals
                • Stress test financing
                • Generate a lender-ready view
            </p>
          </div>
        </div>
      </section>
          
      {/* Leadership Team Section */}
       <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Meet the Founder: Steve Morello</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Built at the intersection of tax, private equity, and real-world deal execution.
            </p>
          </div>

          <div className="grid lg:grid-cols-1 gap-12 max-w-4xl mx-auto">
            {team.map((member, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Photo and Basic Info */}
                    <div className="text-center lg:text-left">
                      <div className="w-48 h-48 mx-auto lg:mx-0 mb-4 rounded-xl bg-slate-700 overflow-hidden">
                        <img
                          src={member.image || "/placeholder.svg"}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">{member.name}</h3>
                      <p className="text-emerald-400 font-semibold mb-4">{member.role}</p>

                      {/* LinkedIn Button */}
                      <Link href={member.linkedin} target="_blank" rel="noopener noreferrer">
                        <Button
                          variant="outline"
                          className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
                        >
                          <Linkedin className="mr-2 w-4 h-4" />
                          LinkedIn Profile
                          <ExternalLink className="ml-2 w-3 h-3" />
                        </Button>
                      </Link>
                    </div>

                    {/* Detailed Info */}
                    <div className="flex-1 space-y-6">
                      {/* Bio */}
                      <p className="text-slate-300 leading-relaxed">{member.bio}</p>

                      {/* Credentials */}
                      <div>
                        <h4 className="font-semibold text-white mb-3">Professional Credentials</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {member.credentials.map((credential, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              <span className="text-slate-300 text-sm">{credential}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-xl text-slate-300 mb-6">
                To give every serious buyer the analytical edge of a seasoned deal team without the cost, delay, or guesswork.
              </p>
              <p className="text-slate-300 mb-8">
                We believe too many buyers rely on broker-provided numbers, surface-level comps, or manual spreadsheets that miss critical risks.
              </p>
              <p className="text-xl text-slate-300 mb-6">
                NexTax.AI was built to change that.
              </p>
              <p className="text-slate-300 mb-8">
                By combining tax expertise, transaction data, and structured underwriting logic, we help buyers move from “this looks interesting” to “this is a disciplined decision.”
              </p>
              
            </div>
            <div className="relative">
              <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white">The Problem We Solve</h3>
                  <div className="space-y-4">
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <h4 className="text-red-400 font-semibold mb-2">Traditional Deal Evaluation</h4>
                      <ul className="text-slate-300 text-sm space-y-1">
                        <li>• Reliance on broker-reported SDE</li>
                        <li>• Inconsistent or inflated add-backs</li>
                        <li>• No standardized benchmarking</li>
                        <li>• Manual spreadsheet analysis</li>
                        <li>• Limited lender perspective until late stage</li>
                      </ul>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <h4 className="text-emerald-400 font-semibold mb-2">With NexTax.AI</h4>
                      <ul className="text-slate-300 text-sm space-y-1">
                        <li>• Adjusted earnings with validation logic</li>
                        <li>• Trust scoring + add-back flags</li>
                        <li>• Benchmarking across real transactions</li>
                        <li>• Instant DSCR + financing viability</li>
                        <li>• Lender-ready outputs from day one</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Our Operating Principles</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              These principles guide how we build tools for serious buyers making real capital decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <value.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-3">{value.title}</h3>
                      <p className="text-slate-300">{value.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Story Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8">Our Story</h2>
            <div className="space-y-6 text-lg text-slate-300">
              <p>
                NexTax.AI was born from real-world frustration with the complexity and cost of business formation and
                tax compliance. Our founder, Steve Morello, spent over two decades navigating the intricate world of tax
                across Big 4 firms, Wall Street, and high-growth technology companies.
              </p>
              <p>
                From structuring complex private equity transactions at Morgan Stanley to leading tax departments at
                cutting-edge fintech and cybersecurity firms, Steve witnessed firsthand how manual processes, outdated
                systems, and high costs created barriers for entrepreneurs and growing businesses.
              </p>
              <p>
                The vision for NexTax.AI crystallized when Steve partnered with leading AI researchers who saw an
                opportunity to apply machine learning to tax and compliance. Together, they envisioned a world where AI
                could handle routine tax work with superhuman accuracy, freeing professionals to focus on strategy and
                client relationships.
              </p>
              <p>
                After extensive development and training our AI on comprehensive tax scenarios, we launched NexTax.AI to
                bridge the gap between complex tax requirements and accessible, affordable business formation services.
              </p>
              <p className="text-emerald-400 font-semibold">
                We're building the future where expert-level tax and business services are accessible to every
                entrepreneur, everywhere.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
