"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  ChevronDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  FileText,
  Scale,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function AssetVsStockSalesTaxPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      question: "Why do buyers prefer asset deals?",
      answer:
        "Asset deals provide a step-up in basis, meaning you can depreciate assets from their new purchase price rather than the seller's old book value. This creates significant tax shields — potentially $40-80K+ in savings over 5-7 years on a typical SMB deal.",
    },
    {
      question: "Why do sellers push for stock deals?",
      answer:
        "In a stock deal, sellers pay long-term capital gains (15-20%) on the entire sale. In an asset deal, they pay ordinary income rates (up to 37%) on depreciation recapture. The difference can be $30-60K+ in additional taxes for the seller.",
    },
    {
      question: "What is a 338(h)(10) election?",
      answer:
        "A 338(h)(10) election lets both parties treat a stock sale as an asset sale for tax purposes while keeping the legal structure of a stock deal. It's only available for S-corps and requires both parties to agree. The seller typically needs a price bump to offset their higher tax hit.",
    },
    {
      question: "What is purchase price allocation and why does it matter?",
      answer:
        "Even in an asset deal, how you allocate the purchase price across asset classes (equipment, goodwill, non-compete, etc.) affects both parties' taxes. Buyers want more allocated to fast-depreciating assets; sellers want more in goodwill. Both must file consistent allocations on Form 8594.",
    },
    {
      question: "How much can deal structure really cost me?",
      answer:
        "A deal that looks like $500K can cost you an extra $40-80K over 5 years depending on structure. The difference comes from lost depreciation deductions in a stock deal vs. the step-up basis you get in an asset deal.",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      {/* Hero */}
      <section className="relative pt-24 pb-12">
        <div className="container mx-auto px-4">
          <Link
            href="/resources"
            className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Resources
          </Link>

          <div className="max-w-4xl">
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mb-4">Acquisitions</Badge>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Asset vs Stock Sales: What You&apos;ll Pay in Tax (And What Sellers Don&apos;t Want You to Know)
            </h1>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Deal structure determines your tax bill for years. Learn why buyers want asset deals, why sellers push
              for stock, and how to negotiate the allocation that saves you $40-80K.
            </p>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Steve Morello, CPA</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>January 30, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>12 min read</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Image */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="relative aspect-video rounded-2xl overflow-hidden">
              <Image
                src="/asset-vs-stock-sale.jpg"
                alt="Asset vs Stock Sale Tax Implications"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Author Credentials */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <p className="text-slate-300 text-sm leading-relaxed">
                <span className="font-semibold text-white">About the Author:</span> I come from a Big 4 (EY) and
                Private Equity (Morgan Stanley) background and have helped clients buy and sell small businesses for
                years. One of the most consistently misunderstood things I see first-time buyers get steamrolled on is
                deal structure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Overview */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-white mb-8">The Two Deal Structures at a Glance</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Asset Deal */}
              <Card className="bg-emerald-500/10 border-emerald-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-emerald-400">Asset Deal</h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">What buyers almost always want</p>
                  <ul className="space-y-3">
                    {[
                      "Step-up in basis on all assets",
                      "New depreciation schedule from purchase price",
                      "Tax shields start year one",
                      "Control over purchase price allocation",
                      "Potential $40-80K+ in tax savings over 5 years",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Stock Deal */}
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-red-400">Stock Deal</h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">What sellers typically push for</p>
                  <ul className="space-y-3">
                    {[
                      "Inherit seller's old depreciation schedule",
                      "No step-up in basis",
                      "Equipment worth $0 on books stays at $0",
                      "Pay $500K but get almost no deductible basis",
                      "Seller pays only 15-20% capital gains",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* The Math Section */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-white mb-4">The Math: Why Asset Deals Save You Money</h2>
            <p className="text-slate-300 mb-8">
              When you buy assets, you get what&apos;s called a <span className="text-cyan-400 font-semibold">step-up in basis</span>. 
              The purchase price gets allocated across assets (equipment, inventory, goodwill, non-compete agreements) 
              and you depreciate those from the new (higher) value going forward.
            </p>

            {/* Example Box */}
            <div className="bg-slate-800/80 border border-cyan-500/30 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Example: $500K Landscaping Company</h3>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm text-slate-400 mb-2">Seller&apos;s Books</h4>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-500">$0</div>
                    <div className="text-sm text-slate-500">Equipment fully depreciated</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm text-slate-400 mb-2">Your Asset Deal Allocation</h4>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-emerald-400">$150,000</div>
                    <div className="text-sm text-slate-400">New depreciable equipment basis</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-white">$30,000</div>
                    <div className="text-xs text-slate-400">Annual depreciation (5-year)</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">37%</div>
                    <div className="text-xs text-slate-400">Marginal tax rate</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-emerald-400">~$55,000</div>
                    <div className="text-xs text-slate-400">Total tax savings</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-red-400 mb-2">In a Stock Deal, You Get None of This</h4>
                  <p className="text-slate-300 text-sm">
                    You inherit the seller&apos;s old depreciation schedule. The equipment is still worth $0 on the books, 
                    and you get $0 depreciation expense to offset business income. You paid $500K for the business 
                    and get almost no deductible basis from it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Sellers Push for Stock */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-white mb-4">Why Sellers Push for Stock Deals</h2>
            <p className="text-slate-300 mb-8">
              Because their tax bill is <span className="text-red-400 font-semibold">dramatically lower</span>.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-4">Stock Deal (Seller&apos;s Preference)</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tax treatment</span>
                    <span className="text-emerald-400">Long-term capital gains</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Federal rate</span>
                    <span className="text-emerald-400">15-20%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Complexity</span>
                    <span className="text-slate-300">Clean, one tax event</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-4">Asset Deal (Seller&apos;s Nightmare)</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tax treatment</span>
                    <span className="text-red-400">Split by asset class</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Depreciation recapture</span>
                    <span className="text-red-400">Up to 37%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Extra tax hit</span>
                    <span className="text-red-400">$30-60K+</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
              <p className="text-slate-300">
                <span className="font-semibold text-amber-400">Translation:</span> When a seller says &quot;I need it to be 
                a stock deal,&quot; what they&apos;re really saying is: &quot;I don&apos;t want to pay an extra $30-60K in taxes.&quot; 
                That&apos;s their problem, not yours — but it becomes your problem if you concede it without negotiating 
                a price adjustment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The 338(h)(10) Bridge */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-white mb-4">The Bridge: 338(h)(10) Elections</h2>
            
            <p className="text-slate-300 mb-6">
              If you&apos;re buying an <span className="text-cyan-400 font-semibold">S-corp</span> (very common in SMB), 
              there&apos;s a tax election called a 338(h)(10) that lets both parties treat the deal as an asset sale 
              for tax purposes while keeping the legal structure of a stock sale.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
                <h3 className="font-semibold text-emerald-400 mb-3">When It Works</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    S-corporations
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    Both parties agree to the election
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    Seller accepts price bump for tax hit
                  </li>
                </ul>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                <h3 className="font-semibold text-red-400 mb-3">When It Doesn&apos;t Work</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    C-corporations (doesn&apos;t work cleanly)
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    LLCs taxed as partnerships
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    Seller refuses to agree
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-slate-400 text-sm">
              If you&apos;re looking at an S-corp and the seller won&apos;t budge on stock deal, this is worth bringing to the table.
            </p>
          </div>
        </div>
      </section>

      {/* The Allocation Fight */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-white mb-4">The Allocation Fight Nobody Warns You About</h2>
            
            <p className="text-slate-300 mb-8">
              Even when both sides agree to an asset deal, the <span className="text-cyan-400 font-semibold">allocation 
              of purchase price</span> is its own negotiation. The IRS requires both parties to file consistent 
              allocations (Form 8594), and how you split the number across asset classes affects both of your tax outcomes.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Buyer Wants */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  As a Buyer, Maximize Allocation To:
                </h3>
                <ul className="space-y-3">
                  {[
                    { item: "Equipment / FF&E", note: "Fast depreciation, bonus depreciation available" },
                    { item: "Non-compete agreements", note: "Amortized over 15 years, but deductible" },
                    { item: "Working capital assets", note: "Step-up carries through" },
                  ].map((entry, i) => (
                    <li key={i} className="border-l-2 border-emerald-500 pl-3">
                      <div className="font-medium text-white text-sm">{entry.item}</div>
                      <div className="text-xs text-slate-400">{entry.note}</div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-400">
                    <span className="text-amber-400">Note:</span> Minimize allocation to goodwill — not because it&apos;s bad, 
                    but because equipment depreciates faster and creates more near-term cash tax savings.
                  </p>
                </div>
              </div>

              {/* Seller Wants */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  The Seller Wants the Opposite:
                </h3>
                <ul className="space-y-3">
                  {[
                    { item: "Maximize goodwill", note: "Capital gains treatment (15-20%)" },
                    { item: "Minimize equipment", note: "Avoids depreciation recapture (37%)" },
                    { item: "Low non-compete allocation", note: "Ordinary income treatment" },
                  ].map((entry, i) => (
                    <li key={i} className="border-l-2 border-red-500 pl-3">
                      <div className="font-medium text-white text-sm">{entry.item}</div>
                      <div className="text-xs text-slate-400">{entry.note}</div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-400">
                    <span className="text-red-400">Warning:</span> This is a real negotiation and most buyers 
                    don&apos;t even know it&apos;s happening.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Takeaway */}
      <section className="py-16 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-white mb-6">Key Takeaway</h2>
            
            <div className="bg-slate-800/80 border border-cyan-500/30 rounded-xl p-8">
              <p className="text-lg text-slate-200 mb-6">
                Before you get anywhere near LOI, know what entity type you&apos;re buying and get your CPA in the room. 
                Not just for due diligence, but to <span className="text-cyan-400 font-semibold">model the after-tax 
                purchase price under both structures</span>.
              </p>
              
              <div className="bg-slate-900/50 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <DollarSign className="w-12 h-12 text-amber-400" />
                  <div>
                    <div className="text-3xl font-bold text-white">$40K – $80K</div>
                    <div className="text-slate-400">
                      Extra cost over 5 years depending on how you structure a $500K deal
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h2>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="font-medium text-slate-200 pr-4">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-4">
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
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                Need Help Modeling Your Deal Structure?
              </h2>
              <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
                Our deal analysis includes asset vs. stock comparison modeling, purchase price allocation guidance, 
                and after-tax cost projections under both structures.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/acquisitions">
                  <Button className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white px-8 py-6 text-lg">
                    Explore Deal Analysis Services
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <a href="https://valuationhub.emergent.host/" target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-6 text-lg bg-transparent"
                  >
                    Try AcquiFlow Free
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Articles */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h2 className="text-xl font-bold text-white mb-6">Related Articles</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/resources/guides/pre-loi-diligence-smb-acquisitions"
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 transition-colors group"
              >
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mb-2">Acquisitions</Badge>
                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  Pre-LOI Diligence for SMB Acquisitions
                </h3>
                <p className="text-sm text-slate-400 mt-1">How smart buyers avoid bad deals before they sign</p>
              </Link>
              <Link
                href="/resources/guides/why-smb-deals-fall-apart"
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 transition-colors group"
              >
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mb-2">Acquisitions</Badge>
                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  Why SMB Deals Fall Apart Before Closing
                </h3>
                <p className="text-sm text-slate-400 mt-1">And how smart buyers keep them alive</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
