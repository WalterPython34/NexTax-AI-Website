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
      bio: "After 20+ years navigating the tax landscape at Morgan Stanley and Big 4 firms like PwC and KPMG, our founder, Steve Morello, realized the manual, high-cost systems that served enterprises were actively failing the modern entrepreneur. His vision was to take that high-level expertise—from M&A tax structuring to global compliance—and build a platform that democratizes access.",
      image: "/images/steve-morello-headshot.jpg",
      credentials: [
        "Registered Agent",
        "Former Morgan Stanley Private Equity",
        "Big 4 Tax Experience (PwC, KPMG)",
        "20+ Years Tax & Wall Street Experience",
        "M&A Tax Structuring Expert",
        "Fintech & Cybersecurity Tax Leader",
      ],
      linkedin: "https://www.linkedin.com/in/steve-morello-95b468365/",
    },
  ]

  const values = [
    {
      icon: Bot,
      title: "AI-First Innovation",
      description:
        "We believe AI should augment human expertise, not replace it. Our technology empowers tax professionals to focus on strategy while automating routine tasks.",
    },
    {
      icon: Shield,
      title: "Trust & Security",
      description:
        "Your data security is paramount. We maintain the highest standards of encryption, compliance, and privacy protection in everything we do.",
    },
    {
      icon: Zap,
      title: "Speed & Efficiency",
      description:
        "Time is money in business. Our platform reduces manual work by 90% and gets businesses launched in 48 hours instead of weeks.",
    },
    {
      icon: Users,
      title: "Client Success",
      description:
        "We measure our success by your success. Our dedicated support team ensures you get maximum value from our platform.",
    },
  ]

  const stats = [
    { number: "48hrs", label: "Business Launch Time" },
    { number: "99.7%", label: "Document Accuracy" },
    { number: "24/7", label: "AI Support Available" },
    { number: "50+", label: "States Supported" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
     
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">
            <Users className="w-4 h-4 mr-2" />
            About NexTax.AI
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Revolutionizing Tax & Business
            <span className="block text-emerald-400">Formation with AI</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
            Founded by seasoned tax professionals and AI researchers, NexTax.AI combines decades of Big 4 and Wall
            Street tax expertise with cutting-edge artificial intelligence to transform how businesses handle tax and
            compliance.
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
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              You shouldn't need a Wall Street budget to get Big 4 tax strategy. We founded NexTax on a simple, painful truth: The best tax and legal advice is often locked behind prohibitive costs and outdated processes. Every day, we saw entrepreneurs wasting thousands on simple formations and missing out on tens of thousands in tax savings, simply because they couldn't afford an expert.
            </p>
          </div>
          
      {/* Leadership Team Section */}
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Meet the Founder: Steve Morello, CEO & Founder</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Experienced tax professional combining decades of tax expertise with cutting-edge AI innovation.
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
                To put a Big 4 Tax Advisor in the pocket of every entrepreneur.
              </p>
              <p className="text-slate-300 mb-8">
                We partnered with leading AI researchers to capture decades of real-world, high-stakes
                tax knowledge and bake it into StartSmart App. Our goal is to make it possible for anyone to
                launch their business with the ultimate competitive advantage:
              </p>
              <p className="text-xl text-slate-300 mb-6">
                unrivaled tax strategy, 48-hour speed, and zero compliance surprises.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-emerald-400" />
                  <span className="text-white font-semibold">Simplify complex tax processes</span>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-emerald-400" />
                  <span className="text-white font-semibold">Ensure 100% compliance</span>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                  <span className="text-white font-semibold">Maximize tax efficiency</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white">The Problem We Solve</h3>
                  <div className="space-y-4">
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <h4 className="text-red-400 font-semibold mb-2">Traditional Business Formation</h4>
                      <ul className="text-slate-300 text-sm space-y-1">
                        <li>• 4-6 weeks for complete business setup</li>
                        <li>• $3,000-8,000+ in professional fees</li>
                        <li>• Manual paperwork and errors</li>
                        <li>• No ongoing compliance monitoring</li>
                      </ul>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <h4 className="text-emerald-400 font-semibold mb-2">With NexTax.AI</h4>
                      <ul className="text-slate-300 text-sm space-y-1">
                        <li>• 48 hours to launch</li>
                        <li>• 90% cost reduction</li>
                        <li>• AI-powered accuracy</li>
                        <li>• 24/7 compliance monitoring</li>
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
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Our Core Values</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              These principles guide everything we do and shape how we build products for our customers.
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
