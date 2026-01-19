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
  Store,
  Sparkles,
  X,
  ChevronDown,
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
      "name": "NexTax.AI",
      "url": "https://nextax.ai/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://nextax.ai/nextax-logo.png"
      },
      "description": "NexTax.AI helps new entrepreneurs and ecommerce self-employed individuals form and register LLC and S-corp entities, with founder-led expertise and fintech automation.",
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
      "@id": "https://nextax.ai/resources/guides/llc-vs-sole-prop-vs-s-corp-ecommerce#webpage",
      "url": "https://nextax.ai/resources/guides/llc-vs-sole-prop-vs-s-corp-ecommerce",
      "name": "LLC vs Sole Proprietor vs S-Corp for Shopify, Etsy & TikTok Sellers (And When to Switch)",
      "isPartOf": { "@id": "https://nextax.ai/#website" },
      "about": [
        { "@type": "Thing", "name": "Limited liability company (LLC)" },
        { "@type": "Thing", "name": "S corporation" },
        { "@type": "Thing", "name": "Sole proprietorship" },
        { "@type": "Thing", "name": "Shopify" },
        { "@type": "Thing", "name": "Etsy" },
        { "@type": "Thing", "name": "TikTok Shop" }
      ],
      "publisher": { "@id": "https://nextax.ai/#organization" },
      "primaryImageOfPage": {
        "@type": "ImageObject",
        "url": "https://nextax.ai/images/blog/scorp-sm-mm-llc.png"
      },
      "datePublished": "2026-01-19",
      "dateModified": "2026-01-19"
    },
    {
      "@type": "Article",
      "@id": "https://nextax.ai/resources/guides/llc-vs-sole-prop-vs-s-corp-ecommerce#article",
      "headline": "LLC vs Sole Proprietor vs S-Corp for Shopify, Etsy & TikTok Sellers (And When to Switch)",
      "description": "A platform-specific guide for Shopify, Etsy, and TikTok sellers comparing sole proprietor vs LLC vs S-Corp—with decision trees and profit thresholds for switching.",
      "image": ["https://nextax.ai/images/blog/scorp-sm-mm-llc.png"],
      "author": {
        "@type": "Person",
        "name": "Steve Morello, CPA",
        "url": "https://nextax.ai/about"
      },
      "publisher": { "@id": "https://nextax.ai/#organization" },
      "mainEntityOfPage": {
        "@id": "https://nextax.ai/resources/guides/llc-vs-sole-prop-vs-s-corp-ecommerce#webpage"
      },
      "datePublished": "2026-01-19",
      "dateModified": "2026-01-19",
      "articleSection": [
        "Business structures for online sellers",
        "When to form an LLC",
        "When to elect S-Corp status",
        "Shopify vs Etsy vs TikTok considerations"
      ],
      "keywords": [
        "LLC vs sole proprietor",
        "S-Corp for ecommerce",
        "Shopify taxes",
        "Etsy seller taxes",
        "TikTok Shop taxes",
        "S-Corp threshold"
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://nextax.ai/resources/guides/llc-vs-sole-prop-vs-s-corp-ecommerce#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do I need an LLC to sell on Shopify or Etsy?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Shopify and Etsy generally don't require an LLC to sell. Many sellers start as sole proprietors, but an LLC is often recommended once sales become consistent or liability risk increases."
          }
        },
        {
          "@type": "Question",
          "name": "Does TikTok Shop require an LLC or S-Corp?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. TikTok Shop does not typically require an LLC or S-Corp. Sellers and creators may still choose an LLC for liability protection and consider an S-Corp election once profits justify payroll and compliance."
          }
        },
        {
          "@type": "Question",
          "name": "When should I switch from sole proprietor to LLC as an online seller?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Many online sellers consider an LLC once they consistently earn about $1,000–$3,000 per month or when risk increases (physical products, customer data, contracts, or brand deals)."
          }
        },
        {
          "@type": "Question",
          "name": "At what profit level does an S-Corp make sense for Shopify, Etsy, or TikTok sellers?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For many sellers, an S-Corp election is most worthwhile around $50,000–$80,000 per year in net profit, depending on reasonable salary requirements and payroll/compliance costs."
          }
        },
        {
          "@type": "Question",
          "name": "Can I form an LLC first and elect S-Corp status later?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. A common path is forming an LLC for legal protection first, then electing S-Corp taxation later when profits are consistently high enough to offset added payroll and admin requirements."
          }
        }
      ]
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://nextax.ai/resources/guides/llc-vs-sole-prop-vs-s-corp-ecommerce#breadcrumbs",
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
          "name": "LLC vs Sole Proprietor vs S-Corp for Shopify, Etsy & TikTok Sellers",
          "item": "https://nextax.ai/resources/guides/llc-vs-sole-prop-vs-s-corp-ecommerce"
        }
      ]
    }
  ]
}

export default function LLCvsSolePropvsSCorpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      question: "Do I need an LLC to sell on Shopify or Etsy?",
      answer: "No, but it's strongly recommended once you have consistent sales or risk exposure. Shopify and Etsy don't require an LLC to sell, but operating without one means your personal assets are at risk if something goes wrong."
    },
    {
      question: "Does TikTok Shop require an LLC or S-Corp?",
      answer: "No, TikTok Shop doesn't require a formal business entity. However, brand deals and contracts often do, and having an LLC provides important liability protection as your creator business grows."
    },
    {
      question: "Can a single owner have an S-Corp?",
      answer: "Yes—most S-Corps are actually single-owner businesses. An S-Corp is a tax election, not a business structure, so a single-member LLC can elect S-Corp taxation once profits justify the added complexity."
    },
    {
      question: "When should I switch from sole proprietor to LLC?",
      answer: "Most online sellers should consider an LLC once they consistently earn $1,000–$3,000 per month, or immediately if they're selling physical products, handling customer data, or entering brand deals."
    },
    {
      question: "At what profit level does an S-Corp make sense?",
      answer: "For most sellers, an S-Corp starts making sense around $50,000–$80,000/year in net profit. Below that threshold, the payroll and compliance costs often outweigh the tax savings."
    }
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
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 mb-4">Tax Strategy</Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                LLC vs Sole Proprietor vs S-Corp for Shopify, Etsy & TikTok Sellers
                <span className="text-emerald-400"> (And When to Switch)</span>
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Steve Morello, CPA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>18 min read</span>
                </div>
                <div>January 19, 2026</div>
              </div>
            </div>

            {/* Featured Image */}
            <div className="mb-12 rounded-xl overflow-hidden">
              <Image
                src="/images/blog/scorp-sm-mm-llc.png"
                alt="S Corporation vs Single-Member LLC vs Multi-Member LLC comparison chart"
                width={1200}
                height={600}
                className="w-full object-cover"
              />
            </div>

            {/* Article Content */}
            <div className="prose prose-invert prose-lg max-w-none">
              {/* Introduction */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-12">
                <p className="text-slate-200 text-lg leading-relaxed mb-0">
                  <span className="text-emerald-400 font-semibold">Short answer:</span> most online sellers start as sole proprietors by default, but that structure quickly becomes inefficient—and risky—once revenue or exposure increases. For U.S.-based sellers on Shopify, Etsy, and TikTok, the optimal path is usually{" "}
                  <span className="text-white font-semibold">sole proprietor → LLC → S-Corp</span>, with timing based on profit, not hype.
                </p>
              </div>

              {/* Key Stat Callout */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 mb-12">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-amber-200 font-semibold mb-2">Key Statistic</p>
                    <p className="text-slate-300 mb-0">
                      The IRS imposes a <span className="text-white font-semibold">15.3% self-employment tax</span> on sole proprietors and default LLCs (12.4% Social Security + 2.9% Medicare) on net earnings, <em>before</em> income tax.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Reference Guide */}
              <div className="grid md:grid-cols-3 gap-4 mb-12">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm mb-1">Under $1k/month</p>
                    <p className="text-white font-semibold">Sole Prop OK</p>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="p-4 text-center">
                    <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-300 text-sm mb-1">$1k-$3k/month</p>
                    <p className="text-white font-semibold">Form an LLC</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/30">
                  <CardContent className="p-4 text-center">
                    <Building2 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-blue-300 text-sm mb-1">$50k-$80k+ profit/year</p>
                    <p className="text-white font-semibold">Elect S-Corp</p>
                  </CardContent>
                </Card>
              </div>

              {/* Section 1: Sole Proprietorship */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                    <Store className="w-6 h-6 text-slate-300" />
                  </div>
                  How Does a Sole Proprietorship Work for Ecommerce Sellers?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  A sole proprietorship is the <span className="text-white font-semibold">default business structure</span> when you sell online without forming an entity. If you open a Shopify store, list products on Etsy, or earn TikTok Shop commissions under your own name, the IRS treats you as a sole prop.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">What this means for sellers:</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-slate-300">
                        <FileText className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                        <span>You report income on <span className="text-white">Schedule C</span> with your personal tax return</span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <DollarSign className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                        <span>You pay income tax <span className="text-white">+ 15.3% self-employment tax</span> on net profit</span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <span>There is <span className="text-red-400 font-semibold">no legal separation</span> between you and the business</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6">
                  <p className="text-slate-300 mb-0">
                    <span className="text-red-400 font-semibold">Platform reality check:</span> Shopify, Etsy, and TikTok Shop do not require an LLC or corporation to sell. However, they also provide <span className="text-white">zero liability protection</span> if something goes wrong—product defects, IP claims, chargebacks, or lawsuits all flow to you personally.
                  </p>
                </div>
              </section>

              {/* Section 2: When to Switch to LLC */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  When Should You Switch From Sole Proprietor to LLC?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Most ecommerce and creator sellers should consider forming an LLC once they consistently earn <span className="text-emerald-400 font-semibold">$1,000–$3,000 per month</span> or the moment they introduce meaningful risk (physical products, customer data, brand deals).
                </p>

                <Card className="bg-emerald-500/10 border-emerald-500/30 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Why LLCs matter for online sellers:</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span><span className="text-white font-semibold">Liability protection:</span> separates personal assets from business liabilities</span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span><span className="text-white font-semibold">Credibility:</span> required by many wholesalers, payment processors, and brand partners</span>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                        <span><span className="text-white font-semibold">Tax flexibility:</span> an LLC can later elect S-Corp taxation</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Decision Tree */}
                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      Decision Tree: Sole Proprietor → LLC
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-400">Under $1k/month, low risk:</span>
                        <span className="text-slate-300">Sole prop is usually fine</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                        <span className="text-emerald-300">$1k–$3k/month or selling products:</span>
                        <span className="text-white font-semibold">LLC recommended</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/20 rounded-lg border border-emerald-500/40">
                        <span className="text-emerald-200">Handling inventory, ads, or brand deals:</span>
                        <span className="text-white font-semibold">LLC strongly recommended</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Platform-specific risks */}
                <h3 className="text-xl font-semibold text-white mb-4">Platform-specific risk examples:</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-4">
                      <p className="text-cyan-400 font-semibold mb-2">Shopify</p>
                      <p className="text-slate-400 text-sm">Chargebacks, data privacy, sales tax exposure</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-4">
                      <p className="text-orange-400 font-semibold mb-2">Etsy</p>
                      <p className="text-slate-400 text-sm">Handmade/product liability and IP claims</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-4">
                      <p className="text-pink-400 font-semibold mb-2">TikTok</p>
                      <p className="text-slate-400 text-sm">Contracts, sponsorships, content ownership disputes</p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Section 3: How LLC is Taxed */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-amber-400" />
                  </div>
                  How Is an LLC Taxed for Online Sellers?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  An LLC is a <span className="text-white font-semibold">legal structure, not a tax structure</span>. By default:
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <p className="text-emerald-400 font-semibold mb-2">Single-member LLC</p>
                      <p className="text-slate-300">Taxed like a sole proprietorship (Schedule C)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardContent className="p-6">
                      <p className="text-blue-400 font-semibold mb-2">Multi-member LLC</p>
                      <p className="text-slate-300">Taxed as a partnership</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 mb-6">
                  <p className="text-slate-300 mb-0">
                    This is why many sellers say, <span className="text-amber-200 italic">"My LLC didn't save me on taxes."</span> They're right—until a tax election is made. Without an S-Corp election, LLC owners still pay the full <span className="text-white font-semibold">15.3% self-employment tax</span> on net profits.
                  </p>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <Sparkles className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-emerald-300 font-semibold mb-2">Expert Perspective</p>
                      <p className="text-slate-300 mb-0 italic">
                        "The LLC's real value initially is risk protection, not tax savings—tax optimization comes later."
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: S-Corp Explanation */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-400" />
                  </div>
                  What Is an S-Corp and Why Do Ecommerce Sellers Use It?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  An S-Corporation is <span className="text-white font-semibold">not a business type—it's a tax election</span> you can make (usually after forming an LLC). The benefit is the ability to split income into:
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-6">
                      <p className="text-blue-300 font-semibold mb-2">Reasonable Salary</p>
                      <p className="text-slate-300">Subject to payroll taxes (15.3%)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-6">
                      <p className="text-emerald-300 font-semibold mb-2">Distributions</p>
                      <p className="text-slate-300">NOT subject to self-employment tax</p>
                    </CardContent>
                  </Card>
                </div>

                <p className="text-slate-300 text-lg mb-6">
                  This structure is especially powerful for:
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    High-margin Shopify stores
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    TikTok creators with sponsorship income
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Etsy sellers with consistent, predictable profits
                  </li>
                </ul>
              </section>

              {/* Section 5: S-Corp Threshold */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                  </div>
                  At What Revenue Does an S-Corp Actually Save You Money?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  The real threshold is <span className="text-emerald-400 font-semibold">profit, not revenue</span>. For most sellers, an S-Corp starts making sense around <span className="text-white font-semibold">$50,000–$80,000/year in net profit</span>.
                </p>

                <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/30 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Example: $80,000 Net Profit</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-slate-400 text-sm mb-2">As an LLC (default)</p>
                        <p className="text-2xl font-bold text-red-400">~$12,240</p>
                        <p className="text-slate-400 text-sm">in self-employment tax</p>
                      </div>
                      <div className="bg-emerald-500/20 rounded-lg p-4 border border-emerald-500/30">
                        <p className="text-emerald-300 text-sm mb-2">As an S-Corp</p>
                        <div className="space-y-1 mb-2">
                          <p className="text-slate-300 text-sm">$45,000 salary → payroll taxes apply</p>
                          <p className="text-slate-300 text-sm">$35,000 distribution → no SE tax</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">~$5,000–$7,000</p>
                        <p className="text-emerald-300 text-sm">estimated annual savings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Decision Tree */}
                <Card className="bg-gray-900/50 border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      Decision Tree: LLC → S-Corp
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                        <X className="w-5 h-5 text-red-400" />
                        <span className="text-slate-300">Under $50k profit: usually not worth it</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        <span className="text-slate-300">$50k–$80k profit: evaluate carefully</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-white font-semibold">$80k+ profit: S-Corp often advantageous</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-red-300 font-semibold mb-2">Common Mistake</p>
                      <p className="text-slate-300 mb-0 italic">
                        "The biggest mistake we see is sellers electing S-Corp status too early—paying more in payroll and compliance than they save in taxes."
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 6: Platform Comparison */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Store className="w-6 h-6 text-purple-400" />
                  </div>
                  Platform Comparison: Does It Change the Best Entity?
                </h2>

                <p className="text-slate-300 text-lg mb-6">
                  Yes. Platform economics and risk profiles matter.
                </p>

                <Card className="bg-gray-900/50 border-gray-700 mb-6 overflow-hidden">
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th className="text-left p-4 text-slate-300 font-semibold">Platform</th>
                          <th className="text-left p-4 text-slate-300 font-semibold">Typical Risk Profile</th>
                          <th className="text-left p-4 text-slate-300 font-semibold">Entity Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-cyan-400 font-semibold">Shopify</td>
                          <td className="p-4 text-slate-300">Inventory, sales tax, chargebacks</td>
                          <td className="p-4 text-slate-300">LLC early; S-Corp at scale</td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-orange-400 font-semibold">Etsy</td>
                          <td className="p-4 text-slate-300">Product/IP liability</td>
                          <td className="p-4 text-slate-300">LLC as soon as sales are consistent</td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-pink-400 font-semibold">TikTok Shop</td>
                          <td className="p-4 text-slate-300">Variable income, contracts</td>
                          <td className="p-4 text-slate-300">LLC early; S-Corp once profits stabilize</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                  <p className="text-slate-300 mb-0">
                    <span className="text-blue-300 font-semibold">Key insight:</span> TikTok creators often benefit from S-Corps sooner <em>only if</em> income is consistent and high-margin.
                  </p>
                </div>
              </section>

              {/* Section 7: Side-by-Side Comparison */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6">
                  LLC vs S-Corp vs Sole Proprietor — Side-by-Side Comparison
                </h2>

                <Card className="bg-gray-900/50 border-gray-700 overflow-hidden">
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th className="text-left p-4 text-slate-300 font-semibold">Feature</th>
                          <th className="text-center p-4 text-slate-300 font-semibold">Sole Proprietor</th>
                          <th className="text-center p-4 text-slate-300 font-semibold">LLC</th>
                          <th className="text-center p-4 text-slate-300 font-semibold">S-Corp</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-slate-300">Liability protection</td>
                          <td className="p-4 text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></td>
                          <td className="p-4 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" /></td>
                          <td className="p-4 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" /></td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-slate-300">Self-employment tax</td>
                          <td className="p-4 text-center text-red-400">Full</td>
                          <td className="p-4 text-center text-amber-400">Full (default)</td>
                          <td className="p-4 text-center text-emerald-400">Reduced</td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-slate-300">Payroll required</td>
                          <td className="p-4 text-center"><X className="w-5 h-5 text-slate-400 mx-auto" /></td>
                          <td className="p-4 text-center"><X className="w-5 h-5 text-slate-400 mx-auto" /></td>
                          <td className="p-4 text-center"><CheckCircle2 className="w-5 h-5 text-blue-400 mx-auto" /></td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="p-4 text-slate-300">Best for</td>
                          <td className="p-4 text-center text-slate-400 text-sm">Very small sellers</td>
                          <td className="p-4 text-center text-slate-400 text-sm">Growing sellers</td>
                          <td className="p-4 text-center text-slate-400 text-sm">Profitable sellers</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </section>

              {/* Section 8: Common Mistakes */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  Common Mistakes Ecommerce Sellers Make
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <p className="text-slate-300">Confusing revenue with profit</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <p className="text-slate-300">Electing S-Corp too early</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <p className="text-slate-300">Waiting too long to form an LLC</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                        <p className="text-slate-300">Relying on one-size-fits-all formation services</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
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

              {/* Sources */}
              <section className="mb-12">
                <h3 className="text-xl font-semibold text-white mb-4">Sources Cited</h3>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li>Internal Revenue Service. (2024). Self-Employment Tax (Schedule SE).</li>
                  <li>Internal Revenue Service. (2024). S Corporations.</li>
                  <li>U.S. Small Business Administration. (2023). Choose a Business Structure.</li>
                  <li>Internal Revenue Service. (2023). Reasonable Compensation Guidelines.</li>
                </ul>
              </section>

              {/* CTA */}
              <Card className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-emerald-500/30">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Ready to Choose the Right Entity for Your Business?
                  </h3>
                  <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                    NexTax.AI helps online sellers make entity decisions based on actual numbers—not noise. Get clarity on whether to stay a sole prop, form an LLC, or elect S-Corp status.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Link href="/pricing">
                      <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8">
                        View Packages
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <Link href="/contact">
                      <Button variant="outline" className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 bg-transparent">
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
