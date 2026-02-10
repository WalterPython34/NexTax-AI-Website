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
  Calculator,
  FileText,
  Sparkles,
  ChevronDown,
  Receipt,
  Home,
  Package,
  CreditCard,
  Briefcase,
  GraduationCap,
  Plane,
  MapPin,
  Wrench,
  Lightbulb,
  HeartPulse,
  Monitor,
  Scale,
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
        "NexTax.AI helps new entrepreneurs and ecommerce self-employed individuals form and register LLC and S-corp entities, with founder-led expertise and fintech automation.",
      sameAs: ["https://www.linkedin.com/company/nextax-ai"],
    },
    {
      "@type": "WebSite",
      "@id": "https://nextax.ai/#website",
      url: "https://nextax.ai/",
      name: "NexTax.AI",
      publisher: { "@id": "https://nextax.ai/#organization" },
    },
    {
      "@type": "Article",
      "@id":
        "https://nextax.ai/resources/guides/maximizing-startup-tax-deductions#article",
      headline:
        "Maximizing Tax Deductions: 15 Often-Missed Write-Offs for Startups",
      description:
        "Discover 15 often-missed tax deductions for ecommerce startups. A complete guide for LLCs and S-corps to reduce taxes legally and strategically.",
      image: ["https://nextax.ai/tax-deductions-calculator.jpg"],
      author: {
        "@type": "Person",
        name: "Steve Morello, CPA",
        url: "https://nextax.ai/about",
      },
      publisher: { "@id": "https://nextax.ai/#organization" },
      datePublished: "2026-01-08",
      dateModified: "2026-01-08",
      articleSection: [
        "Tax deductions for startups",
        "Ecommerce tax strategy",
        "LLC and S-Corp deductions",
      ],
      keywords: [
        "startup tax deductions",
        "ecommerce write-offs",
        "LLC deductions",
        "S-Corp deductions",
        "missed tax deductions",
        "small business tax strategy",
      ],
    },
    {
      "@type": "FAQPage",
      "@id":
        "https://nextax.ai/resources/guides/maximizing-startup-tax-deductions#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Are deductions different for LLCs vs S-corps?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Structure affects how deductions reduce tax and whether payroll tax applies. S-corps have unique deduction strategies like reasonable salary optimization and owner health insurance deductions that don't apply to default LLCs.",
          },
        },
        {
          "@type": "Question",
          name: "Can I deduct everything I paid for the business?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Only if it is ordinary, necessary, and properly documented. The IRS requires that expenses be both common in your industry and helpful for your business, with adequate records to substantiate each deduction.",
          },
        },
        {
          "@type": "Question",
          name: "Do deductions increase audit risk?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Incorrect deductions do. Properly structured and documented deductions actually reduce risk by demonstrating professional tax management.",
          },
        },
        {
          "@type": "Question",
          name: "Should I rely on software to find deductions?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Software records data. Strategy interprets it. Tools like QuickBooks and Collective are excellent for categorization and compliance, but they cannot provide the contextual judgment needed for entity-specific treatment, timing optimization, or reimbursement structuring.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id":
        "https://nextax.ai/resources/guides/maximizing-startup-tax-deductions#breadcrumbs",
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
          name: "Maximizing Tax Deductions: 15 Often-Missed Write-Offs for Startups",
          item: "https://nextax.ai/resources/guides/maximizing-startup-tax-deductions",
        },
      ],
    },
  ],
}

const deductions = [
  {
    num: 1,
    title: "Reasonable Salary Optimization",
    badge: "S-Corps Only",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: DollarSign,
    iconColor: "text-blue-400",
    answer:
      "Many S-corp founders overpay payroll taxes by setting salaries higher than required -- or underpay and trigger audit risk.",
    detail:
      "The IRS requires S-corp owners who perform services to take a reasonable salary, subject to payroll tax. Anything above that threshold could often be taken as distributions not subject to self-employment tax.",
    whyMissed: [
      "Payroll software defaults to \"safe but expensive\"",
      "Founders fear IRS scrutiny and overcorrect",
      "No benchmarking analysis is done",
    ],
    impact:
      "A $20,000 salary misalignment can cost ~$3,000+ annually in unnecessary payroll tax.",
  },
  {
    num: 2,
    title: "Accountable Plan Reimbursements",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: Receipt,
    iconColor: "text-emerald-400",
    answer:
      "An accountable plan allows owners to reimburse themselves for business expenses tax-free, rather than deducting them personally.",
    items: [
      "Home office expenses",
      "Internet and phone",
      "Mileage",
      "Business use of personal assets",
    ],
    whyMissed: [
      "Often confused with deductions",
      "Requires a formal plan document",
      "Not supported natively in most bookkeeping tools",
    ],
    impact:
      "Reimbursements reduce taxable income without increasing payroll or self-employment tax.",
  },
  {
    num: 3,
    title: "Home Office (Done Correctly)",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: Home,
    iconColor: "text-amber-400",
    answer:
      "The home office deduction is legitimate when used exclusively and regularly -- but often misapplied or avoided entirely.",
    items: [
      "Depreciation passthrough",
      "Utilities allocation",
      "Repairs specific to the office",
      "Accountable plan treatment (for S-corps)",
    ],
    whyMissed: [
      "Skip it entirely out of fear",
      "Claim it incorrectly and invite risk",
    ],
    impact:
      "Correct structuring matters more than the square footage.",
  },
  {
    num: 4,
    title: "Inventory Carrying & Storage Costs",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: Package,
    iconColor: "text-cyan-400",
    answer:
      "Many ecommerce founders deduct inventory purchases -- but miss the associated carrying costs.",
    items: [
      "Third-party fulfillment storage",
      "Warehouse insurance",
      "Inventory handling fees",
      "Inbound shipping (non-COGS errors are common)",
    ],
    whyMissed: [
      "Inventory accounting is often simplified incorrectly in early growth stages",
    ],
    impact: "",
  },
  {
    num: 5,
    title: "Payment Processing & Platform Fees",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: CreditCard,
    iconColor: "text-purple-400",
    answer:
      "Payment processors deduct fees before payouts, causing founders to under-deduct expenses or misstate revenue.",
    items: [
      "Recording only net deposits",
      "Losing visibility into deductible fees",
      "Inconsistent treatment across platforms",
    ],
    whyMissed: [],
    impact:
      "This doesn't just affect deductions -- it affects reported revenue, which cascades into tax estimates and nexus thresholds.",
  },
  {
    num: 6,
    title: "Startup & Organizational Costs",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: Briefcase,
    iconColor: "text-orange-400",
    answer:
      "Startups can deduct or amortize up to $5,000 in startup costs and $5,000 in organizational costs.",
    items: [
      "Legal setup",
      "Entity formation",
      "Market research",
      "Pre-launch software",
    ],
    whyMissed: [
      "These costs occur before revenue exists -- and often before bookkeeping systems are live",
    ],
    impact: "",
  },
  {
    num: 7,
    title: "Sales Tax Paid as an Expense",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: Scale,
    iconColor: "text-red-400",
    answer:
      "Sales tax paid on expenses (not collected from customers) is often deductible -- but frequently miscategorized.",
    items: [
      "Equipment purchases",
      "Software with embedded tax",
      "State-specific non-recoverable taxes",
    ],
    whyMissed: [
      "Sales tax compliance tools rarely surface this distinction clearly",
    ],
    impact: "",
  },
  {
    num: 8,
    title: "Professional Fees Beyond Obvious Categories",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: FileText,
    iconColor: "text-slate-400",
    answer:
      "Legal, accounting, and advisory fees are deductible -- but many ecommerce founders miss less obvious items.",
    items: [
      "Entity restructuring costs",
      "Multi-state compliance consulting",
      "IP or brand protection work",
    ],
    whyMissed: [
      "Often buried in \"miscellaneous\" or capitalized incorrectly",
    ],
    impact: "",
  },
  {
    num: 9,
    title: "Software Stack Sprawl (Partial-Use)",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: Monitor,
    iconColor: "text-indigo-400",
    answer:
      "Many founders under-deduct SaaS tools because usage spans personal and business purposes.",
    items: [
      "Email platforms",
      "Cloud storage",
      "Design tools",
      "Analytics software",
    ],
    whyMissed: [],
    impact:
      "Documentation -- not perfection -- is what substantiates these deductions.",
  },
  {
    num: 10,
    title: "Education & Training Related to Business",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: GraduationCap,
    iconColor: "text-teal-400",
    answer:
      "Courses, conferences, and training are deductible when they maintain or improve existing business skills.",
    items: [
      "Platform-specific training",
      "Paid masterminds",
      "Operations workshops",
    ],
    whyMissed: [
      "Founders assume education is \"personal.\" The IRS focuses on skill relevance, not credentials.",
    ],
    impact: "",
  },
  {
    num: 11,
    title: "Business Travel Beyond Flights & Hotels",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: Plane,
    iconColor: "text-sky-400",
    answer:
      "Founders deduct airfare and lodging -- but miss associated travel expenses.",
    items: [
      "Ground transportation",
      "Luggage fees",
      "Internet charges",
      "Partial meals (where allowed)",
    ],
    whyMissed: [],
    impact:
      "Travel deductions fail most often due to incomplete substantiation, not ineligibility.",
  },
  {
    num: 12,
    title: "State & Local Business Taxes",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: MapPin,
    iconColor: "text-rose-400",
    answer:
      "State-level business taxes are deductible at the federal level but often misclassified.",
    items: [
      "Franchise taxes",
      "Gross receipts taxes",
      "Business license fees",
    ],
    whyMissed: [
      "These don't show up cleanly in federal-first tax workflows",
    ],
    impact: "",
  },
  {
    num: 13,
    title: "Depreciation Timing (Bonus vs Section 179)",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: Wrench,
    iconColor: "text-yellow-400",
    answer:
      "Depreciation isn't just about what you deduct -- it's about when.",
    items: [
      "Immediate expensing when income is low",
      "Straight-line depreciation without analysis",
    ],
    whyMissed: [
      "Founders default to one method without evaluating timing strategy",
    ],
    impact:
      "Strategic timing can preserve deductions for higher-income years.",
  },
  {
    num: 14,
    title: "R&D Credits for Ecommerce",
    badge: "LLCs & S-Corps",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: Lightbulb,
    iconColor: "text-amber-400",
    answer:
      "Ecommerce companies often qualify for R&D credits that they never claim.",
    items: [
      "Custom software development",
      "Backend system optimization",
      "Data and logistics improvements",
    ],
    whyMissed: [
      "R&D is misunderstood as \"lab work.\" In reality, it's about technical uncertainty and process improvement.",
    ],
    impact: "",
  },
  {
    num: 15,
    title: "Owner Health Insurance",
    badge: "S-Corps Only",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: HeartPulse,
    iconColor: "text-pink-400",
    answer:
      "S-corp owners can deduct health insurance premiums -- but only if handled correctly through payroll and reporting.",
    items: [
      "Paying personally without W-2 inclusion",
      "Missing above-the-line treatment",
      "Incorrect W-2 reporting",
    ],
    whyMissed: [],
    impact:
      "This is one of the most frequently botched deductions we see.",
  },
]

// Tax Planning Strategies Blog Post
export default function MaximizingStartupTaxDeductionsPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [expandedDeduction, setExpandedDeduction] = useState<number | null>(null)

  const faqs = [
    {
      question: "Are deductions different for LLCs vs S-corps?",
      answer:
        "Yes. Structure affects how deductions reduce tax and whether payroll tax applies. S-corps have unique deduction strategies like reasonable salary optimization and owner health insurance deductions that don't apply to default LLCs.",
    },
    {
      question: "Can I deduct everything I paid for the business?",
      answer:
        "Only if it is ordinary, necessary, and properly documented. The IRS requires that expenses be both common in your industry and helpful for your business, with adequate records to substantiate each deduction.",
    },
    {
      question: "Do deductions increase audit risk?",
      answer:
        "Incorrect deductions do. Properly structured and documented deductions actually reduce risk by demonstrating professional tax management.",
    },
    {
      question: "Should I rely on software to find deductions?",
      answer:
        "Software records data. Strategy interprets it. Tools like QuickBooks and Collective are excellent for categorization and compliance, but they cannot provide the contextual judgment needed for entity-specific treatment, timing optimization, or reimbursement structuring.",
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

        <article className="container mx-auto px-4 pb-20">
          <div className="max-w-4xl mx-auto">
            {/* Meta */}
            <div className="mb-8">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 mb-4">
                Tax Strategy
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight text-balance">
                Maximizing Tax Deductions: 15 Often-Missed Write-Offs for
                Startups
              </h1>
              <p className="text-xl text-emerald-400 mb-6">
                Focused on LLCs & S-Corps for Ecommerce Founders
              </p>
              <div className="flex flex-wrap items-center gap-6 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Steve Morello, CPA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>14 min read</span>
                </div>
                <div>January 8, 2026</div>
              </div>
            </div>

            {/* Article Content */}
            <div className="prose prose-invert prose-lg max-w-none">
              {/* Introduction */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-12">
                <p className="text-slate-200 text-lg leading-relaxed mb-0">
                  For ecommerce founders, tax deductions are rarely the problem.{" "}
                  <span className="text-emerald-400 font-semibold">
                    Missed deductions are.
                  </span>{" "}
                  As businesses scale, founders rely on bookkeeping tools and
                  year-end filing workflows that capture what happened -- not
                  what could have been optimized. The result is overpaid taxes,
                  distorted cash flow, and the false belief that "we already
                  deducted everything."
                </p>
              </div>

              {/* Why Founders Miss Deductions */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  Why Ecommerce Founders Miss Legitimate Tax Deductions
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Most missed deductions fall into three categories:
                </p>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                      <p className="text-red-300 font-semibold mb-2">
                        Hidden Expenses
                      </p>
                      <p className="text-slate-400 text-sm">
                        {"They don't look like \"expenses\" in accounting software"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-4">
                      <p className="text-amber-300 font-semibold mb-2">
                        Timing & Structure
                      </p>
                      <p className="text-slate-400 text-sm">
                        They require timing or structural planning
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-500/10 border-orange-500/30">
                    <CardContent className="p-4">
                      <p className="text-orange-300 font-semibold mb-2">
                        Blurred Boundaries
                      </p>
                      <p className="text-slate-400 text-sm">
                        They cross personal/business boundaries incorrectly
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-slate-300 mb-4">
                    Bookkeeping platforms are excellent at categorization. They
                    are{" "}
                    <span className="text-white font-semibold">
                      not designed
                    </span>{" "}
                    to ask:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3 text-slate-400">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />
                      Should this expense have been structured differently?
                    </li>
                    <li className="flex items-start gap-3 text-slate-400">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />
                      Should this have been reimbursed instead of expensed?
                    </li>
                    <li className="flex items-start gap-3 text-slate-400">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />
                      Was this deductible at the entity level or shareholder
                      level?
                    </li>
                  </ul>
                </div>
              </section>

              {/* 15 Deductions */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-8">
                  The 15 Deductions
                </h2>

                <div className="space-y-4">
                  {deductions.map((d) => {
                    const Icon = d.icon
                    const isExpanded = expandedDeduction === d.num
                    return (
                      <Card
                        key={d.num}
                        className="bg-gray-900/50 border-gray-700"
                      >
                        <CardContent className="p-0">
                          <button
                            onClick={() =>
                              setExpandedDeduction(isExpanded ? null : d.num)
                            }
                            className="w-full p-6 flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-4 pr-4">
                              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                                <Icon className={`w-5 h-5 ${d.iconColor}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                  <span className="text-white font-semibold">
                                    {d.num}. {d.title}
                                  </span>
                                  <Badge className={d.badgeColor}>
                                    {d.badge}
                                  </Badge>
                                </div>
                                <p className="text-slate-400 text-sm">
                                  {d.answer}
                                </p>
                              </div>
                            </div>
                            <ChevronDown
                              className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                          {isExpanded && (
                            <div className="px-6 pb-6 pt-0 space-y-4">
                              {d.items && d.items.length > 0 && (
                                <div>
                                  <p className="text-slate-400 text-sm font-semibold mb-2">
                                    Eligible items:
                                  </p>
                                  <ul className="space-y-1">
                                    {d.items.map((item, i) => (
                                      <li
                                        key={i}
                                        className="flex items-center gap-2 text-slate-300 text-sm"
                                      >
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {d.whyMissed && d.whyMissed.length > 0 && (
                                <div>
                                  <p className="text-slate-400 text-sm font-semibold mb-2">
                                    {"Why it's missed:"}
                                  </p>
                                  <ul className="space-y-1">
                                    {d.whyMissed.map((reason, i) => (
                                      <li
                                        key={i}
                                        className="flex items-center gap-2 text-amber-300 text-sm"
                                      >
                                        <AlertCircle className="w-4 h-4 text-amber-400" />
                                        {reason}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {d.impact && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                                  <p className="text-emerald-300 text-sm mb-0">
                                    {d.impact}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>

              {/* Why Tools Miss These */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-amber-400" />
                  </div>
                  Why Tools Miss These Deductions
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Platforms like QuickBooks, Collective, Lettuce, and Pilot are
                  optimized for transaction capture, categorization, and
                  compliance workflows. They are{" "}
                  <span className="text-white font-semibold">
                    not designed for contextual judgment
                  </span>
                  :
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">
                        Entity-specific treatment
                      </span>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">
                        Timing optimization
                      </span>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">
                        Reimbursement structuring
                      </span>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">
                        Multi-state nuance
                      </span>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Scalable Approach */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-emerald-400" />
                  </div>
                  How High-Growth Founders Should Think About Deductions
                </h2>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-6">
                  <p className="text-white font-semibold text-lg mb-4">
                    Deductions are not a checklist. They are a system.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      Entity-aligned deduction strategy
                    </li>
                    <li className="flex items-start gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      Quarterly review -- not annual scrambling
                    </li>
                    <li className="flex items-start gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      Clear separation of reimbursement vs expense
                    </li>
                    <li className="flex items-start gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      State-aware treatment
                    </li>
                    <li className="flex items-start gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      Documentation discipline
                    </li>
                  </ul>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    Founders who treat deductions reactively{" "}
                    <span className="text-red-400 font-semibold">
                      almost always overpay
                    </span>
                    .
                  </p>
                </div>
              </section>

              {/* When to Get Guidance */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-400" />
                  </div>
                  When to Get Professional Guidance
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  If your ecommerce business has:
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-4 flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-blue-400" />
                      <span className="text-slate-300">
                        $250K+ in revenue
                      </span>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-4 flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-blue-400" />
                      <span className="text-slate-300">
                        Multi-state activity
                      </span>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-4 flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-blue-400" />
                      <span className="text-slate-300">
                        An S-corp election
                      </span>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-4 flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-blue-400" />
                      <span className="text-slate-300">
                        Rapid growth or margin shifts
                      </span>
                    </CardContent>
                  </Card>
                </div>

                <p className="text-slate-300">
                  ...then deduction strategy becomes a{" "}
                  <span className="text-white font-semibold">
                    meaningful lever
                  </span>
                  , not an afterthought.
                </p>
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
                          onClick={() =>
                            setOpenFaq(openFaq === index ? null : index)
                          }
                          className="w-full p-6 flex items-center justify-between text-left"
                        >
                          <span className="text-white font-semibold pr-4">
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${openFaq === index ? "rotate-180" : ""}`}
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
                  <li>Internal Revenue Service publications and guidance</li>
                  <li>U.S. Small Business Administration</li>
                  <li>State revenue department regulations</li>
                </ul>
              </section>

              {/* CTA */}
              <Card className="bg-gradient-to-r from-emerald-500 to-cyan-500 border-emerald-500/30">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Want Help Finding What You Are Missing?
                  </h3>
                  <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                    {
                      "NexTax.AI helps ecommerce founders build deduction strategies that go beyond what bookkeeping software can catch. If you'd like help understanding how these deductions apply to your specific situation, reach out."
                    }
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
                        Contact Us
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
