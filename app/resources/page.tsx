import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  CheckCircle,
  DollarSign,
  Shield,
  TrendingUp,
  Calculator,
  Building2,
  AlertTriangle,
  Download,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { BusinessStructureQuiz } from "@/components/business-structure-quiz"

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">
            <BookOpen className="w-4 h-4 mr-2" />
            Knowledge Center
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Resources to Help You
            <span className="block text-emerald-400">Build Your Business</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Expert guides, interactive tools, and templates to help you navigate business formation, tax optimization,
            and compliance requirements.
          </p>
        </div>
      </section>

      {/* Quick Decision Framework */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Quick Decision Framework</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Answer 5 simple questions to get a personalized recommendation for your business structure.
            </p>
          </div>

          {/* Interactive Quiz */}
          <div className="mb-16">
            <BusinessStructureQuiz />
          </div>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Resource Library</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Browse our collection of guides, templates, and tools to help you at every stage of your business journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Business Formation",
                icon: Building2,
                description: "Guides and templates for setting up your business entity correctly.",
                resources: [
                  "LLC vs. Corporation Comparison Chart",
                  "State Filing Requirements Guide",
                  "Operating Agreement Template",
                  "EIN Application Walkthrough",
                ],
                color: "emerald",
              },
              {
                title: "Tax Optimization",
                icon: Calculator,
                description: "Strategies and tools to minimize your tax burden legally.",
                resources: [
                  "Small Business Tax Deductions Checklist",
                  "Quarterly Tax Payment Calculator",
                  "Home Office Deduction Guide",
                  "Business Expense Tracking Template",
                ],
                color: "cyan",
              },
              {
                title: "Compliance",
                icon: Shield,
                description: "Stay compliant with regulatory requirements across jurisdictions.",
                resources: [
                  "Annual Compliance Calendar",
                  "Multi-State Filing Requirements",
                  "Record Keeping Best Practices",
                  "Compliance Audit Checklist",
                ],
                color: "violet",
              },
              {
                title: "Growth Planning",
                icon: TrendingUp,
                description: "Resources to help you scale your business effectively.",
                resources: [
                  "Business Scaling Roadmap",
                  "Funding Options Comparison",
                  "Hiring Your First Employee Guide",
                  "Growth Metrics Dashboard Template",
                ],
                color: "amber",
              },
              {
                title: "Financial Management",
                icon: DollarSign,
                description: "Tools and templates for managing your business finances.",
                resources: [
                  "Cash Flow Projection Template",
                  "Profit & Loss Statement Generator",
                  "Small Business Banking Guide",
                  "Financial Ratio Analysis Tool",
                ],
                color: "blue",
              },
              {
                title: "Risk Management",
                icon: AlertTriangle,
                description: "Identify and mitigate risks to protect your business.",
                resources: [
                  "Business Insurance Guide",
                  "Cybersecurity Checklist",
                  "Contract Review Checklist",
                  "Crisis Management Plan Template",
                ],
                color: "red",
              },
            ].map((category, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg bg-${category.color}-500/20 flex items-center justify-center`}
                    >
                      <category.icon className={`w-6 h-6 text-${category.color}-400`} />
                    </div>
                    <CardTitle className="text-white">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-300">{category.description}</p>
                  <ul className="space-y-2">
                    {category.resources.map((resource, j) => (
                      <li key={j} className="flex items-center gap-2 text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{resource}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                    <Download className="mr-2 w-4 h-4" />
                    Access Resources
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Webinars Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Expert Webinars</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Join our live sessions or watch recordings of our most popular webinars on business formation and tax
              strategies.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Choosing the Right Business Structure",
                presenter: "Steve Morello, Founder & CEO",
                duration: "45 minutes",
                date: "Coming Soon",
                image: "/placeholder.svg?height=200&width=400",
              },
              {
                title: "Tax Strategies for Startups",
                presenter: "Steve Morello, Founder & CEO",
                duration: "60 minutes",
                date: "Coming Soon",
                image: "/placeholder.svg?height=200&width=400",
              },
              {
                title: "Multi-State Compliance Made Simple",
                presenter: "Steve Morello, Founder & CEO",
                duration: "50 minutes",
                date: "Coming Soon",
                image: "/placeholder.svg?height=200&width=400",
              },
            ].map((webinar, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 overflow-hidden">
                <div className="h-48 bg-slate-700 relative">
                  <img
                    src={webinar.image || "/placeholder.svg"}
                    alt={webinar.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-70" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <Badge className="bg-emerald-500 text-white">{webinar.duration}</Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{webinar.title}</h3>
                  <p className="text-emerald-400 mb-1">{webinar.presenter}</p>
                  <p className="text-slate-400 text-sm mb-4">{webinar.date}</p>
                  <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white">
                    <ExternalLink className="mr-2 w-4 h-4" />
                    Watch Webinar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Quick answers to common questions about business formation and tax optimization.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: "How do I know which business structure is right for me?",
                answer:
                  "The right structure depends on several factors including liability concerns, tax preferences, ownership plans, and growth goals. Our interactive quiz above can help you get a personalized recommendation based on your specific situation.",
              },
              {
                question: "What's the difference between an LLC and an S-Corporation?",
                answer:
                  "While both offer liability protection, LLCs are simpler to form and maintain with pass-through taxation. S-Corporations require more formalities but can offer self-employment tax savings for profitable businesses. The key difference is in tax treatment and administrative requirements.",
              },
              {
                question: "Do I need an EIN for my business?",
                answer:
                  "Yes, most businesses need an Employer Identification Number (EIN), even if you don't have employees. It's required for opening business bank accounts, filing taxes, and hiring contractors. Single-member LLCs with no employees can sometimes use the owner's SSN instead.",
              },
              {
                question: "How quickly can I form my business with NexTax.AI?",
                answer:
                  "With our StartSmart service, we can complete your business formation in just 48 hours. This includes entity filing, EIN acquisition, and all necessary compliance documentation. Traditional methods typically take 4-6 weeks.",
              },
              {
                question: "What ongoing compliance requirements will my business have?",
                answer:
                  "Ongoing requirements vary by entity type and state but typically include annual reports, tax filings, maintaining registered agent services, and keeping corporate records. Our AI compliance monitoring helps track these deadlines automatically.",
              },
            ].map((faq, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-3">{faq.question}</h3>
                  <p className="text-slate-300">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to Start Your Business?</h2>
            <p className="text-xl text-slate-300 mb-8">
              Launch your business in just 48 hours with our AI-powered formation service.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8">
                  View Pricing
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 px-8">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
