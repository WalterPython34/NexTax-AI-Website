"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Mail, CheckCircle, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function TaxFirstLaunchGuidePage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/send-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send guide")
      }

      setIsUnlocked(true)
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black pt-16">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/resources" className="inline-flex items-center text-emerald-400 hover:text-emerald-300 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Resources
          </Link>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-4">
            <FileText className="w-4 h-4 mr-2" />
            PDF Guide
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            The Tax-First Launch Guide: Choosing Your Optimal Entity
          </h1>
          <p className="text-xl text-slate-300">
            A comprehensive guide to selecting the right business structure with a tax-focused approach
          </p>
        </div>

        {/* Guide Content */}
        <Card className="bg-gray-900/50 border-gray-700 mb-8">
          <CardContent className="p-8">
            <div className={`relative ${!isUnlocked ? "max-h-[600px] overflow-hidden" : ""}`}>
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 leading-relaxed mb-6">
                  Starting a new business is an exciting journey, but one of the most critical early decisions is
                  selecting the right legal entity. Why "tax-first"? Because your choice of entity can dramatically
                  impact your tax obligations, liability protection, and overall financial health. This guide is
                  designed for aspiring entrepreneurs like you, providing a clear, tax-focused overview to help you
                  launch smarter. Remember, while this is a helpful starting point, tax laws evolve (as of 2025, key
                  rules remain stable but always verify with current IRS guidelines), and consulting a tax professional
                  or attorney is essential for personalized advice.
                </p>

                <h2 className="text-2xl font-bold text-white mb-4">Why Entity Choice Matters: A Tax Perspective</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  Your business entity determines how you're taxed, how profits are distributed, and even how you report
                  income. Choosing poorly can lead to higher taxes, unnecessary paperwork, or limited growth
                  opportunities. For instance:
                </p>
                <ul className="list-disc list-inside text-slate-300 mb-6 space-y-2">
                  <li>
                    Pass-through entities (like LLCs or S-Corps) allow profits to "pass through" to your personal tax
                    return, potentially avoiding double taxation.
                  </li>
                  <li>
                    Corporate structures (like C-Corps) offer liability shields but may face corporate taxes plus taxes
                    on dividends.
                  </li>
                  <li>
                    Factors like your industry, expected revenue, number of owners, and long-term goals (e.g., seeking
                    investors) all play a role.
                  </li>
                </ul>
                <p className="text-slate-300 leading-relaxed mb-6">
                  By prioritizing taxes from the start, you can minimize liabilities, maximize deductions, and set up
                  for scalability.
                </p>

                <h2 className="text-2xl font-bold text-white mb-4">Common Business Entities: An Overview</h2>
                <p className="text-slate-300 leading-relaxed mb-6">
                  Here's a breakdown of the most popular options for U.S.-based startups. We'll focus on tax
                  implications, but also touch on setup, liability, and management.
                </p>

                {!isUnlocked && (
                  <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent" />
                )}
              </div>

              {/* Email Capture Overlay */}
              {!isUnlocked && (
                <div className="relative z-10 mt-8">
                  <Card className="bg-gradient-to-br from-emerald-600 to-cyan-600 border-0">
                    <CardContent className="p-8 text-center">
                      <Mail className="w-16 h-16 text-white mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-white mb-2">Get the Full Guide</h3>
                      <p className="text-emerald-100 mb-6">
                        Enter your email to receive the complete PDF guide and unlock the full content on this page.
                      </p>
                      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="flex-1 bg-white text-gray-900"
                            disabled={isSubmitting}
                          />
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-white text-emerald-600 hover:bg-emerald-50"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Mail className="w-4 h-4 mr-2" />
                                Get Full Guide
                              </>
                            )}
                          </Button>
                        </div>
                        {error && <p className="text-red-200 text-sm mt-2">{error}</p>}
                      </form>
                      <p className="text-emerald-100 text-sm mt-4">
                        We'll email you the PDF and unlock the full guide on this page instantly.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Full Content (shown after email submission) */}
              {isUnlocked && (
                <div className="prose prose-invert max-w-none">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                      <h3 className="text-xl font-bold text-white m-0">Guide Sent Successfully!</h3>
                    </div>
                    <p className="text-emerald-300 m-0">
                      Check your email for the complete PDF guide. Continue reading the full content below.
                    </p>
                  </div>

                  {/* Entity Comparison Table */}
                  <div className="overflow-x-auto mb-8">
                    <table className="w-full text-sm text-slate-300 border border-gray-700">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="border border-gray-700 p-3 text-left text-white">Entity Type</th>
                          <th className="border border-gray-700 p-3 text-left text-white">Tax Treatment</th>
                          <th className="border border-gray-700 p-3 text-left text-white">Pros</th>
                          <th className="border border-gray-700 p-3 text-left text-white">Cons</th>
                          <th className="border border-gray-700 p-3 text-left text-white">Best For</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-700 p-3 font-semibold">Sole Proprietorship</td>
                          <td className="border border-gray-700 p-3">
                            Pass-through: Profits taxed as personal income (Schedule C on Form 1040). Self-employment
                            tax (15.3% on net earnings) applies.
                          </td>
                          <td className="border border-gray-700 p-3">
                            Simple setup—no formal filing required. Full control. Easy to deduct business expenses.
                          </td>
                          <td className="border border-gray-700 p-3">
                            Unlimited personal liability. No separation of personal/business assets. Higher
                            self-employment taxes.
                          </td>
                          <td className="border border-gray-700 p-3">
                            Solo entrepreneurs with low-risk businesses (e.g., freelancers, consultants).
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-700 p-3 font-semibold">Partnership</td>
                          <td className="border border-gray-700 p-3">
                            Pass-through: Profits flow to partners' personal returns (Form 1065 for the partnership,
                            Schedule K-1 for individuals). Self-employment tax on general partners.
                          </td>
                          <td className="border border-gray-700 p-3">
                            Flexible profit-sharing. Minimal formalities for general partnerships. Can have limited
                            partners for investment.
                          </td>
                          <td className="border border-gray-700 p-3">
                            General partners have unlimited liability. Potential for disputes among partners. Complex
                            tax filings if multiple partners.
                          </td>
                          <td className="border border-gray-700 p-3">
                            Small teams or family businesses where collaboration is key (e.g., co-founders in a service
                            firm).
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-700 p-3 font-semibold">Limited Liability Company (LLC)</td>
                          <td className="border border-gray-700 p-3">
                            Flexible: Defaults to pass-through (like sole prop or partnership), but can elect corporate
                            taxation. Single-member LLCs file as disregarded entities.
                          </td>
                          <td className="border border-gray-700 p-3">
                            Strong liability protection. Tax flexibility (e.g., elect S-Corp status for payroll tax
                            savings). Easy to form (file Articles of Organization).
                          </td>
                          <td className="border border-gray-700 p-3">
                            Some states impose franchise taxes. Self-employment taxes unless electing S-Corp. More
                            paperwork than sole prop.
                          </td>
                          <td className="border border-gray-700 p-3">
                            Most startups—versatile for solo or multi-owner ventures (e.g., e-commerce stores, tech
                            startups).
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-700 p-3 font-semibold">S-Corporation</td>
                          <td className="border border-gray-700 p-3">
                            Pass-through: Profits to shareholders' personal returns (Form 1120S). Avoid self-employment
                            tax on distributions (but reasonable salary required for owners).
                          </td>
                          <td className="border border-gray-700 p-3">
                            Liability protection like a corp. Potential payroll tax savings (tax only on salary, not
                            distributions).
                          </td>
                          <td className="border border-gray-700 p-3">
                            Strict eligibility: U.S. citizens/residents only, max 100 shareholders, one class of stock.
                            Must file IRS election (Form 2553). More compliance (e.g., annual meetings).
                          </td>
                          <td className="border border-gray-700 p-3">
                            Growing businesses with owners who can take salaries (e.g., profitable service-based
                            companies aiming to reduce self-employment taxes).
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-700 p-3 font-semibold">C-Corporation</td>
                          <td className="border border-gray-700 p-3">
                            Corporate taxation: Entity pays taxes on profits (21% federal rate as of 2025), then
                            shareholders pay on dividends (double taxation). Can deduct more expenses.
                          </td>
                          <td className="border border-gray-700 p-3">
                            Unlimited shareholders, easy to raise capital (e.g., via stock). Strong liability
                            protection. Tax perks like retained earnings.
                          </td>
                          <td className="border border-gray-700 p-3">
                            Double taxation can erode profits. Complex setup and ongoing filings (Form 1120). Higher
                            administrative costs.
                          </td>
                          <td className="border border-gray-700 p-3">
                            Businesses planning IPOs or venture funding (e.g., tech firms, scalable product companies).
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-slate-400 text-sm mb-8">
                    Note: Tax rates and rules are based on federal guidelines; state taxes vary. For example, some
                    states don't recognize S-Corps or impose additional fees on LLCs.
                  </p>

                  <h2 className="text-2xl font-bold text-white mb-4">Key Factors to Consider When Choosing</h2>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    To pick your optimal entity, evaluate these tax-centric elements:
                  </p>
                  <ul className="list-disc list-inside text-slate-300 mb-6 space-y-2">
                    <li>
                      <strong>Your Income Projections:</strong> Low earners might prefer pass-through to use personal
                      deductions; high earners could benefit from C-Corp's lower corporate rate.
                    </li>
                    <li>
                      <strong>Number of Owners:</strong> Sole props for one person; partnerships/LLCs for multiples;
                      Corps for investor-friendly structures.
                    </li>
                    <li>
                      <strong>Liability Risks:</strong> High-risk industries (e.g., manufacturing) need LLC or Corp
                      protection to shield personal assets.
                    </li>
                    <li>
                      <strong>Growth Plans:</strong> If seeking VC funding, C-Corp is often required. For quick
                      launches, start as an LLC and convert later.
                    </li>
                    <li>
                      <strong>Tax Deductions and Credits:</strong> Entities like Corps can retain earnings for
                      reinvestment; pass-throughs allow direct offsets against personal income.
                    </li>
                    <li>
                      <strong>Administrative Burden:</strong> Sole props are easiest; Corps require bylaws, boards, and
                      annual reports.
                    </li>
                    <li>
                      <strong>State-Specific Rules:</strong> Check your state's Secretary of State website for filing
                      fees (e.g., $100–$500 for LLCs) and taxes.
                    </li>
                  </ul>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-8">
                    <p className="text-blue-300 m-0">
                      <strong>Pro Tip:</strong> Use IRS tools like the Entity Classification Election (Form 8832) to
                      switch tax treatments without changing your legal structure.
                    </p>
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-4">Common Pitfalls to Avoid</h2>
                  <ul className="list-disc list-inside text-slate-300 mb-6 space-y-2">
                    <li>
                      <strong>Ignoring Self-Employment Taxes:</strong> In pass-through entities, you pay Social
                      Security/Medicare on net earnings—plan for it!
                    </li>
                    <li>
                      <strong>Double Taxation Trap:</strong> C-Corps shine for reinvesting profits but hurt if you
                      distribute everything as dividends.
                    </li>
                    <li>
                      <strong>Failing to Elect Properly:</strong> Miss deadlines for S-Corp status (generally 75 days
                      after formation), and you're stuck as a C-Corp.
                    </li>
                    <li>
                      <strong>Overlooking State Taxes:</strong> Entities like LLCs might face "franchise" or "privilege"
                      taxes in states like California or Texas.
                    </li>
                  </ul>

                  <h2 className="text-2xl font-bold text-white mb-4">Next Steps: Launch with Confidence</h2>
                  <p className="text-slate-300 leading-relaxed mb-6">
                    Choosing the right entity is a foundational step that can save you thousands in taxes and headaches
                    down the road. Start by assessing your business plan, then file with your state (often online via
                    the Secretary of State's portal). For complex scenarios, partner with a CPA or business attorney—
                    they can run projections based on your specifics.
                  </p>

                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-8">
                    <p className="text-emerald-300 mb-4">
                      <strong>Ready to dive deeper?</strong> Contact us for a free consultation on tax-optimized
                      business setups. Let's turn your entrepreneurial dream into a tax-smart reality!
                    </p>
                    <Link href="/contact">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        Schedule Free Consultation
                      </Button>
                    </Link>
                  </div>

                  <p className="text-slate-400 text-sm italic">
                    Disclaimer: This guide is for informational purposes only and not a substitute for professional tax
                    or legal advice. Tax laws can change; consult experts for your situation.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-emerald-600 to-cyan-600 border-0">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Launch Your Business?</h3>
            <p className="text-emerald-100 mb-6">
              Get personalized guidance and launch your business in 48 hours with StartSmart GPT.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/startsmart">
                <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50">
                  Start Your Business
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 bg-transparent"
                >
                  Get Expert Help
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
