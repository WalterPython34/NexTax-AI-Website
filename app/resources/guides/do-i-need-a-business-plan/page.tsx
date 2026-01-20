"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CheckCircle2,
  AlertCircle,
  Users,
  Clock,
  ArrowLeft,
  ArrowRight,
  FileText,
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
  Building2,
  Lightbulb,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://nextax.ai/#organization",
      "name": "NexTax.AI",
      "url": "https://nextax.ai/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://nextax.ai/nextax-logo.png"
      },
      "description": "NexTax.AI helps new entrepreneurs form and register LLC and S-corp entities, with founder-led expertise and fintech automation.",
      "sameAs": ["https://www.linkedin.com/company/nextax-ai"],
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "contactType": "customer support",
          "url": "https://nextax.ai/contact",
          "availableLanguage": ["English"]
        }
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://nextax.ai/#website",
      "url": "https://nextax.ai/",
      "name": "NexTax.AI",
      "publisher": { "@id": "https://nextax.ai/#organization" }
    },
    {
      "@type": "WebPage",
      "@id": "https://nextax.ai/resources/guides/do-i-need-a-business-plan#webpage",
      "url": "https://nextax.ai/resources/guides/do-i-need-a-business-plan",
      "name": "Do I Need a Business Plan — and What Should Be in It for a New Business?",
      "isPartOf": { "@id": "https://nextax.ai/#website" },
      "about": [
        { "@type": "Thing", "name": "Business plan" },
        { "@type": "Thing", "name": "Business model" },
        { "@type": "Thing", "name": "Entrepreneurship" },
        { "@type": "Thing", "name": "Small business" }
      ],
      "publisher": { "@id": "https://nextax.ai/#organization" },
      "primaryImageOfPage": {
        "@type": "ImageObject",
        "url": "https://nextax.ai/images/business-plan-guide.jpg"
      },

      "datePublished": "2026-01-20",
      "dateModified": "2026-01-20"
    },
    {
      "@type": "Article",
      "@id": "https://nextax.ai/resources/guides/do-i-need-a-business-plan#article",
      "headline": "Do I Need a Business Plan — and What Should Be in It for a New Business?",
      "description": "Learn when a business plan is required, what to include, and how business plans connect to structure and taxes for first-time entrepreneurs.",
      "author": {
        "@type": "Organization",
        "name": "NexTax.AI"
      },
      "publisher": { "@id": "https://nextax.ai/#organization" },
      "mainEntityOfPage": {
        "@id": "https://nextax.ai/resources/guides/do-i-need-a-business-plan#webpage"
      },
      "datePublished": "2026-01-20",
      "dateModified": "2026-01-20",
      "articleSection": [
        "Business planning",
        "Business model",
        "Financial projections",
        "Entity formation"
      ],
      "keywords": [
        "business plan",
        "do I need a business plan",
        "business model",
        "financial projections",
        "first-time entrepreneur",
        "LLC formation",
        "small business"
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://nextax.ai/resources/guides/do-i-need-a-business-plan#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do I need a business plan to form an LLC?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. You can form an LLC without a business plan, but having one helps ensure the structure fits your goals."
          }
        },
        {
          "@type": "Question",
          "name": "Does Shopify require a business plan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Platforms do not require business plans, but lenders and partners might."
          }
        },
        {
          "@type": "Question",
          "name": "Can a one-page business plan work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. One-page or lean plans are common for early-stage businesses."
          }
        },
        {
          "@type": "Question",
          "name": "Do I need financial projections before making money?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes—basic projections help avoid cash flow problems."
          }
        },
        {
          "@type": "Question",
          "name": "Should my business plan change after launch?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Absolutely. Plans should evolve as real data replaces assumptions."
          }
        }
      ]
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://nextax.ai/resources/guides/do-i-need-a-business-plan#breadcrumbs",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://nextax.ai/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Resources",
          "item": "https://nextax.ai/resources"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Do I Need a Business Plan?",
          "item": "https://nextax.ai/resources/guides/do-i-need-a-business-plan"
        }
      ]
    }
  ]
}

export default function DoINeedABusinessPlanPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      question: "Do I need a business plan to form an LLC?",
      answer: "No. You can form an LLC without a business plan, but having one helps ensure the structure fits your goals."
    },
    {
      question: "Does Shopify require a business plan?",
      answer: "No. Platforms do not require business plans, but lenders and partners might."
    },
    {
      question: "Can a one-page business plan work?",
      answer: "Yes. One-page or lean plans are common for early-stage businesses."
    },
    {
      question: "Do I need financial projections before making money?",
      answer: "Yes—basic projections help avoid cash flow problems."
    },
    {
      question: "Should my business plan change after launch?",
      answer: "Absolutely. Plans should evolve as real data replaces assumptions."
    }
  ]

  const businessPlanSections = [
    { title: "Executive Summary", icon: FileText, description: "Brief overview of your business concept and goals" },
    { title: "Market Analysis", icon: Target, description: "Who your customers are and why they'll choose you" },
    { title: "Product/Service Description", icon: Lightbulb, description: "What you're selling and the problem it solves" },
    { title: "Pricing & Revenue Model", icon: DollarSign, description: "How you'll charge and make money" },
    { title: "Operations", icon: Building2, description: "How the business runs day to day" },
    { title: "Financial Projections", icon: BarChart3, description: "Expected revenue, expenses, and cash flow" },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black pt-16">
        {/* Back Button */}
        <div className="container mx-auto px-4 py-8">
          <Link href="/resources">
            <Button variant="ghost" className="text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Resources
            </Button>
          </Link>
        </div>

        {/* Article Header */}
        <article className="container mx-auto px-4 pb-20">
          <div className="max-w-4xl mx-auto">
            {/* Meta Information */}
            <div className="mb-8">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-4">Business Formation</Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Do I Need a Business Plan
                <span className="text-emerald-400"> — and What Should Be in It?</span>
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>NexTax.AI Team</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>12 min read</span>
                </div>
                <div>January 20, 2026</div>
              </div>
            </div>

            {/* Article Content */}
            <div className="prose prose-invert prose-lg max-w-none">
              {/* Introduction */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-12">
                <p className="text-slate-200 text-lg leading-relaxed mb-0">
                  <span className="text-emerald-400 font-semibold">Short answer:</span> Not always—but most new businesses benefit from having one, even if it's simple. You do not need a formal business plan to legally start a business in the U.S. However, a business plan becomes important when you want clarity on pricing, profitability, and growth—or when you need funding, partners, or loans.
                </p>
              </div>

              {/* Key Stat Callout */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-12">
                <div className="flex items-start gap-4">
                  <BarChart3 className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-blue-200 font-semibold mb-2">Key Statistic</p>
                    <p className="text-slate-300 mb-0">
                      According to the U.S. Census Bureau (2023), Americans filed <span className="text-white font-semibold">5.5 million new business applications</span>, many of which started without outside funding—making lean planning far more common than formal investor-style plans.
                    </p>
                  </div>
                </div>
              </div>

              {/* Expert Quote */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-12">
                <div className="flex items-start gap-4">
                  <Lightbulb className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-slate-300 mb-2 italic">
                      "A business plan is not about predicting the future—it's about understanding the key drivers of success and failure."
                    </p>
                    <p className="text-slate-400 text-sm mb-0">— William Sahlman, Harvard Business School</p>
                  </div>
                </div>
              </div>

              {/* Section: When Required */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-amber-400" />
                  </div>
                  When Is a Business Plan Required?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  A business plan is required when <span className="text-white font-semibold">someone else needs to evaluate your business risk</span>.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">You'll typically need a formal business plan if you're:</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>Applying for a <span className="text-white">bank loan or SBA financing</span></span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>Seeking <span className="text-white">grants or investor funding</span></span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>Pitching to <span className="text-white">partners or co-founders</span></span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <BarChart3 className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                    <p className="text-slate-300 mb-0">
                      The U.S. Small Business Administration reports that over <span className="text-white font-semibold">70% of SBA loan applications</span> require detailed financial projections and written business plans.
                    </p>
                  </div>
                </div>

                <p className="text-slate-400">
                  In contrast, ecommerce platforms and marketplaces do not require business plans to operate. Banks and investors are less interested in ideas and more focused on numbers: cash flow, margins, and risk exposure.
                </p>
              </section>

              {/* Section: Business Plan vs Business Model */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-purple-400" />
                  </div>
                  Business Plan vs Business Model: What's the Difference?
                </h2>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-purple-500/10 border-purple-500/30">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-purple-300 mb-3">Business Model</h3>
                      <p className="text-slate-300 mb-0">Explains <span className="text-white font-semibold">how you make money</span>—who you sell to, what you sell, how you price, and how revenue flows.</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-blue-300 mb-3">Business Plan</h3>
                      <p className="text-slate-300 mb-0">Explains <span className="text-white font-semibold">how the business works overall</span>—includes the business model plus operations, marketing, and financial forecasts.</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    <span className="text-amber-300 font-semibold">Why this matters:</span> Many founders confuse the two, leading to over-planning or under-planning. Complex models often hide weak margins. Simple models make profitability (or lack of it) obvious.
                  </p>
                </div>
              </section>

              {/* Section: Simple Business Model */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-emerald-400" />
                  </div>
                  What Should a Simple Business Model Include?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  A simple business model should answer <span className="text-white font-semibold">five questions clearly</span>:
                </p>

                <div className="grid gap-3 mb-6">
                  {[
                    "Who is your customer?",
                    "What problem do you solve?",
                    "How do you charge?",
                    "How do you deliver the product or service?",
                    "How do you keep a profit after expenses?"
                  ].map((question, index) => (
                    <Card key={index} className="bg-gray-900/50 border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                            {index + 1}
                          </div>
                          <p className="text-slate-200 mb-0">{question}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <Lightbulb className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-slate-300 mb-2 italic">
                        "Bad businesses are destroyed by competition. Good businesses earn profits."
                      </p>
                      <p className="text-slate-400 text-sm mb-0">— Peter Thiel, Entrepreneur & Investor</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section: Six Core Sections */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-cyan-400" />
                  </div>
                  The 6 Core Sections Every Business Plan Needs
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  A strong business plan for a new founder includes six core sections—no more, no less:
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {businessPlanSections.map((section, index) => (
                    <Card key={index} className="bg-gray-900/50 border-gray-700 hover:border-emerald-500/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <section.icon className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold mb-1">{section.title}</h4>
                            <p className="text-slate-400 text-sm mb-0">{section.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Section: Market Analysis */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-400" />
                  </div>
                  How Detailed Does Market Analysis Need to Be?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Market analysis should be <span className="text-white font-semibold">specific, not academic</span>. You do not need long industry reports. Instead, define your ideal customer, their problem, and why they would choose you over alternatives.
                </p>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                    <p className="text-slate-300 mb-0">
                      According to CB Insights, <span className="text-white font-semibold">35% of startups fail due to lack of market demand</span>, not execution problems.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-slate-300 mb-0 italic">
                    Y Combinator advises founders to "start with a narrow, well-defined customer and expand later."
                  </p>
                </div>
              </section>

              {/* Section: Pricing */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-amber-400" />
                  </div>
                  How Should I Think About Pricing?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Pricing should reflect <span className="text-white font-semibold">costs, value, and margin—simultaneously</span>.
                </p>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 mb-6">
                  <p className="text-slate-300 mb-0">
                    <span className="text-amber-300 font-semibold">Common mistake:</span> Many first-time entrepreneurs underprice to attract customers, then struggle to cover expenses or taxes. A good plan shows how pricing supports sustainability, not just sales volume.
                  </p>
                </div>

                <p className="text-slate-400">
                  Pricing decisions affect more than revenue—they influence taxes, entity choice, and long-term scalability.
                </p>
              </section>

              {/* Section: Financial Projections */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-emerald-400" />
                  </div>
                  What Financial Projections Do I Need?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  You need <span className="text-white font-semibold">basic, assumption-based projections</span>—not perfect forecasts.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">At minimum, include:</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>Estimated monthly revenue</span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>Key expenses (fixed and variable)</span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>Cash flow expectations</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                    <p className="text-slate-300 mb-0">
                      The U.S. Bank study on small business failures found that <span className="text-white font-semibold">82% fail due to cash flow mismanagement</span>.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section: How Long */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6">How Long Should a Business Plan Be?</h2>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-6 text-center">
                      <p className="text-4xl font-bold text-emerald-400 mb-2">3–7 pages</p>
                      <p className="text-slate-300 mb-0">Sufficient for most new businesses</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-6 text-center">
                      <p className="text-4xl font-bold text-blue-400 mb-2">15+ pages</p>
                      <p className="text-slate-300 mb-0">Only for institutional funding or complex partnerships</p>
                    </CardContent>
                  </Card>
                </div>

                <p className="text-slate-400">
                  Shorter is better—until money is involved.
                </p>
              </section>

              {/* Section: Connection to Structure and Taxes */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-purple-400" />
                  </div>
                  How Business Plans Connect to Structure and Taxes
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  <span className="text-white font-semibold">Most guides ignore this</span>—but your business plan affects legal and tax decisions.
                </p>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6 mb-6">
                  <p className="text-slate-300 mb-0">
                    Revenue expectations, margins, and risk exposure influence whether operating informally makes sense or whether forming an entity becomes necessary. <span className="text-white font-semibold">Fixing structure mistakes later is often more expensive than planning correctly upfront.</span>
                  </p>
                </div>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      When Should a Business Plan Trigger Entity Formation?
                    </h3>
                    <p className="text-slate-300 mb-4">
                      When revenue becomes consistent or risk increases, structure matters.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-slate-300">Growing revenue projections</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-slate-300">Customer liability exposure</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-slate-300">Meaningful profit margins</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* FAQ Section */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <Card key={index} className="bg-gray-900/50 border-gray-700">
                      <CardContent className="p-0">
                        <button
                          onClick={() => setOpenFaq(openFaq === index ? null : index)}
                          className="w-full p-6 flex items-center justify-between text-left"
                        >
                          <span className="text-white font-semibold pr-4">{faq.question}</span>
                          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
                        </button>
                        {openFaq === index && (
                          <div className="px-6 pb-6 pt-0">
                            <p className="text-slate-300">{faq.answer}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* CTA */}
              <Card className="bg-gradient-to-r from-emerald-500 to-cyan-500 border-emerald-500/30">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Ready to Turn Your Plan Into a Real Business?
                  </h3>
                  <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
                    A business plan is the starting point—not the finish line. Once you understand your revenue model, costs, and growth path, the next step is ensuring your business is structured correctly for liability protection and taxes.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Link href="/pricing">
                      <Button className="bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-700 hover:to-cyan-600 text-white px-8">
                        View Formation Packages
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <Link href="/contact">
                      <Button variant="outline" className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500 bg-white">
                        Talk to an Expert
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </article>
      </div>
    </>
  )
}
