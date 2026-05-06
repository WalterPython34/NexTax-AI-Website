"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  Share2,
  Bookmark,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  DollarSign,
  TrendingUp,
  Shield,
  Target,
} from "lucide-react"

const faqs = [
  {
    question: "What percentage of SMB deals fail before closing?",
    answer:
      "Industry estimates suggest 30-50% of signed LOIs never reach closing. Most failures stem from predictable operational issues rather than catastrophic problems.",
  },
  {
    question: "What is the most common reason SMB acquisitions fall apart?",
    answer:
      "Incomplete pre-LOI work is the leading cause. Buyers who rush to sign LOIs without understanding customer concentration, working capital needs, and EBITDA quality frequently discover deal-breaking issues during diligence.",
  },
  {
    question: "How can buyers protect themselves from working capital disputes?",
    answer:
      "Establish the working capital peg methodology early, use trailing averages, normalize anomalies, and define formulas explicitly in the LOI. This makes working capital a mechanical calculation instead of an emotional negotiation.",
  },
  {
    question: "When should buyers involve lenders in an SMB acquisition?",
    answer:
      "Experienced buyers integrate lenders early in the process—within the first week after LOI—sharing preliminary financial models, concentration analysis, and QoE findings. Early communication dramatically reduces closing friction.",
  },
  {
    question: "How do earnouts help close deals with customer concentration risk?",
    answer:
      "Earnouts tied to specific customer retention metrics allow buyers to share concentration risk with sellers. This often bridges valuation gaps that pure price negotiations cannot resolve.",
  },
]

export default function WhySMBDealsFallApartPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Why SMB Deals Fall Apart Before Closing — And How Smart Buyers Keep Them Alive",
        description:
          "Most SMB acquisitions fail for predictable reasons: weak pre-LOI diligence, vague LOIs, poor project management, and financing friction. Learn how disciplined buyers avoid these deal killers.",
        image: "https://www.nextax.ai/images/smb-deal-closing.jpg",
        datePublished: "2026-01-25",
        dateModified: "2026-01-25",
        author: {
          "@type": "Person",
          name: "Steve Morello, CPA",
          url: "https://www.nextax.ai/about",
        },
        publisher: {
          "@type": "Organization",
          name: "NexTax.AI",
          logo: {
            "@type": "ImageObject",
            url: "https://www.nextax.ai/logo.png",
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "https://www.nextax.ai/resources/guides/why-smb-deals-fall-apart",
        },
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
            name: "Why SMB Deals Fall Apart",
            item: "https://www.nextax.ai/resources/guides/why-smb-deals-fall-apart",
          },
        ],
      },
    ],
  }

  const dealKillers = [
    { icon: FileText, title: "Incomplete Pre-LOI Work", description: "Rushing to exclusivity before understanding the business" },
    { icon: AlertTriangle, title: "Vague LOIs", description: "Ambiguous terms that create future conflict" },
    { icon: Users, title: "Weak Project Management", description: "Poor coordination that kills momentum" },
    { icon: DollarSign, title: "Add-Backs That Collapse", description: "EBITDA adjustments that don't survive scrutiny" },
    { icon: TrendingUp, title: "Working Capital Surprises", description: "Disputes that derail deals near closing" },
    { icon: Target, title: "Customer Concentration", description: "Fragile relationships that spook lenders" },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black pt-16">
        {/* Hero Section */}
        <header className="py-16 border-b border-slate-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-slate-400 mb-8">
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
                <span>/</span>
                <Link href="/resources" className="hover:text-white transition-colors">
                  Resources
                </Link>
                <span>/</span>
                <span className="text-slate-300">Acquisitions</span>
              </nav>

              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mb-6">Acquisitions</Badge>

              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Why SMB Deals Fall Apart Before Closing — And How Smart Buyers Keep Them Alive
              </h1>

              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Most SMB acquisitions do not collapse because of catastrophic fraud or dramatic blowups. They fall apart
                because of predictable operational issues that were either ignored, misunderstood, or addressed too late.
              </p>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400 mb-8">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Steve Morello, CPA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <time dateTime="2026-01-25">January 25, 2026</time>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>18 min read</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        <div className="container mx-auto px-4 -mt-8 mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-slate-800">
              <img
                src="/images/blog/smb-deal-closing.jpg"
                alt="Business acquisition deal closing - professionals reviewing documents"
                className="w-full h-[400px] object-cover"
              />
            </div>
          </div>
        </div>

        {/* Deal Killers Overview */}
        <section className="py-12 bg-slate-900/50 border-y border-slate-800">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-white text-center mb-8">The 12 Most Common Deal Killers</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dealKillers.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <item.icon className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-white text-sm">{item.title}</div>
                      <div className="text-xs text-slate-400">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg prose-invert max-w-none">
              {/* Introduction */}
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                Anyone who spends enough time buying small and midsize businesses eventually realizes something important:
                getting an LOI signed is usually the easy part. The real challenge is getting the deal to the closing table
                intact.
              </p>

              <p className="text-slate-300 leading-relaxed mb-8">
                Weak diligence, vague LOIs, financing friction, customer concentration, sloppy project management, and
                mismatched expectations quietly kill transactions every day. None of these problems are glamorous. But they
                are exactly where disciplined buyers protect returns and inexperienced buyers lose deals.
              </p>

              <blockquote className="border-l-4 border-cyan-500 pl-6 my-8 italic text-slate-300">
                The good news is that most failed SMB deals follow recognizable patterns. Once you understand those patterns,
                you can structure around them before they become fatal.
              </blockquote>

              {/* Section 1 */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">
                    1
                  </span>
                  Incomplete Pre-LOI Work
                </h2>

                <p className="text-slate-300 leading-relaxed mb-4">
                  One of the most common mistakes buyers make is rushing to sign an LOI before they fully understand the
                  business. The thinking is usually: <em>"Let's get exclusivity first and sort out the details later."</em>
                </p>

                <p className="text-slate-300 leading-relaxed mb-6">
                  The problem is that unresolved risk eventually surfaces during diligence — usually after expectations and
                  emotions are already locked in.
                </p>

                <h3 className="text-lg font-semibold text-white mb-4">Common warning signs:</h3>
                <ul className="space-y-2 mb-6">
                  {[
                    "Customer concentration discovered halfway through diligence",
                    "At-will customer relationships with no contractual protection",
                    "Aggressive EBITDA add-backs with little support",
                    "Working capital needs that differ materially from the seller's narrative",
                    "Heavy owner dependence hidden beneath the surface",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />
                      {item}
                    </li>
                  ))}
                </ul>

                <h3 className="text-lg font-semibold text-white mb-4">What disciplined buyers do instead:</h3>
                <p className="text-slate-300 leading-relaxed mb-4">
                  Strong buyers conduct a focused pre-LOI review before discussing valuation seriously. That usually includes:
                </p>
                <ul className="space-y-2 mb-6">
                  {[
                    "Top-10 customer list with revenue concentration",
                    "24 months of monthly financials",
                    "AR aging reports",
                    "Existing debt schedules",
                    "Preliminary working capital analysis",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                      {item}
                    </li>
                  ))}
                </ul>

                <p className="text-slate-300 leading-relaxed">
                  They also pressure-test downside scenarios early. If one customer represents 35% of revenue, they
                  immediately ask: <em>"What happens if that customer leaves six months after close?"</em>
                </p>
              </section>

              {/* Section 2 */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">
                    2
                  </span>
                  Vague LOIs Create Future Conflict
                </h2>

                <p className="text-slate-300 leading-relaxed mb-4">
                  Many SMB LOIs are written far too loosely. Terms like "purchase price based on adjusted EBITDA" sound
                  straightforward until both parties realize they define "adjusted" very differently.
                </p>

                <h3 className="text-lg font-semibold text-white mb-4">Typical late-stage disputes:</h3>
                <ul className="space-y-2 mb-6">
                  {[
                    "Working capital disagreements",
                    "EBITDA normalization fights",
                    "Conflicting interpretations of add-backs",
                    "Seller shock around financing structure",
                    "Arguments over deferred revenue treatment",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />
                      {item}
                    </li>
                  ))}
                </ul>

                <h3 className="text-lg font-semibold text-white mb-4">What smart buyers clarify upfront:</h3>
                <ul className="space-y-2">
                  {[
                    "High-level Adjusted EBITDA methodology",
                    "Working capital calculation method and peg assumptions",
                    "Collar ranges and true-up procedures",
                    "Seller financing expectations",
                    "Earnout concepts tied to identifiable risks",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Section 3 */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">
                    3
                  </span>
                  Weak Project Management Kills Momentum
                </h2>

                <p className="text-slate-300 leading-relaxed mb-4">
                  Small business acquisitions still require real transaction management. Deals with poor coordination almost
                  always drift.
                </p>

                <p className="text-slate-300 leading-relaxed mb-6">
                  SMB transactions involve attorneys, lenders, QoE providers, CPAs, insurance advisors, landlords, and
                  third-party counterparties. Without centralized coordination, delays compound quickly.
                </p>

                <h3 className="text-lg font-semibold text-white mb-4">What disciplined buyers do differently:</h3>
                <ul className="space-y-2">
                  {[
                    "One-page close trackers",
                    "Defined owners for every workstream",
                    "Weekly standing diligence calls",
                    "Milestone-based exclusivity extensions",
                    "Rapid escalation paths for blockers",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                      {item}
                    </li>
                  ))}
                </ul>

                <blockquote className="border-l-4 border-cyan-500 pl-6 my-8 italic text-slate-300">
                  Operational discipline closes more deals than financial creativity.
                </blockquote>
              </section>

              {/* Section 4 */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">
                    4
                  </span>
                  Add-Backs That Collapse Under Scrutiny
                </h2>

                <p className="text-slate-300 leading-relaxed mb-4">
                  Adjusted EBITDA is often where optimism collides with reality. Many seller add-backs look reasonable in a
                  CIM but become difficult to defend once lenders and QoE providers start digging deeper.
                </p>

                <h3 className="text-lg font-semibold text-white mb-4">Common weak add-backs:</h3>
                <ul className="space-y-2 mb-6">
                  {[
                    '"One-time" expenses that recur annually',
                    "Owner compensation adjustments with no replacement analysis",
                    "Deferred marketing spend",
                    "Deferred maintenance costs",
                    "Consulting expenses tied to ongoing operations",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />
                      {item}
                    </li>
                  ))}
                </ul>

                <p className="text-slate-300 leading-relaxed">
                  Sophisticated buyers validate every adjustment against documentation: payroll records, vendor invoices,
                  contracts, tax returns, and historical spending patterns. They focus on{" "}
                  <strong className="text-white">replacement cost</strong> rather than elimination cost.
                </p>
              </section>

              {/* Section 5 */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">
                    5
                  </span>
                  Working Capital Surprises
                </h2>

                <p className="text-slate-300 leading-relaxed mb-4">
                  Working capital disputes quietly derail many SMB transactions near the finish line. Sellers often view
                  working capital as excess cash. Buyers view it as the operational fuel required to run the business after
                  closing.
                </p>

                <h3 className="text-lg font-semibold text-white mb-4">How disciplined buyers avoid conflict:</h3>
                <ul className="space-y-2">
                  {[
                    "Establish the peg early",
                    "Use trailing averages",
                    "Normalize anomalies",
                    "Discount aged AR",
                    "Remove dead inventory",
                    "Define formulas explicitly inside the LOI",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Section 6 */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">
                    6
                  </span>
                  Customer Concentration and Transfer Risk
                </h2>

                <p className="text-slate-300 leading-relaxed mb-4">
                  Many deals lose momentum once buyers discover the top customer relationships are fragile, at-will, or
                  personally tied to the founder. The issue is not concentration alone — it's whether the concentration risk
                  is transferable and manageable.
                </p>

                <h3 className="text-lg font-semibold text-white mb-4">What experienced buyers evaluate early:</h3>
                <ul className="space-y-2 mb-6">
                  {[
                    "Largest customer percentages and top-3 concentration levels",
                    "Contract assignability and renewal timing",
                    "Relationship ownership and historical churn",
                    "Transition support expectations",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
                      {item}
                    </li>
                  ))}
                </ul>

                <p className="text-slate-300 leading-relaxed">
                  Strong buyers use structure intelligently: earnouts tied to named accounts, holdbacks, seller notes, and
                  gross-profit retention triggers. Good structure often solves problems that pure valuation negotiations
                  cannot.
                </p>
              </section>

              {/* Risk Allocation Table */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">Smart Risk Allocation</h2>
                <p className="text-slate-300 leading-relaxed mb-6">
                  Different risks require different structures. Sophisticated SMB buyers think in terms of risk allocation,
                  not just headline purchase price.
                </p>

                <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900/50">
                        <th className="text-left p-4 text-slate-300 font-semibold">Risk</th>
                        <th className="text-left p-4 text-slate-300 font-semibold">Better Solution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { risk: "Customer retention risk", solution: "Earnout" },
                        { risk: "Tax exposure", solution: "Escrow" },
                        { risk: "Transition dependency", solution: "Seller note" },
                        { risk: "Working capital volatility", solution: "Collar and true-up" },
                        { risk: "Deferred revenue obligations", solution: "Cost-to-fulfill adjustment" },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-slate-800 last:border-0">
                          <td className="p-4 text-slate-300">{row.risk}</td>
                          <td className="p-4 text-cyan-400 font-medium">{row.solution}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Closing Checklist */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">A Simple SMB Deal Closing Checklist</h2>
                <p className="text-slate-300 leading-relaxed mb-6">
                  Disciplined buyers typically run a straightforward close plan from LOI through funding:
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      title: "Financial & QoE",
                      items: ["Engage provider immediately", "Preliminary findings by Week 1", "Final report by Weeks 3-4"],
                    },
                    {
                      title: "Working Capital",
                      items: ["Define peg methodology early", "Normalize AR/AP/inventory", "Establish collar and true-up mechanics"],
                    },
                    {
                      title: "Legal",
                      items: ["Draft APA quickly", "Identify assignment issues immediately", "Start consent requests early"],
                    },
                    {
                      title: "Financing",
                      items: ["Share lender package within first week", "Align seller note terms with underwriting", "Track conditions actively"],
                    },
                  ].map((section, i) => (
                    <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-3">{section.title}</h3>
                      <ul className="space-y-2">
                        {section.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* Final Thoughts */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">Final Thoughts</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  Most SMB deals that fail do so for predictable reasons: weak pre-LOI diligence, vague LOIs, poor project
                  management, unsupported add-backs, working capital disputes, customer concentration risk, founder
                  dependency, financing friction, consent delays, and timeline drift.
                </p>

                <p className="text-slate-300 leading-relaxed mb-4">
                  None of these issues require heroic problem-solving. Most simply require discipline, structure, and
                  proactive communication.
                </p>

                <blockquote className="border-l-4 border-cyan-500 pl-6 my-8 italic text-slate-300">
                  The buyers who consistently close successful acquisitions are usually not the most aggressive bidders. They
                  are the ones who identify risk early, document expectations clearly, and structure deals intelligently
                  before problems become emotional.
                </blockquote>

                <p className="text-slate-300 leading-relaxed">
                  Because in SMB M&A, signing the LOI is only the beginning. The real skill is getting to close with a
                  business that still performs the way your model expected once the first payroll hits your account.
                </p>
              </section>
            </div>

            {/* FAQ Section */}
            <section className="mt-16 pt-12 border-t border-slate-800">
              <h2 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <div key={i} className="border border-slate-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-800/50 transition-colors"
                    >
                      <span className="font-medium text-white pr-4">{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${
                          openFaqIndex === i ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {openFaqIndex === i && (
                      <div className="px-6 pb-4">
                        <p className="text-slate-300 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* CTA Section */}
            <section className="mt-16 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl p-8 border border-cyan-500/20">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Need Help Evaluating a Deal?</h2>
                <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                  Our acquisition analysis tools help you identify deal-breakers before you commit capital. Normalize
                  earnings, stress-test financing, and benchmark against real transactions.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/deal-reality-check">
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8">
                      Analyze a Deal
                    </Button>
                  </Link>
                  <Link href="/acquisitions">
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                      Learn About Our Services
                    </Button>
                  </Link>
                </div>
              </div>
            </section>

            {/* Back to Resources */}
            <div className="mt-12 pt-8 border-t border-slate-800">
              <Link
                href="/resources"
                className="inline-flex items-center text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Resources
              </Link>
            </div>
          </div>
        </div>
      </article>
    </>
  )
}
