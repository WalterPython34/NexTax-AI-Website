"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Users,
  TrendingUp,
  Shield,
  FileText,
  Target,
  Briefcase,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"

const defined = <T,>(value: T | undefined): value is T => value !== undefined

export default function PreLoiDiligencePage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: "When should I start pre-LOI diligence?",
      answer:
        "Start immediately after receiving a CIM or initial financials. The goal is to validate core assumptions before you invest time in negotiations or incur legal costs. Most buyers wait too long and discover deal-killers after they've already committed emotionally and financially.",
    },
    {
      question: "How much time should pre-LOI diligence take?",
      answer:
        "For most SMB deals, 1-2 weeks is sufficient to answer the five critical questions. You're not trying to fully underwrite the business — you're trying to identify whether it deserves an LOI. Focus on earnings quality, customer concentration, owner dependency, lender viability, and downside survivability.",
    },
    {
      question: "What documents should I request before signing an LOI?",
      answer:
        "At minimum: 3 years of tax returns, 12-24 months of bank statements, P&L and balance sheets, add-back schedules, AR/AP aging reports, customer revenue breakdown, and key contracts. If a seller won't provide basic financials pre-LOI, that's a red flag.",
    },
    {
      question: "How do I evaluate customer concentration risk?",
      answer:
        "Calculate the percentage of revenue from top 5 customers. If any single customer exceeds 20% of revenue, you have concentration risk. Also evaluate contract transferability, relationship ownership (seller vs. business), renewal rates, and churn history.",
    },
    {
      question: "What DSCR should I target for SBA financing?",
      answer:
        "Most SBA lenders require minimum 1.25x DSCR, with many preferring 1.35x or higher. Calculate DSCR using normalized SDE (after scrutinizing add-backs), realistic debt terms, and working capital needs. If DSCR is borderline at asking price, you'll need to negotiate down or structure seller financing.",
    },
  ]

  const criticalQuestions = [
    {
      icon: DollarSign,
      question: "Is the cash flow real?",
      description: "Validate earnings through tax returns, bank statements, and add-back scrutiny",
    },
    {
      icon: Users,
      question: "Is the customer base stable?",
      description: "Assess concentration, transferability, and churn trends",
    },
    {
      icon: User,
      question: "Is the owner actually replaceable?",
      description: "Evaluate operational dependency and transition risk",
    },
    {
      icon: Briefcase,
      question: "Will a lender finance this business?",
      description: "Think like an SBA underwriter before committing",
    },
    {
      icon: Shield,
      question: "Is the downside survivable?",
      description: "Model worst-case scenarios and walk-away thresholds",
    },
  ]

  const diligenceAreas = [
    {
      title: "Earnings Quality",
      priority: "Critical",
      items: [
        "3 years of tax returns",
        "Bank statements",
        "Add-back schedules",
        "Payroll consistency",
        "Credit card statements",
        "Merchant processor data",
        "Revenue concentration",
        "AR aging",
      ],
    },
    {
      title: "Customer Concentration",
      priority: "Critical",
      items: [
        "Top 5 customer revenue %",
        "Contract transferability",
        "Relationship ownership",
        "Customer stickiness",
        "Renewal rate documentation",
        "Churn history",
      ],
    },
    {
      title: "Lender Viability",
      priority: "High",
      items: [
        "DSCR calculation",
        "Normalized earnings",
        "Debt load assessment",
        "Industry cyclicality",
        "Working capital needs",
        "Seller transition structure",
      ],
    },
    {
      title: "Seller Dependency",
      priority: "High",
      items: [
        "Customer relationship ownership",
        "Pricing/estimating knowledge",
        "Operational management",
        "Vendor relationships",
        "SOP documentation",
        "Management depth",
      ],
    },
    {
      title: "Operational Scalability",
      priority: "Medium",
      items: [
        "CRM usage",
        "Job costing systems",
        "Reporting quality",
        "Payroll systems",
        "Vendor concentration",
        "Technology stack",
      ],
    },
  ]

  const advantages = [
    {
      title: "Better Pricing Discipline",
      description: "Anchor to verified earnings, not asking price. Identify if SDE is overstated before committing to a valuation.",
    },
    {
      title: "Stronger Negotiating Leverage",
      description: "Negotiate around earn-outs, seller notes, working capital, and transition support with real data.",
    },
    {
      title: "Faster Deal Velocity",
      description: "Submit cleaner LOIs, avoid retrading, reduce lender surprises, and keep legal diligence focused.",
    },
    {
      title: "Better Financing Terms",
      description: "Well-prepared diligence packages improve SBA approval odds and closing timelines.",
    },
    {
      title: "Higher Close Rates",
      description: "Reduce retrading, emotional negotiations, seller distrust, and financing delays.",
    },
    {
      title: "Improved Walk-Away Discipline",
      description: "Create objective decision-making with explicit walk-away triggers tied to normalized earnings.",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      {/* Hero */}
      <section className="relative py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <Link
            href="/resources"
            className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Resources
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mb-4">Acquisitions</Badge>
              <h1 className="text-3xl lg:text-5xl font-bold mb-6 leading-tight">
                Pre-LOI Diligence for SMB Acquisitions: How Smart Buyers Avoid Bad Deals Before They Sign
              </h1>
              <p className="text-xl text-slate-300 mb-6">
                Most bad SMB acquisitions do not fail during legal diligence. They fail because the buyer signed an LOI
                too early.
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Steve Morello, CPA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>January 28, 2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>16 min read</span>
                </div>
              </div>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden">
              <Image
                src="/images/blog/pre-loi-diligence.jpg"
                alt="Pre-LOI Diligence for SMB Acquisitions"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Five Critical Questions */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4 text-center">
              The Five Critical Questions
            </h2>
            <p className="text-slate-400 text-center mb-10 max-w-2xl mx-auto">
              Pre-LOI diligence is less about building a 200-item checklist and more about answering these questions fast.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {criticalQuestions.map((item, i) => (
                <Card key={i} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">{item.question}</h3>
                        <p className="text-sm text-slate-400">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-invert prose-lg">
            <p className="text-slate-300 text-lg leading-relaxed">
              By the time most buyers discover customer concentration, inflated add-backs, weak cash flow conversion, or
              owner dependency, they already have legal fees, lender costs, and emotional momentum invested in the deal.
            </p>

            <p className="text-slate-300 leading-relaxed">
              That is exactly why serious buyers perform <strong>pre-LOI diligence</strong>.
            </p>

            <p className="text-slate-300 leading-relaxed">
              The goal is not to fully underwrite the business before signing. The goal is to identify whether the deal
              deserves an LOI in the first place.
            </p>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 my-8">
              <p className="text-slate-300 italic m-0">
                &quot;Most buyers skip this stage because they are afraid of losing the deal. Experienced buyers know the
                opposite is true: disciplined diligence is what prevents expensive mistakes.&quot;
              </p>
            </div>

            <h2 className="text-2xl font-bold text-white mt-12 mb-6">
              Why Pre-LOI Diligence Matters More in SMB Acquisitions
            </h2>

            <p className="text-slate-300 leading-relaxed">
              In lower middle market and Main Street acquisitions, financial reporting quality is often inconsistent.
              Unlike institutional deals, many SMB acquisitions involve:
            </p>

            <ul className="text-slate-300 space-y-2">
              <li>Seller-managed bookkeeping</li>
              <li>Aggressive SDE add-backs</li>
              <li>Weak internal controls</li>
              <li>Customer concentration</li>
              <li>Informal processes</li>
              <li>Key-person dependency</li>
              <li>Limited middle management</li>
            </ul>

            <p className="text-slate-300 leading-relaxed">
              That means the biggest risks usually appear before formal diligence even starts.
            </p>
          </div>
        </div>
      </section>

      {/* Advantages Grid */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4 text-center">
              Advantages of Strong Pre-LOI Diligence
            </h2>
            <p className="text-slate-400 text-center mb-10">
              A buyer who validates core assumptions before submitting an LOI gains major advantages.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advantages.map((item, i) => (
                <Card key={i} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6">
                    <CheckCircle className="w-6 h-6 text-emerald-400 mb-3" />
                    <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-400">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Diligence Areas */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4 text-center">
              Highest ROI Diligence Areas Before an LOI
            </h2>
            <p className="text-slate-400 text-center mb-10">
              For SMB buyers, certain areas matter disproportionately more than others.
            </p>

            <div className="space-y-6">
              {diligenceAreas.map((area, i) => (
                <Card key={i} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-white">{area.title}</h3>
                      <Badge
                        className={
                          area.priority === "Critical"
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : area.priority === "High"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        }
                      >
                        {area.priority}
                      </Badge>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {area.items.map((item, j) => (
                        <div key={j} className="flex items-center gap-2 text-slate-300 text-sm">
                          <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Key Insight Callout */}
      <section className="py-16 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-6" />
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              If Earnings Quality Fails, Nothing Else Matters
            </h2>
            <p className="text-lg text-slate-300 mb-6">
              One recommendation framework specifically advised buyers to validate three years of tax returns and
              normalize add-backs before signing an LOI. This is the foundation of the entire acquisition.
            </p>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 inline-block">
              <p className="text-slate-300 text-sm">
                <strong className="text-white">Example:</strong> One SMB acquisition report flagged that normalized SDE
                could reduce DSCR from 3.18x to 1.42x — close to lender minimum thresholds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What Sophisticated Buyers Understand */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-invert prose-lg">
            <h2 className="text-2xl font-bold text-white mb-6">What Sophisticated SMB Buyers Understand</h2>

            <p className="text-slate-300 leading-relaxed">
              The best acquisitions are rarely won through speed alone. They are won through:
            </p>

            <ul className="text-slate-300 space-y-2">
              <li>Better underwriting</li>
              <li>Better questions</li>
              <li>Better structure</li>
              <li>Better discipline</li>
            </ul>

            <p className="text-slate-300 leading-relaxed">
              Pre-LOI diligence is not about creating friction. It is about avoiding preventable mistakes before legal
              costs, financing fees, and sunk-cost bias take over the process.
            </p>

            <div className="bg-slate-800/50 border-l-4 border-cyan-500 rounded-r-xl p-6 my-8">
              <p className="text-white font-semibold m-0">
                Most buyers focus on getting to LOI. Experienced buyers focus on whether the business deserves one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-10 text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="font-medium text-white pr-4">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${openFaqIndex === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaqIndex === i && (
                    <div className="px-5 pb-5">
                      <p className="text-slate-400 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
              <CardContent className="p-8 lg:p-12 text-center">
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                  Ready to Analyze Your Next Deal?
                </h2>
                <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
                  AcquiFlow helps you perform pre-LOI diligence faster. Normalize earnings, stress test financing, and
                  identify deal-killers before you commit.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/deal-reality-check">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8"
                    >
                      Analyze a Deal
                    </Button>
                  </Link>
                  <Link href="/acquisitions">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                    >
                      Learn About Advisory Services
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Article",
                headline: "Pre-LOI Diligence for SMB Acquisitions: How Smart Buyers Avoid Bad Deals Before They Sign",
                description:
                  "Most bad SMB acquisitions fail because the buyer signed an LOI too early. Learn the five critical questions to answer before committing to any deal.",
                author: {
                  "@type": "Person",
                  name: "Steve Morello",
                  jobTitle: "CPA",
                  url: "https://www.nextax.ai/about",
                },
                publisher: {
                  "@type": "Organization",
                  name: "NexTax.AI",
                  url: "https://www.nextax.ai",
                },
                datePublished: "2026-01-28",
                dateModified: "2026-01-28",
                mainEntityOfPage: "https://www.nextax.ai/resources/guides/pre-loi-diligence-smb-acquisitions",
              },
              {
                "@type": "FAQPage",
                mainEntity: faqs.map((faq) => ({
                  "@type": "Question",
                  name: faq.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: faq.answer,
                  },
                })),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: "https://www.nextax.ai" },
                  { "@type": "ListItem", position: 2, name: "Resources", item: "https://www.nextax.ai/resources" },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: "Pre-LOI Diligence for SMB Acquisitions",
                    item: "https://www.nextax.ai/resources/guides/pre-loi-diligence-smb-acquisitions",
                  },
                ],
              },
            ],
          }),
        }}
      />
    </div>
  )
}
