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
  PiggyBank,
  Building2,
  Rocket,
  Gift,
  TrendingUp,
  Calculator,
  Lightbulb,
} from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "How to Fund Your Startup: A Founder's Guide to Capital & Cash Flow | NexTax.AI",
  description:
    "Demystify startup capital, explore common funding options, and learn strategies for cash flow and financial runway to prepare your business for success.",
}

export default function FundYourStartupPage() {
  return (
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
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-4">Growth</Badge>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              How to Fund Your Startup: A Founder's Guide to Capital & Cash Flow
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Steve Morello, CPA</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>15 min read</span>
              </div>
              <div>January 22, 2026</div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="mb-12 rounded-xl overflow-hidden">
            <img
              src="/startup-funding-capital-cash-flow.jpg"
              alt="Startup Funding and Capital Guide"
              className="w-full h-[400px] object-cover"
            />
          </div>

          {/* Article Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            {/* Introduction */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-12">
              <p className="text-slate-200 text-lg leading-relaxed mb-0">
                So you have a brilliant business idea. The first question that inevitably pops up is:{" "}
                <span className="text-emerald-400 font-semibold">"How do I pay for it?"</span> At NexTax.AI, we've
                guided countless entrepreneurs from napkin idea to profitable launch, and the journey always begins with
                a clear understanding of startup funding.
              </p>
            </div>

            <p className="text-slate-300 text-lg leading-relaxed mb-8">
              This guide will demystify startup capital, explore common funding options, and arm you with strategies for
              cash flow and financial runway, so you're prepared for whatever comes your way.
            </p>

            {/* Section 1: How Much Money Do I Need */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-blue-400" />
                </div>
                1. The Magic Question: How Much Money Do I Really Need to Start?
              </h2>

              <Card className="bg-gray-900/50 border-gray-700 mb-6">
                <CardContent className="p-6">
                  <p className="text-slate-300 text-lg mb-6">
                    Before seeking funding, calculate your <strong className="text-white">startup costs</strong> and
                    your <strong className="text-white">financial runway</strong>.
                  </p>
                  <p className="text-slate-300 text-lg mb-6">
                  A. Your<strong className="text-white"> "One-Time" Startup Costs</strong>
                  These are the "entry fees" to the game. You pay them once to get on the field.
                   </p>  

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Startup Costs */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5">
                      <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Startup Costs (One-Time)
                      </h4>
                      <ul className="space-y-2 text-slate-300">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                          <span>
                            <strong>Legal & Formation Fees:</strong> LLC filing, EIN, operating agreement
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                          <span>
                            <strong>Equipment & Software:</strong> Computers, tools, SaaS subscriptions
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                          <span>
                            <strong>Initial Inventory/Supplies:</strong> First product or service needs
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                          <span>
                            <strong>Website & Marketing:</strong> Domain, hosting, initial ad spend
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* Financial Runway */}
                    <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-5">
                      <h4 className="text-violet-400 font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Financial Runway (Months to Survive)
                      </h4>
                      <ul className="space-y-2 text-slate-300">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-violet-400 mt-1 flex-shrink-0" />
                          <span>
                            <strong>Operating Expenses:</strong> Rent, utilities, salaries, marketing, loan repayments
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-violet-400 mt-1 flex-shrink-0" />
                          <span>
                            <strong>Personal Living Expenses:</strong> Can you cover your own bills while the business
                            gets off the ground?
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="text-amber-400 font-semibold mb-2">The CPA Insight</h4>
                    <p className="text-slate-300">
                      Always estimate your initial costs, then <strong className="text-white">add 25-50%</strong> for
                      unexpected expenses. It's better to have more than less.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Funding Options */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                2. Decoding Your Funding Options: From Bootstrapping to Big Checks
              </h2>

              <p className="text-slate-300 text-lg mb-8">
                Every startup's funding journey is unique. Here are the most common paths:
              </p>

              {/* Option A: Bootstrapping */}
              <Card className="bg-gray-900/50 border-gray-700 mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <PiggyBank className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">A. Bootstrapping (Self-Funding)</h3>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Lean & Mean</Badge>
                  </div>

                  <p className="text-slate-300 mb-4">
                    Using your personal savings, credit cards, or side income to fund your business.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                      <h4 className="text-emerald-400 font-semibold mb-2">Pros</h4>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        <li>• Full ownership, no debt</li>
                        <li>• Complete control</li>
                        <li>• Ideal for service-based businesses</li>
                      </ul>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <h4 className="text-red-400 font-semibold mb-2">Cons</h4>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        <li>• Personal financial risk</li>
                        <li>• Slower growth</li>
                        <li>• Limited capital</li>
                      </ul>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm">
                    <strong className="text-slate-300">When to Use:</strong> If your initial costs are manageable (e.g.,
                    $500 - $5,000) and you can maintain personal expenses.
                  </p>
                </CardContent>
              </Card>

              {/* Option B: Friends & Family */}
              <Card className="bg-gray-900/50 border-gray-700 mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">B. Friends & Family Loans</h3>
                  </div>

                  <p className="text-slate-300 mb-4">Borrowing from your personal network.</p>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                      <h4 className="text-emerald-400 font-semibold mb-2">Pros</h4>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        <li>• Easier to secure than traditional loans</li>
                        <li>• Often better terms (lower interest, flexible repayment)</li>
                      </ul>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <h4 className="text-red-400 font-semibold mb-2">Cons</h4>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        <li>• Can strain relationships if not handled professionally</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <p className="text-slate-300 text-sm">
                      <strong className="text-amber-400">CPA Tip:</strong> Always draft a formal loan agreement, even
                      with family. It protects everyone.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Option C: Small Business Loans */}
              <Card className="bg-gray-900/50 border-gray-700 mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">C. Small Business Loans & Lines of Credit</h3>
                  </div>

                  <p className="text-slate-300 mb-4">
                    Debt financing from banks, credit unions, or online lenders. Options include SBA loans, microloans,
                    and business lines of credit.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                      <h4 className="text-emerald-400 font-semibold mb-2">Pros</h4>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        <li>• Significant capital infusion</li>
                        <li>• Structured repayment</li>
                        <li>• Doesn't dilute ownership</li>
                      </ul>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <h4 className="text-red-400 font-semibold mb-2">Cons</h4>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        <li>• Requires solid business plan & good credit</li>
                        <li>• Often requires collateral</li>
                        <li>• Interest rates apply</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <p className="text-slate-300 text-sm">
                      <strong className="text-emerald-400">NexTax.AI Advantage:</strong> A professionally formed LLC
                      with an EIN (included in our Accelerator and All-In packages) is crucial for loan applications.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Option D: Angel Investors & VC */}
              <Card className="bg-gray-900/50 border-gray-700 mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-violet-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">D. Angel Investors & Venture Capital (VC)</h3>
                    <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">Growth Accelerators</Badge>
                  </div>

                  <p className="text-slate-300 mb-4">
                    Equity financing where investors provide capital in exchange for a percentage of ownership (stock)
                    in your company. Angel investors are typically individuals, while VCs are firms.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                      <h4 className="text-emerald-400 font-semibold mb-2">Pros</h4>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        <li>• Large capital sums</li>
                        <li>• Valuable mentorship</li>
                        <li>• Open doors to networks</li>
                      </ul>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <h4 className="text-red-400 font-semibold mb-2">Cons</h4>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        <li>• Significant loss of ownership and control</li>
                        <li>• Intense scrutiny</li>
                        <li>• High pressure for rapid growth</li>
                      </ul>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm">
                    <strong className="text-slate-300">When to Use:</strong> For high-growth, scalable businesses with a
                    clear exit strategy (acquisition or IPO).
                  </p>
                </CardContent>
              </Card>

              {/* Option E: Grants */}
              <Card className="bg-gray-900/50 border-gray-700 mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">E. Grants & Competitions</h3>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Free Money!</Badge>
                  </div>

                  <p className="text-slate-300 mb-4">
                    Non-repayable funds from government agencies, non-profits, or corporations.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                      <h4 className="text-emerald-400 font-semibold mb-2">Pros</h4>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        <li>• No repayment required</li>
                        <li>• No equity given up</li>
                      </ul>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <h4 className="text-red-400 font-semibold mb-2">Cons</h4>
                      <ul className="space-y-1 text-slate-300 text-sm">
                        <li>• Highly competitive</li>
                        <li>• Specific eligibility requirements</li>
                        <li>• Lengthy application process</li>
                      </ul>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm">
                    <strong className="text-slate-300">Where to Look:</strong> Grants.gov, local economic development
                    agencies, industry-specific organizations.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Section 3: Cash Flow Management */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                </div>
                3. Mastering Your Cash Flow & Extending Your Runway
              </h2>

              <p className="text-slate-300 text-lg mb-6">
                Securing funding is only half the battle.{" "}
                <strong className="text-white">Effective cash flow management</strong> is what keeps your business
                alive.
              </p>

              <Card className="bg-gray-900/50 border-gray-700 mb-6">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Cash Flow Planning</h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                        <div>
                          <strong className="text-white">Forecast:</strong>
                          <p className="text-slate-300 text-sm">
                            Create a 12-month cash flow projection (ins and outs).
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                        <div>
                          <strong className="text-white">Buffer:</strong>
                          <p className="text-slate-300 text-sm">
                            Always aim for at least 3-6 months of operating expenses in reserve.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                        <div>
                          <strong className="text-white">Invoicing:</strong>
                          <p className="text-slate-300 text-sm">
                            Send invoices promptly and follow up on overdue payments.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                        <div>
                          <strong className="text-white">Expense Tracking:</strong>
                          <p className="text-slate-300 text-sm">Use accounting software to track every dollar.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700 mb-6">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    What Happens if Revenue is Lower Than Expected?
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-400 font-bold text-sm">1</span>
                      </div>
                      <div>
                        <strong className="text-white">Pivot or Persevere:</strong>
                        <p className="text-slate-300 text-sm">
                          Analyze market feedback. Is your product wrong, or is your marketing strategy off?
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-400 font-bold text-sm">2</span>
                      </div>
                      <div>
                        <strong className="text-white">Cut Non-Essentials:</strong>
                        <p className="text-slate-300 text-sm">Aggressively reduce discretionary spending.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-400 font-bold text-sm">3</span>
                      </div>
                      <div>
                        <strong className="text-white">Negotiate Terms:</strong>
                        <p className="text-slate-300 text-sm">
                          Talk to suppliers, landlords, and lenders about revised payment plans.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-400 font-bold text-sm">4</span>
                      </div>
                      <div>
                        <strong className="text-white">Seek Bridge Funding:</strong>
                        <p className="text-slate-300 text-sm">
                          A small short-term loan can buy you time to hit your next milestone.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* CTA Section */}
            <section className="mt-16">
              <Card className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-emerald-500/30">
                <CardContent className="p-8 text-center">
                  <h2 className="text-3xl font-bold text-white mb-4">Ready to Build a Financially Sound Business?</h2>
                  <p className="text-slate-300 text-lg mb-6 max-w-2xl mx-auto">
                    Funding your dream shouldn't be a nightmare. By understanding your options and planning
                    strategically, you can secure the capital you need to thrive. NexTax.AI is here to ensure your
                    business foundation is legally sound and tax-optimized from your very first dollar.
                  </p>
                  <Link href="/pricing">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                    >
                      Launch Your LLC in 48 Hours with NexTax.AI
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </article>
    </div>
  )
}
