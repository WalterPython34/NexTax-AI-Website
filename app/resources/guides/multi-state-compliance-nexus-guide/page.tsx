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
  MapPin,
  Building2,
  ShieldCheck,
  TrendingUp,
  FileText,
  Globe,
  X,
  ChevronDown,
  AlertTriangle,
  DollarSign,
  Scale,
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
      "@id": "https://nextax.ai/resources/guides/multi-state-compliance-nexus-guide#webpage",
      url: "https://nextax.ai/resources/guides/multi-state-compliance-nexus-guide",
      name: "Multi-State Compliance: Navigating Nexus Requirements for Growing Businesses",
      isPartOf: { "@id": "https://nextax.ai/#website" },
      about: [
        { "@type": "Thing", name: "Nexus" },
        { "@type": "Thing", name: "Multi-state tax compliance" },
        { "@type": "Thing", name: "Sales tax" },
        { "@type": "Thing", name: "Income tax nexus" },
        { "@type": "Thing", name: "Ecommerce compliance" },
        { "@type": "Thing", name: "LLC" },
        { "@type": "Thing", name: "S corporation" },
      ],
      publisher: { "@id": "https://nextax.ai/#organization" },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: "https://nextax.ai/multi-state-business-map.jpg",
      },
      datePublished: "2026-01-10",
      dateModified: "2026-01-10",
    },
    {
      "@type": "Article",
      "@id": "https://nextax.ai/resources/guides/multi-state-compliance-nexus-guide#article",
      headline: "Multi-State Compliance: Navigating Nexus Requirements for Growing Businesses",
      description:
        "A complete guide to multi-state nexus for ecommerce businesses. Learn how LLCs and S-corps create nexus, manage compliance, and avoid costly mistakes.",
      image: ["https://nextax.ai/multi-state-business-map.jpg"],
      author: {
        "@type": "Person",
        name: "Steve Morello, CPA",
        url: "https://nextax.ai/about",
      },
      publisher: { "@id": "https://nextax.ai/#organization" },
      mainEntityOfPage: {
        "@id": "https://nextax.ai/resources/guides/multi-state-compliance-nexus-guide#webpage",
      },
      datePublished: "2026-01-10",
      dateModified: "2026-01-10",
      articleSection: [
        "What is nexus",
        "Types of nexus for ecommerce",
        "Economic nexus thresholds",
        "LLC vs S-Corp nexus differences",
        "Multi-state compliance framework",
      ],
      keywords: [
        "nexus requirements",
        "multi-state compliance",
        "ecommerce nexus",
        "sales tax nexus",
        "income tax nexus",
        "LLC multi-state",
        "S-Corp multi-state",
        "South Dakota v Wayfair",
        "economic nexus",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": "https://nextax.ai/resources/guides/multi-state-compliance-nexus-guide#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does having customers in a state automatically create nexus?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Nexus depends on thresholds and activity, not customer location alone. You must exceed a state's economic nexus thresholds or have physical presence before obligations arise.",
          },
        },
        {
          "@type": "Question",
          name: "If a marketplace collects sales tax, am I fully covered?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Not always. You may still have registration or income tax obligations in states where marketplace facilitators collect sales tax on your behalf.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need to register in every state I ship to?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No—but you do need to evaluate where nexus exists based on economic thresholds, physical presence, and activity in each state.",
          },
        },
        {
          "@type": "Question",
          name: "Can nexus affect my personal tax return?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. LLC members and S-corp shareholders may have multi-state filing requirements when their business has nexus in multiple states, since income passes through to personal returns.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://nextax.ai/resources/guides/multi-state-compliance-nexus-guide#breadcrumbs",
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
          name: "Multi-State Compliance: Navigating Nexus Requirements",
          item: "https://nextax.ai/resources/guides/multi-state-compliance-nexus-guide",
        },
      ],
    },
  ],
}

export default function MultiStateComplianceNexusGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      question: "Does having customers in a state automatically create nexus?",
      answer:
        "No. Nexus depends on thresholds and activity, not customer location alone. You must exceed a state's economic nexus thresholds or have physical presence before obligations arise.",
    },
    {
      question: "If a marketplace collects sales tax, am I fully covered?",
      answer:
        "Not always. Marketplace facilitator laws cover sales tax collection on marketplace transactions, but you may still have registration obligations, income tax nexus, or franchise tax exposure in those states.",
    },
    {
      question: "Do I need to register in every state I ship to?",
      answer:
        "No—but you do need to evaluate where nexus exists. Register only where you have actual obligations based on economic thresholds, physical presence, or other nexus-creating activities.",
    },
    {
      question: "Can nexus affect my personal tax return?",
      answer:
        "Yes. LLC members and S-corp shareholders may have multi-state personal filing requirements because business income passes through to their individual returns. Each state with nexus may require a non-resident return.",
    },
    {
      question: "What is the difference between physical and economic nexus?",
      answer:
        "Physical nexus is created by having a tangible presence in a state—employees, inventory, offices. Economic nexus is triggered by exceeding revenue or transaction thresholds, even with no physical presence, as established by South Dakota v. Wayfair.",
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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

        {/* Article */}
        <article className="container mx-auto px-4 pb-20">
          <div className="max-w-4xl mx-auto">
            {/* Meta */}
            <div className="mb-8">
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 mb-4">Compliance</Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Multi-State Compliance: Navigating Nexus Requirements
                <span className="text-emerald-400"> for Growing Businesses</span>
              </h1>
              <p className="text-xl text-slate-400 mb-6">A Practical Guide for Ecommerce LLCs & S-Corps</p>
              <div className="flex flex-wrap items-center gap-6 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Steve Morello, CPA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>10 min read</span>
                </div>
                <div>January 10, 2026</div>
              </div>
            </div>

            {/* Featured Image */}
            <div className="mb-12 rounded-xl overflow-hidden">
              <Image
                src="/multi-state-business-map.jpg"
                alt="Multi-state compliance map showing nexus requirements across the United States"
                width={1200}
                height={600}
                className="w-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-lg max-w-none">
              {/* Introduction */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6 mb-12">
                <p className="text-slate-200 text-lg leading-relaxed mb-0">
                  For ecommerce founders, multi-state compliance is rarely a conscious decision—it's a{" "}
                  <span className="text-orange-300 font-semibold">byproduct of growth</span>. You don't "choose" to
                  operate in multiple states; your customers, platforms, fulfillment partners, and scale make that
                  decision for you.
                </p>
              </div>

              <p className="text-slate-300 text-lg mb-6">
                This guide explains what nexus is, how ecommerce businesses create it, why LLCs and S-corps are
                especially exposed, and how founders should think about multi-state compliance{" "}
                <span className="text-white font-semibold">strategically</span>—not just as a sales-tax problem.
              </p>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-12">
                <p className="text-slate-300 mb-0">
                  Unlike software-first explanations from Avalara, TaxJar, or Numeral, this article focuses on{" "}
                  <span className="text-blue-300 font-semibold">
                    tax structure, risk, and decision-making
                  </span>
                  —not just transaction automation.
                </p>
              </div>

              {/* Section 1: What Is Nexus */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-orange-400" />
                  </div>
                  What Is Nexus and Why Does It Matter for Ecommerce Businesses?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Nexus is the level of connection between your business and a state that gives that state the{" "}
                  <span className="text-white font-semibold">legal authority to tax you</span>. Once nexus exists, you
                  may be required to:
                </p>

                <div className="grid md:grid-cols-2 gap-3 mb-6">
                  {[
                    "Register with the state",
                    "Collect and remit sales tax",
                    "File income or franchise tax returns",
                    "Comply with local reporting and notice rules",
                  ].map((item, i) => (
                    <Card key={i} className="bg-gray-900/50 border-gray-700">
                      <CardContent className="p-4 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
                        <span className="text-slate-300">{item}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <Scale className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-amber-200 font-semibold mb-2">South Dakota v. Wayfair (2018)</p>
                      <p className="text-slate-300 mb-0">
                        Since this landmark U.S. Supreme Court decision, states no longer require physical presence to
                        assert nexus.{" "}
                        <span className="text-white font-semibold">Economic activity alone can be enough.</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    <span className="text-red-400 font-semibold">Key point:</span> Nexus is not optional, and it's not
                    limited to sales tax.
                  </p>
                </div>
              </section>

              {/* Section 2: Types of Nexus */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-blue-400" />
                  </div>
                  What Types of Nexus Affect Ecommerce LLCs and S-Corps?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Most founders only think about sales tax nexus—but that's just one layer. Ecommerce businesses may
                  create{" "}
                  <span className="text-white font-semibold">multiple, overlapping nexus obligations</span>.
                </p>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-6">
                      <DollarSign className="w-8 h-8 text-blue-400 mb-3" />
                      <p className="text-white font-semibold mb-3">Sales Tax Nexus</p>
                      <ul className="space-y-2 text-slate-300 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">-</span>Revenue thresholds
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">-</span>Transaction counts
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">-</span>Marketplace sales in some states
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-6">
                      <FileText className="w-8 h-8 text-emerald-400 mb-3" />
                      <p className="text-white font-semibold mb-3">Income Tax Nexus</p>
                      <ul className="space-y-2 text-slate-300 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-1">-</span>Doing business in the state
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-1">-</span>Apportionment factors
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-1">-</span>Pass-through income allocation
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-6">
                      <Building2 className="w-8 h-8 text-amber-400 mb-3" />
                      <p className="text-white font-semibold mb-3">Franchise & Gross Receipts</p>
                      <ul className="space-y-2 text-slate-300 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-amber-400 mt-1">-</span>Registration / "doing business"
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-amber-400 mt-1">-</span>State-specific rules
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-amber-400 mt-1">-</span>E.g., Texas, California
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                    <p className="text-slate-300 mb-0">
                      LLCs and S-corps are <span className="text-white font-semibold">pass-through entities</span>,
                      which means multi-state activity often flows directly to the owners' personal returns—amplifying
                      the impact of nexus mistakes.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3: How Nexus Is Created */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  How Ecommerce Businesses Create Nexus Without Realizing It
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Most nexus exposure is <span className="text-red-400 font-semibold">accidental</span>. Founders don't
                  expand state-by-state—they expand through platforms and logistics.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Common ecommerce nexus triggers:</h3>
                    <ul className="space-y-3">
                      {[
                        "Crossing state economic thresholds through online sales",
                        "Using third-party fulfillment centers (including FBA and 3PLs)",
                        "Hiring remote employees or contractors",
                        "Attending trade shows or pop-ups",
                        'Registering to "do business" without understanding tax consequences',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300">
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    Once nexus is created,{" "}
                    <span className="text-red-300 font-semibold">
                      compliance obligations exist whether or not you act on them
                    </span>
                    .
                  </p>
                </div>
              </section>

              {/* Section 4: Economic Nexus */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  </div>
                  Economic Nexus: Why Revenue Alone Can Create Compliance Obligations
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Economic nexus is triggered when sales or transaction volume exceed a state's threshold—even with{" "}
                  <span className="text-white font-semibold">zero physical presence</span>.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-6 text-center">
                      <DollarSign className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                      <p className="text-3xl font-bold text-white mb-1">$100,000</p>
                      <p className="text-emerald-300 text-sm">in annual sales</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-6 text-center">
                      <FileText className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                      <p className="text-3xl font-bold text-white mb-1">200</p>
                      <p className="text-blue-300 text-sm">transactions</p>
                    </CardContent>
                  </Card>
                </div>

                <p className="text-slate-300 mb-4">Some states are more aggressive. Others layer additional rules.</p>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-amber-200 font-semibold mb-2">Important nuance</p>
                      <p className="text-slate-300 mb-0">
                        Marketplace facilitators may collect sales tax on your behalf—but that{" "}
                        <span className="text-white font-semibold">
                          does not always eliminate your filing or registration obligations
                        </span>
                        . This is one of the most misunderstood areas in ecommerce compliance.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5: Not Just Sales Tax */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-amber-400" />
                  </div>
                  Why Multi-State Compliance Is Not "Just a Sales Tax Problem"
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Sales tax software solves only one piece of the puzzle. Nexus can create{" "}
                  <span className="text-white font-semibold">income tax and franchise tax exposure</span> even if no
                  sales tax is due.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Examples:</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>
                          An S-corp with customers nationwide may need to{" "}
                          <span className="text-white">apportion income across states</span>
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>
                          LLC members may receive K-1s{" "}
                          <span className="text-white">allocating income to multiple jurisdictions</span>
                        </span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>
                          States may require informational returns{" "}
                          <span className="text-white">even when tax due is minimal</span>
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Tools like Avalara and TaxJar excel at rate calculation, but they do not determine:
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {[
                        "Whether you should register",
                        "Whether income tax filings are required",
                        "How entity structure affects exposure",
                        "When voluntary disclosure makes sense",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                          <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-slate-400 mt-4 mb-0 italic">
                      Those decisions are strategic, not mechanical.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Section 6: LLC vs S-Corp */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-400" />
                  </div>
                  How Nexus Affects LLCs vs S-Corps Differently
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Entity structure changes how multi-state compliance flows through the business.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-6">
                      <p className="text-emerald-300 font-semibold text-lg mb-4">LLCs (Default Pass-Through)</p>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>Income may be sourced to multiple states</span>
                        </li>
                        <li className="flex items-start gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>Owners may face individual filing obligations</span>
                        </li>
                        <li className="flex items-start gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>Apportionment rules vary widely</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-6">
                      <p className="text-blue-300 font-semibold text-lg mb-4">S-Corps</p>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <span>Payroll creates additional state exposure</span>
                        </li>
                        <li className="flex items-start gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <span>Reasonable salary rules apply across states</span>
                        </li>
                        <li className="flex items-start gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <span>Withholding and unemployment taxes add complexity</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    In both cases,{" "}
                    <span className="text-white font-semibold">
                      multi-state compliance compounds quickly once growth accelerates
                    </span>
                    .
                  </p>
                </div>
              </section>

              {/* Section 7: Common Mistakes */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  Common Multi-State Compliance Mistakes
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Most penalties don't come from evasion—they come from{" "}
                  <span className="text-red-400 font-semibold">delay</span>.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {[
                    "Waiting for a notice before registering",
                    "Assuming marketplace collection eliminates all obligations",
                    "Ignoring income tax nexus while focusing only on sales tax",
                    'Registering everywhere "just to be safe"',
                    "Letting software auto-register without a strategy",
                    "Not tracking fulfillment center locations",
                  ].map((item, i) => (
                    <Card key={i} className="bg-red-500/10 border-red-500/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-slate-300 mb-0">{item}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <p className="text-slate-400 italic">
                  Each mistake increases cost, risk, or administrative burden.
                </p>
              </section>

              {/* Section 8: Strategic Framework */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  </div>
                  A Strategic Framework for Managing Multi-State Nexus
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  High-growth ecommerce founders need a{" "}
                  <span className="text-white font-semibold">framework—not just tools</span>.
                </p>

                <div className="space-y-4 mb-6">
                  {[
                    {
                      step: "1",
                      title: "Nexus Identification",
                      desc: "Understand where obligations actually exist",
                      color: "emerald",
                    },
                    {
                      step: "2",
                      title: "Risk Prioritization",
                      desc: "Not all states pose equal risk",
                      color: "blue",
                    },
                    {
                      step: "3",
                      title: "Entity-Aware Planning",
                      desc: "Align compliance with LLC or S-corp structure",
                      color: "amber",
                    },
                    {
                      step: "4",
                      title: "Registration Strategy",
                      desc: "Register intentionally, not reactively",
                      color: "orange",
                    },
                    {
                      step: "5",
                      title: "Ongoing Monitoring",
                      desc: "Thresholds change as revenue scales",
                      color: "emerald",
                    },
                  ].map((item, i) => (
                    <Card
                      key={i}
                      className={`bg-${item.color}-500/10 border-${item.color}-500/30`}
                      style={{
                        backgroundColor:
                          item.color === "emerald"
                            ? "rgba(16,185,129,0.1)"
                            : item.color === "blue"
                              ? "rgba(59,130,246,0.1)"
                              : item.color === "amber"
                                ? "rgba(245,158,11,0.1)"
                                : "rgba(249,115,22,0.1)",
                        borderColor:
                          item.color === "emerald"
                            ? "rgba(16,185,129,0.3)"
                            : item.color === "blue"
                              ? "rgba(59,130,246,0.3)"
                              : item.color === "amber"
                                ? "rgba(245,158,11,0.3)"
                                : "rgba(249,115,22,0.3)",
                      }}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold">{item.step}</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold">{item.title}</p>
                          <p className="text-slate-400 text-sm mb-0">{item.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <p className="text-slate-400 italic">
                  This approach reduces surprises and avoids unnecessary filings.
                </p>
              </section>

              {/* Section 9: Consequences */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  What Happens If You Ignore Nexus Obligations?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Ignoring nexus does not make it go away.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "Back taxes", icon: DollarSign },
                    { label: "Penalties and interest", icon: AlertCircle },
                    { label: "Forced registration", icon: FileText },
                    { label: "Loss of voluntary disclosure options", icon: ShieldCheck },
                    { label: "Compounded compliance costs", icon: TrendingUp },
                  ].map((item, i) => (
                    <Card key={i} className="bg-gray-900/50 border-gray-700">
                      <CardContent className="p-4 flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <span className="text-slate-300">{item.label}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    States increasingly share data with marketplaces and processors, making noncompliance{" "}
                    <span className="text-red-300 font-semibold">easier to detect over time</span>.
                  </p>
                </div>
              </section>

              {/* Section 10: Scaling */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6">
                  How Founders Should Think About Multi-State Compliance as They Scale
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Multi-state compliance is not a one-time project—it's an{" "}
                  <span className="text-white font-semibold">operating system</span>.
                </p>

                <Card className="bg-emerald-500/10 border-emerald-500/30 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">As revenue grows, founders should:</h3>
                    <ul className="space-y-3">
                      {[
                        "Revisit nexus quarterly",
                        "Align compliance with cash flow",
                        "Avoid reactive registrations",
                        "Treat structure and compliance as connected",
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    Handled correctly, compliance becomes{" "}
                    <span className="text-emerald-300 font-semibold">predictable</span>. Handled late, it becomes{" "}
                    <span className="text-red-400 font-semibold">expensive</span>.
                  </p>
                </div>
              </section>

              {/* When to Get Help */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6">When It Makes Sense to Get Help</h2>
                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <p className="text-slate-300 mb-4">If your ecommerce business has:</p>
                    <ul className="space-y-3">
                      {[
                        "Customers in multiple states",
                        "Marketplace + direct sales",
                        "Remote team members",
                        "An LLC or S-corp structure",
                        "Rapid revenue growth",
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-orange-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="text-slate-300 mt-4 mb-0">
                      ...then multi-state compliance deserves{" "}
                      <span className="text-white font-semibold">intentional planning</span>.
                    </p>
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
                <h3 className="text-xl font-semibold text-white mb-4">Sources Cited</h3>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li>Internal Revenue Service (income sourcing and pass-through guidance)</li>
                  <li>State Departments of Revenue</li>
                  <li>U.S. Supreme Court (South Dakota v. Wayfair, Inc., 585 U.S. ___ (2018))</li>
                </ul>
              </section>

              {/* CTA */}
              <Card className="bg-gradient-to-r from-emerald-500 to-cyan-500 border-orange-500/30">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Need Help Navigating Multi-State Compliance?
                  </h3>
                  <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                    NexTax.AI helps ecommerce founders understand how nexus rules apply to their specific situation—with
                    structure-aware planning, not just software automation.
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
                        className="border-orange-500/50 text-orange-300 hover:bg-orange-500/10 bg-white"
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
