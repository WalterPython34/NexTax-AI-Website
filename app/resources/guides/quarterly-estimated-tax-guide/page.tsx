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
  Calculator,
  Building2,
  ShieldCheck,
  CalendarDays,
  ChevronDown,
  X,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
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
        "https://nextax.ai/resources/guides/quarterly-estimated-tax-guide#webpage",
      url: "https://nextax.ai/resources/guides/quarterly-estimated-tax-guide",
      name: "Quarterly Estimated Tax Payments: A Complete Guide for Business Owners",
      isPartOf: { "@id": "https://nextax.ai/#website" },
      about: [
        { "@type": "Thing", name: "Quarterly estimated taxes" },
        { "@type": "Thing", name: "Self-employment tax" },
        { "@type": "Thing", name: "IRS estimated tax payments" },
        { "@type": "Thing", name: "Ecommerce tax compliance" },
      ],
      publisher: { "@id": "https://nextax.ai/#organization" },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: "https://nextax.ai/images/blog/quarterly-tax-calendar.png",
      },
      datePublished: "2026-01-03",
      dateModified: "2026-01-03",
    },
    {
      "@type": "Article",
      "@id":
        "https://nextax.ai/resources/guides/quarterly-estimated-tax-guide#article",
      headline:
        "Quarterly Estimated Tax Payments: A Complete Guide for Business Owners",
      description:
        "Quarterly estimated tax payments explained for ecommerce founders. Learn who must pay, how much to pay, deadlines, penalties, and smarter planning strategies.",
      image: [
        "https://nextax.ai/images/blog/quarterly-tax-calendar.png",
      ],
      author: {
        "@type": "Person",
        name: "Steve Morello, CPA",
        url: "https://nextax.ai/about",
      },
      publisher: { "@id": "https://nextax.ai/#organization" },
      mainEntityOfPage: {
        "@id":
          "https://nextax.ai/resources/guides/quarterly-estimated-tax-guide#webpage",
      },
      datePublished: "2026-01-03",
      dateModified: "2026-01-03",
      articleSection: [
        "Quarterly estimated taxes",
        "IRS payment deadlines",
        "Ecommerce tax compliance",
        "Entity structure and tax planning",
      ],
      keywords: [
        "quarterly estimated taxes",
        "IRS estimated tax payments",
        "self-employment tax",
        "ecommerce tax compliance",
        "S-Corp quarterly taxes",
        "underpayment penalty",
      ],
    },
    {
      "@type": "FAQPage",
      "@id":
        "https://nextax.ai/resources/guides/quarterly-estimated-tax-guide#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Do I need to pay quarterly taxes if my business is new?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "If you expect to owe $1,000 or more in tax, yes—even in your first year.",
          },
        },
        {
          "@type": "Question",
          name: "Can I skip quarterly payments and just pay in April?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can, but penalties may apply even if you pay the full amount later.",
          },
        },
        {
          "@type": "Question",
          name: "Are quarterly taxes required for S-corps?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, on pass-through income not covered by payroll withholding.",
          },
        },
        {
          "@type": "Question",
          name: "What if my income is inconsistent?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The annualized income method may reduce penalties—but documentation matters.",
          },
        },
        {
          "@type": "Question",
          name: "When should I get help with quarterly tax planning?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "If your ecommerce business has $250K+ annual revenue, multi-state sales, inventory financing, rapid margin shifts, or entity restructuring, strategic guidance helps prevent penalties and smooth cash flow.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id":
        "https://nextax.ai/resources/guides/quarterly-estimated-tax-guide#breadcrumbs",
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
          name: "Quarterly Estimated Tax Payments: A Complete Guide for Business Owners",
          item: "https://nextax.ai/resources/guides/quarterly-estimated-tax-guide",
        },
      ],
    },
  ],
}

export default function QuarterlyEstimatedTaxGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      question:
        "Do I need to pay quarterly taxes if my business is new?",
      answer:
        "If you expect to owe $1,000 or more in tax, yes—even in your first year. The IRS requires pay-as-you-go taxation regardless of how long your business has been operating.",
    },
    {
      question:
        "Can I skip quarterly payments and just pay in April?",
      answer:
        "You can, but penalties may apply even if you pay the full amount later. The IRS charges underpayment penalties based on how much was underpaid and for how long, currently around 8% annually.",
    },
    {
      question: "Are quarterly taxes required for S-corps?",
      answer:
        "Yes, on pass-through income not covered by payroll withholding. S-Corp owners pay payroll taxes via salary withholding but still need to make quarterly estimated payments on distributions and other pass-through income.",
    },
    {
      question: "What if my income is inconsistent?",
      answer:
        "The annualized income method may reduce penalties—but documentation matters. This method is particularly useful for ecommerce brands with heavy Q4 revenue but requires precise bookkeeping.",
    },
    {
      question:
        "When should I get help with quarterly tax planning?",
      answer:
        "If your ecommerce business has $250K+ annual revenue, multi-state sales, inventory financing, rapid margin shifts, or entity restructuring needs, compliance-only tools stop being sufficient. Strategic guidance helps prevent penalties, smooth cash flow, and support growth.",
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
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 mb-4">
                Compliance
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight text-balance">
                Quarterly Estimated Tax Payments:
                <span className="text-emerald-400">
                  {" "}
                  A Complete Guide for Business Owners
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Steve Morello, CPA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>14 min read</span>
                </div>
                <div>January 3, 2026</div>
              </div>
            </div>

            {/* Featured Image */}
            <div className="mb-12 rounded-xl overflow-hidden">
              <Image
                src="/images/blog/quarterly-tax-calendar.png"
                alt="Quarterly Tax Calendar showing important tax dates and deadlines for individuals and businesses across Q1 through Q4"
                width={800}
                height={1000}
                className="w-full max-w-lg mx-auto object-cover"
              />
            </div>

            {/* Article Content */}
            <div className="prose prose-invert prose-lg max-w-none">
              {/* Introduction */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-12">
                <p className="text-slate-200 text-lg leading-relaxed mb-0">
                  Quarterly estimated tax payments are one of the most
                  misunderstood—and most expensive—areas of tax compliance
                  for growing ecommerce businesses. When handled
                  reactively, they trigger penalties, cash-flow stress,
                  and surprise tax bills. When handled strategically, they
                  become a <span className="text-white font-semibold">predictable, manageable part of scaling</span>.
                </p>
              </div>

              {/* What Are Quarterly Estimated Tax Payments? */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-blue-400" />
                  </div>
                  What Are Quarterly Estimated Tax Payments?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Quarterly estimated tax payments are advance payments
                  made to cover federal and state income taxes when taxes
                  are <span className="text-white font-semibold">not withheld automatically</span> from your income. Business
                  owners, ecommerce founders, and self-employed
                  individuals use them to prepay income tax and
                  self-employment tax throughout the year.
                </p>

                <p className="text-slate-300 text-lg mb-6">
                  If you earn income outside of a W-2 paycheck—such as
                  ecommerce profits, creator income, or distributions from
                  a business entity—the IRS expects taxes to be paid as
                  income is earned, not once per year.
                </p>

                <Card className="bg-amber-500/10 border-amber-500/30 mb-6">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-amber-200 font-semibold mb-2">
                          IRS Safe Harbor Requirement
                        </p>
                        <p className="text-slate-300 mb-2">
                          According to IRS guidance, taxpayers must
                          generally pay:
                        </p>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>
                              <span className="text-white font-semibold">90%</span> of current-year tax, or
                            </span>
                          </li>
                          <li className="flex items-center gap-2 text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>
                              <span className="text-white font-semibold">100%</span> of prior-year tax (110% for
                              AGI {'>'} $150K)
                            </span>
                          </li>
                        </ul>
                        <p className="text-slate-400 mt-2 text-sm mb-0">
                          to avoid underpayment penalties.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    <span className="text-red-400 font-semibold">Key takeaway:</span> Quarterly taxes are not
                    optional. They are the IRS's way of enforcing{" "}
                    <span className="text-white font-semibold">pay-as-you-go taxation</span> for business income.
                  </p>
                </div>
              </section>

              {/* Who Is Required to Pay */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-emerald-400" />
                  </div>
                  Who Is Required to Pay Quarterly Estimated Taxes?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Most ecommerce founders are required to make quarterly
                  estimated tax payments once their business generates
                  consistent profit. This includes:
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-4">
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          Sole proprietors
                        </li>
                        <li className="flex items-center gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          Single-member LLC owners
                        </li>
                        <li className="flex items-center gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          Multi-member LLC members
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-4">
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          S-corporation owners
                        </li>
                        <li className="flex items-center gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          Creators with 1099 income
                        </li>
                        <li className="flex items-center gap-3 text-slate-300">
                          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                          Anyone owing $1,000+ in tax
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    <span className="text-blue-300 font-semibold">DIY software gap:</span> Platforms like TurboTax
                    explain how to file, but they don't help founders
                    recognize when they've crossed into estimated-tax
                    territory—which often happens{" "}
                    <span className="text-white font-semibold">earlier than expected</span> in ecommerce.
                  </p>
                </div>
              </section>

              {/* Why Ecommerce Is Vulnerable */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  Why Ecommerce Businesses Are Especially Vulnerable
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Ecommerce income is volatile, backend-loaded, and
                  timing-sensitive, which makes quarterly tax compliance
                  harder than for traditional service businesses.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-white font-semibold">Seasonal revenue spikes</p>
                          <p className="text-slate-400 text-sm">Q4 distortions skew annual estimates</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-white font-semibold">Inventory cash-flow mismatches</p>
                          <p className="text-slate-400 text-sm">Cash out before revenue in</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-white font-semibold">Platform payout lag</p>
                          <p className="text-slate-400 text-sm">Sales reported before cash received</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-white font-semibold">Multi-state overlap</p>
                          <p className="text-slate-400 text-sm">Sales tax and income tax complexity</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    According to IRS data, underpayment penalties are
                    among the{" "}
                    <span className="text-amber-200 font-semibold">most common avoidable penalties</span> for small
                    business owners, largely due to misunderstanding
                    estimated taxes.
                  </p>
                </div>
              </section>

              {/* Due Dates */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-purple-400" />
                  </div>
                  When Are Quarterly Estimated Tax Payments Due?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Quarterly estimated taxes follow IRS-defined payment
                  periods—<span className="text-white font-semibold">not standard calendar quarters</span>.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6 overflow-hidden">
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th className="text-left p-4 text-slate-300 font-semibold">Payment Period</th>
                          <th className="text-left p-4 text-slate-300 font-semibold">Income Covered</th>
                          <th className="text-left p-4 text-slate-300 font-semibold">Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-emerald-400 font-semibold">Q1</td>
                          <td className="p-4 text-slate-300">Jan 1 - Mar 31</td>
                          <td className="p-4 text-white font-semibold">April 15</td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-emerald-400 font-semibold">Q2</td>
                          <td className="p-4 text-slate-300">Apr 1 - May 31</td>
                          <td className="p-4 text-white font-semibold">June 15</td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-emerald-400 font-semibold">Q3</td>
                          <td className="p-4 text-slate-300">Jun 1 - Aug 31</td>
                          <td className="p-4 text-white font-semibold">September 15</td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-emerald-400 font-semibold">Q4</td>
                          <td className="p-4 text-slate-300">Sep 1 - Dec 31</td>
                          <td className="p-4 text-white font-semibold">January 15</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                    <p className="text-slate-300 mb-0">
                      <span className="text-red-300 font-semibold">Common mistake:</span> Many founders incorrectly
                      assume Q4 is due December 31.{" "}
                      <span className="text-white font-semibold">It is not</span>—the Q4 payment is due{" "}
                      <span className="text-white font-semibold">January 15</span> of the following year.
                    </p>
                  </div>
                </div>
              </section>

              {/* How Much To Pay */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-emerald-400" />
                  </div>
                  How Much Should You Pay Each Quarter?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  The correct quarterly payment is based on{" "}
                  <span className="text-emerald-400 font-semibold">tax liability—not revenue</span>. This
                  distinction is critical.
                </p>

                <div className="space-y-4 mb-6">
                  <Card className="bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        1. Prior-Year Safe Harbor Method
                        <Badge className="ml-2 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                          Most Common
                        </Badge>
                      </h3>
                      <p className="text-slate-300 mb-2">
                        Pay <span className="text-white font-semibold">100%</span> of last year's total tax (110%
                        if AGI {'>'} $150K)
                      </p>
                      <p className="text-slate-400 text-sm mb-0">
                        Minimizes penalties and is easy to administer—but
                        may cause overpayment in fast-growing businesses.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        2. Current-Year Percentage Method
                      </h3>
                      <p className="text-slate-300 mb-2">
                        Pay <span className="text-white font-semibold">90%</span> of projected current-year tax
                      </p>
                      <p className="text-slate-400 text-sm mb-0">
                        More accurate, but requires forecasting and
                        mid-year adjustments.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-500/10 border-purple-500/30">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        3. Annualized Income Method
                        <Badge className="ml-2 bg-purple-500/20 text-purple-300 border-purple-500/30">
                          Advanced
                        </Badge>
                      </h3>
                      <p className="text-slate-300 mb-2">
                        Match payments to actual income timing
                      </p>
                      <p className="text-slate-400 text-sm mb-0">
                        Particularly useful for ecommerce brands with
                        heavy Q4 revenue, but requires precise
                        bookkeeping.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-emerald-300 font-semibold mb-2">
                        Expert Perspective
                      </p>
                      <p className="text-slate-300 mb-0 italic">
                        "Quarterly taxes aren't about guessing—they're
                        about choosing the least risky method based on how
                        predictable your income actually is."
                      </p>
                      <p className="text-slate-400 text-sm mt-1 mb-0">
                        — Steve Morello, CPA
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* What Happens If You Miss */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-red-400" />
                  </div>
                  What Happens If You Miss or Underpay?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Underpaying quarterly taxes can trigger IRS penalties{" "}
                  <span className="text-white font-semibold">even if you pay your full tax bill in April</span>.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Penalties are calculated based on:
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-slate-300">
                        <DollarSign className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <span>Amount underpaid per quarter</span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <Clock className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <span>Length of the underpayment period</span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <TrendingUp className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <span>
                          IRS interest rate (adjusted quarterly, currently ~<span className="text-white font-semibold">8% annually</span>)
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    For ecommerce founders scaling quickly, these
                    penalties{" "}
                    <span className="text-red-300 font-semibold">compound quietly in the background</span>. According to
                    IRS Publication 505, the underpayment penalty is
                    effectively an interest charge for late payment.
                  </p>
                </div>
              </section>

              {/* State Level */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-amber-400" />
                  </div>
                  How Quarterly Taxes Work at the State Level
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Federal compliance does not eliminate state obligations.
                  Most states with income tax require their own estimated
                  payments, often with{" "}
                  <span className="text-white font-semibold">different thresholds and deadlines</span>.
                </p>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-amber-300 font-semibold mb-1">
                        Nexus-driven
                      </p>
                      <p className="text-slate-400 text-sm">
                        Filing obligations triggered by sales presence
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-amber-300 font-semibold mb-1">
                        Separate safe harbors
                      </p>
                      <p className="text-slate-400 text-sm">
                        Rules differ from federal requirements
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-amber-300 font-semibold mb-1">
                        State-specific penalties
                      </p>
                      <p className="text-slate-400 text-sm">
                        Calculated independently from federal
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    Founders selling nationwide often discover state
                    estimated tax obligations{" "}
                    <span className="text-blue-300 font-semibold">after receiving notices</span>—because state rules
                    don't surface cleanly inside generic tax software.
                  </p>
                </div>
              </section>

              {/* Entity Structure Impact */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-cyan-400" />
                  </div>
                  How Entity Structure Changes Quarterly Tax Strategy
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Entity choice directly affects how quarterly taxes are
                  calculated and paid.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-emerald-400 mb-3">
                        Sole Proprietors & Single-Member LLCs
                      </h3>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-slate-300 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          Pay income tax + full 15.3% SE tax
                        </li>
                        <li className="flex items-start gap-2 text-slate-300 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          Quarterly payments cover both components
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-blue-400 mb-3">
                        S-Corporation Owners
                      </h3>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-slate-300 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          Pay payroll taxes via salary withholding
                        </li>
                        <li className="flex items-start gap-2 text-slate-300 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          Quarterly estimates on pass-through profit only
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    This is why{" "}
                    <span className="text-emerald-300 font-semibold">entity structure and quarterly tax planning must
                    be aligned</span>. Treating them separately leads to
                    overpayment or audit risk.
                  </p>
                </div>
              </section>

              {/* Software Falls Short */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-slate-300" />
                  </div>
                  Why Software-Only Solutions Fall Short
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Software platforms are{" "}
                  <span className="text-white font-semibold">filing tools—not planning tools</span>. They record what
                  already happened.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <p className="text-slate-400 font-semibold mb-3">
                        TurboTax focuses on:
                      </p>
                      <ul className="space-y-2 text-slate-300 text-sm">
                        <li>Annual return completion</li>
                        <li>Basic estimated tax prompts</li>
                        <li>User-driven inputs</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <p className="text-slate-400 font-semibold mb-3">
                        Collective focuses on:
                      </p>
                      <ul className="space-y-2 text-slate-300 text-sm">
                        <li>Bundled compliance</li>
                        <li>Standardized workflows</li>
                        <li>General bookkeeping</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-2">
                    <span className="text-emerald-300 font-semibold">Key distinction:</span>
                  </p>
                  <p className="text-slate-300 mb-1">
                    Filing answers: <span className="text-slate-400 italic">"What do I owe?"</span>
                  </p>
                  <p className="text-slate-300 mb-0">
                    Planning answers:{" "}
                    <span className="text-white font-semibold italic">"What should I be paying before it's too late
                    to change?"</span>
                  </p>
                </div>
              </section>

              {/* Best Practice Framework */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  </div>
                  How High-Growth Founders Should Think About Quarterly Taxes
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  At scale, quarterly taxes become a{" "}
                  <span className="text-white font-semibold">cash-flow management function</span>—not just a
                  compliance task.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Best-Practice Framework
                    </h3>
                    <div className="space-y-4">
                      {[
                        "Forecast taxable income quarterly",
                        "Align entity structure with profit trajectory",
                        "Adjust payments mid-year as margins change",
                        "Coordinate federal and state obligations",
                        "Reconcile strategy before year-end",
                      ].map((step, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20"
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-emerald-400 font-bold text-sm">
                              {index + 1}
                            </span>
                          </div>
                          <span className="text-slate-200">{step}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    Founders who treat quarterly taxes as static almost
                    always{" "}
                    <span className="text-amber-200 font-semibold">overpay or underpay</span>.
                  </p>
                </div>
              </section>

              {/* When to Get Help */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6">
                  When Should You Get Help With Quarterly Tax Planning?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  If your ecommerce business has any of the following,
                  quarterly tax strategy matters:
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {[
                    "$250K+ annual revenue",
                    "Multi-state sales",
                    "Inventory financing",
                    "Rapid margin shifts",
                    "Entity restructuring",
                  ].map((item, index) => (
                    <Card
                      key={index}
                      className="bg-emerald-500/10 border-emerald-500/30"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span className="text-white font-semibold">
                            {item}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
                            <p className="text-slate-300">
                              {faq.answer}
                            </p>
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
                    Internal Revenue Service. Publication 505: Tax
                    Withholding and Estimated Tax.
                  </li>
                  <li>
                    Internal Revenue Service. Publication 15: Employer's
                    Tax Guide.
                  </li>
                  <li>IRS Statistics of Income (SOI).</li>
                  <li>U.S. Small Business Administration.</li>
                </ul>
              </section>

              {/* CTA */}
              <Card className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-emerald-500/30">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Need Help With Quarterly Tax Planning?
                  </h3>
                  <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                    NexTax.AI helps ecommerce founders plan quarterly
                    estimated taxes strategically—not reactively. Get
                    clarity on how much to pay, when to pay, and how your
                    entity structure affects the calculation.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Link href="/pricing">
                      <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8">
                        View Packages
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <Link href="/contact">
                      <Button
                        variant="outline"
                        className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 bg-transparent"
                      >
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
