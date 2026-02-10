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
  DollarSign,
  Building2,
  ShieldCheck,
  TrendingUp,
  Calculator,
  FileText,
  BarChart3,
  MapPin,
  Lightbulb,
  ChevronDown,
  X,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://nextax.ai/#organization",
      name: "NexTax.AI",
      url: "https://nextax.ai/",
      logo: {
        "@type": "ImageObject",
        url: "https://nextax.ai/nextax-logo.png",
      },
      description:
        "NexTax.AI helps new entrepreneurs and ecommerce founders form and register LLC and S-corp entities, with founder-led expertise and fintech automation.",
      sameAs: ["https://www.linkedin.com/company/nextax-ai"],
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          url: "https://nextax.ai/contact",
          availableLanguage: ["English"],
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://nextax.ai/#website",
      url: "https://nextax.ai/",
      name: "NexTax.AI",
      publisher: { "@id": "https://nextax.ai/#organization" },
    },
    {
      "@type": "WebPage",
      "@id":
        "https://nextax.ai/resources/guides/tax-planning-high-growth-companies#webpage",
      url: "https://nextax.ai/resources/guides/tax-planning-high-growth-companies",
      name: "Scaling Your Ecommerce Business: Tax Planning Strategies for High-Growth Companies",
      isPartOf: { "@id": "https://nextax.ai/#website" },
      about: [
        { "@type": "Thing", name: "Tax planning" },
        { "@type": "Thing", name: "Ecommerce" },
        { "@type": "Thing", name: "S Corporation" },
        { "@type": "Thing", name: "Multi-state tax nexus" },
        { "@type": "Thing", name: "Business scaling" },
      ],
      publisher: { "@id": "https://nextax.ai/#organization" },
      datePublished: "2026-01-05",
      dateModified: "2026-01-05",
    },
    {
      "@type": "Article",
      "@id":
        "https://nextax.ai/resources/guides/tax-planning-high-growth-companies#article",
      headline:
        "Scaling Your Ecommerce Business: Tax Planning Strategies for High-Growth Companies",
      description:
        "Advanced tax strategies for ecommerce founders scaling past $500K—covering entity optimization, multi-state nexus, compensation planning, and exit readiness.",
      author: {
        "@type": "Person",
        name: "Steve Morello, CPA",
        url: "https://nextax.ai/about",
      },
      publisher: { "@id": "https://nextax.ai/#organization" },
      mainEntityOfPage: {
        "@id":
          "https://nextax.ai/resources/guides/tax-planning-high-growth-companies#webpage",
      },
      datePublished: "2026-01-05",
      dateModified: "2026-01-05",
      articleSection: [
        "Tax planning for ecommerce",
        "Entity structure optimization",
        "Multi-state tax nexus",
        "Exit planning",
      ],
      keywords: [
        "ecommerce tax planning",
        "high-growth company taxes",
        "S-Corp for ecommerce",
        "multi-state nexus",
        "tax strategy scaling",
        "ecommerce exit planning",
      ],
    },
    {
      "@type": "FAQPage",
      "@id":
        "https://nextax.ai/resources/guides/tax-planning-high-growth-companies#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "When does an S-Corp make sense for ecommerce founders?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "An S-Corp election generally becomes tax-efficient when net profits consistently exceed $50,000-$80,000 annually. At that level, the self-employment tax savings on distributions typically outweigh the added payroll and compliance costs.",
          },
        },
        {
          "@type": "Question",
          name: "Do ecommerce businesses qualify for R&D tax credits?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Ecommerce companies that develop proprietary technology, custom software, unique product formulations, or novel manufacturing processes may qualify for the federal R&D tax credit under IRC Section 41.",
          },
        },
        {
          "@type": "Question",
          name: "How do I know if I've triggered state tax nexus?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You may have triggered nexus if you exceed a state's economic threshold (commonly $100K in sales or 200 transactions), store inventory in-state (e.g., FBA warehouses), or have employees or contractors operating there.",
          },
        },
        {
          "@type": "Question",
          name: "Is QuickBooks enough for scaling my ecommerce business?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "QuickBooks is a bookkeeping tool, not a tax planning solution. It records transactions but doesn't optimize entity structure, compensation strategy, or multi-state compliance. Scaling businesses need proactive tax planning alongside bookkeeping.",
          },
        },
        {
          "@type": "Question",
          name: "When should an ecommerce founder start planning for an exit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Exit-focused tax planning should begin 2-3 years before a potential sale. Entity structure, state tax footprint, and income characterization all directly affect valuation and after-tax proceeds.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id":
        "https://nextax.ai/resources/guides/tax-planning-high-growth-companies#breadcrumbs",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://nextax.ai/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Resources",
          item: "https://nextax.ai/resources",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Scaling Your Ecommerce Business: Tax Planning Strategies for High-Growth Companies",
          item: "https://nextax.ai/resources/guides/tax-planning-high-growth-companies",
        },
      ],
    },
  ],
}

// Tax Planning Strategies for High-Growth Companies Blog Post
export default function TaxPlanningHighGrowthPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      question: "When does an S-Corp make sense for ecommerce founders?",
      answer:
        "An S-Corp election generally becomes tax-efficient when net profits consistently exceed $50,000-$80,000 annually. At that level, the self-employment tax savings on distributions typically outweigh the added payroll and compliance costs.",
    },
    {
      question: "Do ecommerce businesses qualify for R&D tax credits?",
      answer:
        "Yes. Ecommerce companies that develop proprietary technology, custom software, unique product formulations, or novel manufacturing processes may qualify for the federal R&D tax credit under IRC Section 41.",
    },
    {
      question: "How do I know if I've triggered state tax nexus?",
      answer:
        "You may have triggered nexus if you exceed a state's economic threshold (commonly $100K in sales or 200 transactions), store inventory in-state (e.g., FBA warehouses), or have employees or contractors operating there.",
    },
    {
      question:
        "Is QuickBooks enough for scaling my ecommerce business?",
      answer:
        "QuickBooks is a bookkeeping tool, not a tax planning solution. It records transactions but doesn't optimize entity structure, compensation strategy, or multi-state compliance. Scaling businesses need proactive tax planning alongside bookkeeping.",
    },
    {
      question:
        "When should an ecommerce founder start planning for an exit?",
      answer:
        "Exit-focused tax planning should begin 2-3 years before a potential sale. Entity structure, state tax footprint, and income characterization all directly affect valuation and after-tax proceeds.",
    },
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
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white"
            >
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
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-4">
                Growth
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Scaling Your Ecommerce Business: Tax Planning Strategies
                <span className="text-emerald-400">
                  {" "}
                  for High-Growth Companies
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Steve Morello, CPA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>11 min read</span>
                </div>
                <div>January 5, 2026</div>
              </div>
            </div>

            {/* Article Content */}
            <div className="prose prose-invert prose-lg max-w-none">
              {/* Introduction */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-12">
                <p className="text-slate-200 text-lg leading-relaxed mb-0">
                  As ecommerce companies scale, tax complexity increases
                  faster than revenue. Founders face higher effective tax
                  rates, multi-state nexus exposure, payroll compliance
                  issues, and missed planning opportunities when they rely
                  on reactive bookkeeping tools instead of proactive tax
                  strategy. This guide covers the frameworks that
                  matter most once you move past the startup phase.
                </p>
              </div>

              {/* Key Stat Callout */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 mb-12">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-amber-200 font-semibold mb-2">
                      Key Statistics
                    </p>
                    <p className="text-slate-300 mb-0">
                      According to the SBA, over{" "}
                      <span className="text-white font-semibold">
                        93% of small businesses
                      </span>{" "}
                      overpay on taxes due to lack of proactive planning.
                      Meanwhile, multi-state ecommerce sellers have grown
                      by over 40% since the 2018{" "}
                      <em>South Dakota v. Wayfair</em> ruling, triggering
                      nexus obligations most founders don't know about.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1: Tax Challenges at Scale */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  What Tax Planning Challenges Do Ecommerce Businesses Face
                  as They Scale?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Early-stage tax setups{" "}
                  <span className="text-white font-semibold">
                    break as revenue grows
                  </span>
                  . What worked at $50K in sales creates real problems at
                  $500K+. The gap between "doing taxes" and actual tax
                  planning becomes expensive.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Where early-stage setups fail:
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-slate-300">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Higher effective tax rates
                          </span>{" "}
                          from suboptimal entity structures
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Multi-state nexus exposure
                          </span>{" "}
                          from FBA warehouses, 3PLs, and economic thresholds
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Payroll compliance gaps
                          </span>{" "}
                          when adding employees or contractors
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Missed deductions and credits
                          </span>{" "}
                          that bookkeeping software cannot identify
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    <span className="text-red-400 font-semibold">
                      Reality check:
                    </span>{" "}
                    QuickBooks, ZenBusiness, and similar platforms organize
                    historical data. They do{" "}
                    <span className="text-white font-semibold">not</span>{" "}
                    design tax outcomes. Scaling ecommerce founders need
                    strategy layered on top of bookkeeping.
                  </p>
                </div>
              </section>

              {/* Section 2: When to Start Proactive Tax Planning */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-amber-400" />
                  </div>
                  When Should an Ecommerce Founder Start Proactive Tax
                  Planning?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Ecommerce founders should begin proactive tax planning
                  once revenue exceeds{" "}
                  <span className="text-emerald-400 font-semibold">
                    ~$500K annually
                  </span>
                  , margins stabilize, or operations expand across
                  states--before profitability peaks and options narrow.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                      Trigger Points for Tax Planning
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-400">
                          Revenue exceeds $500K/year:
                        </span>
                        <span className="text-white font-semibold">
                          Entity review needed
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <span className="text-amber-300">
                          Margins stabilize above 15-20%:
                        </span>
                        <span className="text-white font-semibold">
                          Compensation planning starts
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                        <span className="text-emerald-300">
                          Multi-state operations begin:
                        </span>
                        <span className="text-white font-semibold">
                          Nexus analysis required
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <Lightbulb className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-emerald-300 font-semibold mb-2">
                        Expert Perspective
                      </p>
                      <p className="text-slate-300 mb-0 italic">
                        "The best time to plan is before profitability
                        peaks. Once Q4 revenue hits, your options for the
                        current tax year narrow dramatically. Planning in
                        Q1 and Q2 gives you 9-12 months of runway to
                        optimize."
                      </p>
                      <p className="text-slate-500 text-sm mt-2">
                        -- Steve Morello, CPA
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: Entity Structure Impact */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-400" />
                  </div>
                  How Does Business Entity Structure Impact Taxes for
                  High-Growth Ecommerce?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Entity structure directly determines self-employment tax
                  exposure, payroll obligations, audit risk, and
                  scalability. The wrong structure can cost ecommerce
                  founders{" "}
                  <span className="text-white font-semibold">
                    tens of thousands annually
                  </span>{" "}
                  as profits rise.
                </p>

                {/* Sole Prop Risks */}
                <Card className="bg-red-500/10 border-red-500/30 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Sole Proprietor & Single-Member LLC Risks at Scale
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-slate-300">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <span>
                          Full{" "}
                          <span className="text-white font-semibold">
                            15.3% self-employment tax
                          </span>{" "}
                          on all net profit
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <span>
                          No separation between personal and business
                          liability
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <span>
                          Limited operational scalability and investor
                          readiness
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* S-Corp Benefits */}
                <Card className="bg-emerald-500/10 border-emerald-500/30 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      When an S-Corp Becomes Tax-Efficient
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-emerald-300 font-semibold mb-2">
                          Profit Threshold
                        </p>
                        <p className="text-slate-300">
                          $50K-$80K+ in net annual profit
                        </p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-emerald-300 font-semibold mb-2">
                          Key Benefit
                        </p>
                        <p className="text-slate-300">
                          Distributions avoid 15.3% SE tax
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          Split income into salary (taxed) and distributions
                          (not subject to SE tax)
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          Must pay "reasonable salary" per IRS guidelines
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-1" />
                        <span>
                          Common mistake: electing too early before profits
                          justify payroll and compliance costs
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* C-Corp / Hybrid */}
                <Card className="bg-blue-500/10 border-blue-500/30 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      When C Corporations or Hybrid Structures Make Sense
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Inventory-heavy brands
                          </span>{" "}
                          reinvesting aggressively at lower corporate rates
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Reinvestment strategies
                          </span>{" "}
                          where profits stay in the business for growth
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Exit planning
                          </span>{" "}
                          where QSBS exclusion or stock sale structure
                          matters
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* Section 4: Multi-State Tax Issues */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-purple-400" />
                  </div>
                  What Multi-State Tax Issues Do Ecommerce Founders
                  Commonly Overlook?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  High-growth ecommerce businesses frequently trigger
                  income tax and sales tax nexus without realizing it,
                  creating exposure to back taxes, penalties, and
                  compliance burdens across multiple states.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Economic Nexus
                      </h3>
                      <p className="text-slate-300 text-sm mb-2">
                        Most states set thresholds at{" "}
                        <span className="text-white font-semibold">
                          $100K in sales or 200 transactions
                        </span>
                        . Once exceeded, you owe sales tax in that state
                        regardless of physical presence.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Fulfillment Center Nexus
                      </h3>
                      <p className="text-slate-300 text-sm mb-2">
                        Using{" "}
                        <span className="text-white font-semibold">
                          Amazon FBA, 3PLs, or regional warehouses
                        </span>{" "}
                        creates physical nexus in every state where inventory
                        is stored.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Income Tax Apportionment
                      </h3>
                      <p className="text-slate-300 text-sm mb-2">
                        Some states tax a{" "}
                        <span className="text-white font-semibold">
                          portion of your total business income
                        </span>{" "}
                        based on the percentage of sales, payroll, or
                        property in that state.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Software Limitations
                      </h3>
                      <p className="text-slate-300 text-sm mb-2">
                        Tools like TaxJar or Avalara handle{" "}
                        <span className="text-white font-semibold">
                          sales tax collection
                        </span>
                        , but don't address income tax nexus, apportionment,
                        or filing obligations.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                    <p className="text-slate-300 mb-0">
                      <span className="text-amber-200 font-semibold">
                        Common blind spot:
                      </span>{" "}
                      Many ecommerce founders automate sales tax collection
                      but completely overlook{" "}
                      <span className="text-white font-semibold">
                        state income tax filing obligations
                      </span>{" "}
                      triggered by the same nexus thresholds.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 5: Reducing Federal Tax Liability */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                  </div>
                  How Can Ecommerce Founders Reduce Federal Tax Liability
                  Legally?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Ecommerce founders can reduce federal tax liability
                  through structural planning, timing strategies, and
                  targeted deductions--not aggressive write-offs or risky
                  loopholes.
                </p>

                {/* Compensation */}
                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                      Compensation & Payroll Optimization
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Salary vs distributions:
                          </span>{" "}
                          S-Corp owners must take a reasonable salary, but
                          remaining profit flows as distributions without SE
                          tax
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Strategic payroll timing:
                          </span>{" "}
                          Aligning bonus payouts and salary adjustments with
                          tax year planning
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Inventory & Timing */}
                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      Inventory, Cost Accounting & Timing Strategies
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Cash vs accrual:
                          </span>{" "}
                          The right accounting method can materially shift
                          when income is recognized
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Inventory capitalization:
                          </span>{" "}
                          UNICAP rules (Section 263A) apply to larger sellers
                          and affect COGS timing
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Credits */}
                <Card className="bg-emerald-500/10 border-emerald-500/30 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-emerald-400" />
                      Credits & Incentives Ecommerce Brands Miss
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            R&D tax credits (IRC Section 41):
                          </span>{" "}
                          Yes, ecommerce qualifies--custom software,
                          proprietary tools, unique product development
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            State-level incentives:
                          </span>{" "}
                          Job creation credits, enterprise zone benefits, and
                          property tax abatements
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          <span className="text-white font-semibold">
                            Depreciation strategies:
                          </span>{" "}
                          Section 179 and bonus depreciation for equipment,
                          software, and warehouse improvements
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* Section 6: Bookkeeping vs Tax Strategy */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-slate-300" />
                  </div>
                  Why Bookkeeping Software Isn{"'"}t a Tax Strategy
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Bookkeeping platforms like QuickBooks organize historical
                  data but do not design tax outcomes. They are
                  necessary--but insufficient--for high-growth ecommerce
                  companies.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6 overflow-hidden">
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th className="text-left p-4 text-slate-300 font-semibold">
                            Function
                          </th>
                          <th className="text-center p-4 text-slate-300 font-semibold">
                            Bookkeeping
                          </th>
                          <th className="text-center p-4 text-slate-300 font-semibold">
                            Tax Planning
                          </th>
                          <th className="text-center p-4 text-slate-300 font-semibold">
                            Compliance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-slate-300">
                            Records transactions
                          </td>
                          <td className="p-4 text-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                          </td>
                          <td className="p-4 text-center">
                            <X className="w-5 h-5 text-slate-500 mx-auto" />
                          </td>
                          <td className="p-4 text-center">
                            <X className="w-5 h-5 text-slate-500 mx-auto" />
                          </td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-slate-300">
                            Optimizes entity structure
                          </td>
                          <td className="p-4 text-center">
                            <X className="w-5 h-5 text-slate-500 mx-auto" />
                          </td>
                          <td className="p-4 text-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                          </td>
                          <td className="p-4 text-center">
                            <X className="w-5 h-5 text-slate-500 mx-auto" />
                          </td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-slate-300">
                            Files returns
                          </td>
                          <td className="p-4 text-center">
                            <X className="w-5 h-5 text-slate-500 mx-auto" />
                          </td>
                          <td className="p-4 text-center">
                            <X className="w-5 h-5 text-slate-500 mx-auto" />
                          </td>
                          <td className="p-4 text-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                          </td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-slate-300">
                            Designs tax outcomes
                          </td>
                          <td className="p-4 text-center">
                            <X className="w-5 h-5 text-slate-500 mx-auto" />
                          </td>
                          <td className="p-4 text-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                          </td>
                          <td className="p-4 text-center">
                            <X className="w-5 h-5 text-slate-500 mx-auto" />
                          </td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-slate-300">
                            Identifies credits
                          </td>
                          <td className="p-4 text-center">
                            <X className="w-5 h-5 text-slate-500 mx-auto" />
                          </td>
                          <td className="p-4 text-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                          </td>
                          <td className="p-4 text-center">
                            <X className="w-5 h-5 text-slate-500 mx-auto" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </section>

              {/* Section 7: Exit Planning */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-cyan-400" />
                  </div>
                  How Should Ecommerce Founders Think About Tax Planning
                  Before an Exit?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Exit-focused tax planning must begin{" "}
                  <span className="text-white font-semibold">
                    years in advance
                  </span>
                  . Structure, state footprint, and income characterization
                  directly affect valuation and after-tax proceeds.
                </p>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-2">
                        QSBS Exclusion
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Qualified Small Business Stock can exclude up to
                        $10M in capital gains--but requires C-Corp
                        structure and 5-year hold
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-2">
                        Asset vs Stock Sale
                      </h3>
                      <p className="text-slate-400 text-sm">
                        The structure of the sale dramatically impacts tax
                        treatment--buyers prefer asset sales, sellers
                        prefer stock sales
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-2">
                        Clean Structure
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Clean books are not enough--clean{" "}
                        <span className="text-white font-semibold">
                          entity structure
                        </span>{" "}
                        and state compliance drive valuation multiples
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Section 8: Scalable Framework */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-emerald-400" />
                  </div>
                  What Does a Scalable Tax Planning Framework Look Like?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  A scalable tax framework combines entity design,
                  multi-state compliance awareness, compensation planning,
                  and quarterly strategy reviews--not one-time fixes.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-emerald-400 mb-2">
                        01
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Structural Review
                      </h3>
                      <p className="text-slate-300 text-sm">
                        Annual evaluation of entity type, tax elections,
                        and ownership structure against current
                        profitability
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-emerald-400 mb-2">
                        02
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        State Exposure Analysis
                      </h3>
                      <p className="text-slate-300 text-sm">
                        Ongoing monitoring of economic nexus thresholds,
                        fulfillment locations, and employee presence
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-emerald-400 mb-2">
                        03
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Compensation Strategy
                      </h3>
                      <p className="text-slate-300 text-sm">
                        Salary vs distribution optimization calibrated to
                        IRS reasonable compensation standards
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-6">
                      <div className="text-3xl font-bold text-emerald-400 mb-2">
                        04
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Quarterly Planning Cadence
                      </h3>
                      <p className="text-slate-300 text-sm">
                        Proactive quarterly reviews rather than once-a-year
                        reactive filing
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Section 9: When to Talk to an Advisor */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6">
                  When Should an Ecommerce Founder Talk to a Tax Advisor?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Founders should consult a tax advisor when growth creates
                  complexity--multi-state operations, payroll, rising
                  profits--not just when filing deadlines approach.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Signs it{"'"}s time for professional tax planning:
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          Revenue growing past $500K with increasing
                          margins
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          Selling across multiple states or using FBA /
                          3PL fulfillment
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          Hiring employees or engaging contractors
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          Considering an entity change or S-Corp election
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span>
                          Thinking about a potential exit within 2-3 years
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* FAQ Section */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <Card
                      key={index}
                      className="bg-gray-900/50 border-gray-700"
                    >
                      <CardContent className="p-0">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenFaq(
                              openFaq === index ? null : index,
                            )
                          }
                          className="w-full p-6 flex items-center justify-between text-left"
                        >
                          <span className="text-white font-semibold pr-4">
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === index ? "rotate-180" : ""}`}
                          />
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

              {/* Sources */}
              <section className="mb-12">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Sources Cited
                </h3>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li>
                    Internal Revenue Service. (2024). IRS Publication 15
                    (Circular E), Employer{"'"}s Tax Guide.
                  </li>
                  <li>
                    Internal Revenue Service. (2024). IRS Publication 505,
                    Tax Withholding and Estimated Tax.
                  </li>
                  <li>
                    Internal Revenue Service. (2024). SOI Tax Stats -
                    Individual Income Tax Returns.
                  </li>
                  <li>
                    U.S. Census Bureau. (2024). Quarterly Retail E-Commerce
                    Sales.
                  </li>
                  <li>
                    U.S. Small Business Administration. (2023). Small
                    Business Tax Statistics.
                  </li>
                  <li>
                    State Revenue Department guidance (multi-state nexus
                    thresholds post-Wayfair).
                  </li>
                </ul>
              </section>

              {/* CTA */}
              <Card className="bg-gradient-to-r from-emerald-500 to-cyan-500 border-emerald-500/30">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Ready to Build a Scalable Tax Strategy?
                  </h3>
                  <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                    NexTax.AI helps ecommerce founders move from reactive
                    bookkeeping to proactive tax planning--entity
                    optimization, multi-state compliance, and quarterly
                    strategy reviews designed for growth.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Link href="/pricing">
                      <Button className="bg-gradient-to-r from-emerald-300 to-cyan-300 hover:from-emerald-600 hover:to-cyan-600 text-white px-8">
                        View Packages
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <Link href="/contact">
                      <Button
                        variant="outline"
                        className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 bg-white"
                      >
                        Talk to an Advisor
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
