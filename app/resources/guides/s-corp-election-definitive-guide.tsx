import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, TrendingUp, Calculator, FileText, Users, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Should I Elect S-Corp for My LLC? The Definitive Guide | NexTax.AI",
  description:
    "Discover how the S-Corp election can potentially save you thousands in self-employment tax. Complete guide with real-world examples and compliance requirements.",
}

export default function ScorpElectionGuidePage() {
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
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-4">Tax Strategy</Badge>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Should I Elect S-Corp for My LLC? The Definitive Guide to Saving on Self-Employment Tax
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
              <div>January 18, 2026</div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="mb-12 rounded-xl overflow-hidden">
            <img
              src="/s-corp-election-tax-savings.jpg"
              alt="S-Corp Election Tax Savings"
              className="w-full h-[400px] object-cover"
            />
          </div>

          {/* Article Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            {/* Introduction */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-12">
              <p className="text-slate-200 text-lg leading-relaxed mb-0">
                The S-Corp election is one of the most powerful tax-saving strategies available to small business
                owners. Fortunately, the IRS has approved strategies to potentially save thousands on self-employment
                tax by legally splitting your company's income into two parts.
              </p>
            </div>

            {/* Section 1: The Core Benefit */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                The Core Benefit of S-Corp Tax Election
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-6">
                The core benefit of the S-Corp tax election is the ability to legally split your company's income into
                two parts:
              </p>
              <Card className="bg-gray-900/50 border-gray-700 mb-6">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Reasonable Salary (W-2 Income)</h3>
                        <p className="text-slate-400">
                          This portion is paid to you as an employee and is subject to all standard payroll taxes
                          (Social Security and Medicare).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Shareholder Distributions (Profit)</h3>
                        <p className="text-slate-400">
                          This remaining portion is paid to you as a shareholder distribution and is subject to income
                          tax only—not self-employment tax.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 2: How It Works */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-blue-400" />
                </div>
                How the S-Corp Tax Split Works
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-6">
                Let's break down exactly how this tax-saving strategy works with a real-world example:
              </p>

              {/* Example Comparison */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* LLC Taxed as Sole Proprietorship */}
                <Card className="bg-red-500/10 border-red-500/30">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-white mb-4">LLC (Sole Proprietorship)</h3>
                    <div className="space-y-3 text-slate-300">
                      <div className="flex justify-between">
                        <span>Net Business Income:</span>
                        <span className="font-semibold">$100,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Self-Employment Tax (15.3%):</span>
                        <span className="font-semibold text-red-400">-$15,300</span>
                      </div>
                      <div className="border-t border-gray-700 pt-3 flex justify-between font-bold text-white">
                        <span>After SE Tax:</span>
                        <span>$84,700</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* S-Corp */}
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-white mb-4">S-Corp Election</h3>
                    <div className="space-y-3 text-slate-300">
                      <div className="flex justify-between">
                        <span>Reasonable Salary (W-2):</span>
                        <span className="font-semibold">$60,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payroll Tax on Salary:</span>
                        <span className="font-semibold text-orange-400">-$9,180</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Distribution (Tax-Free):</span>
                        <span className="font-semibold text-emerald-400">$40,000</span>
                      </div>
                      <div className="border-t border-gray-700 pt-3 flex justify-between font-bold text-white">
                        <span>After Payroll Tax:</span>
                        <span>$90,820</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Savings Highlight */}
              <Card className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-emerald-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Annual Tax Savings</h3>
                      <p className="text-slate-300">By electing S-Corp status for this example</p>
                    </div>
                    <div className="text-4xl font-bold text-emerald-400">$6,120</div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 3: When to Elect */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-violet-400" />
                </div>
                When to Elect S-Corp Status
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-6">
                The general rule of thumb is that the S-Corp election becomes beneficial when your net business income
                exceeds approximately <span className="text-emerald-400 font-semibold">$60,000-$80,000</span> per year.
                However, the exact threshold depends on several factors:
              </p>

              <div className="space-y-4 mb-8">
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Your Industry</h3>
                        <p className="text-slate-400">What is a typical salary for someone in your role or industry?</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Your Location</h3>
                        <p className="text-slate-400">
                          State and local tax considerations can impact the overall benefit.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Business Involvement</h3>
                        <p className="text-slate-400">How many hours do you dedicate to the business each week?</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-white font-semibold text-lg mb-2">Additional Employees</h3>
                        <p className="text-slate-400">
                          Do you have other W-2 employees? This can simplify the payroll process.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Section 4: The Reasonable Salary Rule */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-400" />
                </div>
                The Reasonable Salary Rule
              </h2>

              <Card className="bg-orange-500/10 border-orange-500/30 mb-6">
                <CardContent className="p-6">
                  <p className="text-slate-200 text-lg leading-relaxed mb-0">
                    The IRS requires that S-Corp owners pay themselves a "reasonable salary" for the work they perform.
                    There's no exact number, but it's based on what you would pay someone else to do your job.
                  </p>
                </CardContent>
              </Card>

              <p className="text-slate-300 text-lg leading-relaxed mb-6">
                The actual value of the S-Corp election depends on the{" "}
                <span className="text-emerald-400 font-semibold">reasonable salary</span> you must pay yourself. You
                must earn and pay taxes on a salary that reflects the fair market value of the services you provide.
              </p>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Determining Your Reasonable Salary</h3>
                <p className="text-slate-300 mb-4">Expert tax consultants can help determine your optimal salary by:</p>
                <ul className="space-y-2 text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                    <span>Analyzing industry salary data for your role and location</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                    <span>Reviewing your business revenue and profitability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                    <span>Considering your time commitment and responsibilities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                    <span>Ensuring IRS compliance to avoid audits and penalties</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 5: Compliance Requirements */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-cyan-400" />
                </div>
                S-Corp Compliance Requirements
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-6">
                While the tax savings can be substantial, S-Corp status does come with additional compliance
                requirements:
              </p>

              <div className="space-y-4 mb-8">
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-white font-semibold text-lg mb-2">Payroll Processing</h3>
                    <p className="text-slate-400">
                      You must run regular payroll for yourself, including withholding and remitting payroll taxes.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-white font-semibold text-lg mb-2">Quarterly Payroll Tax Filings</h3>
                    <p className="text-slate-400">
                      File Form 941 quarterly to report wages, tips, and other compensation paid to employees.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-white font-semibold text-lg mb-2">Annual W-2 and W-3 Forms</h3>
                    <p className="text-slate-400">
                      Issue W-2s to yourself and any employees, and file W-3 with the Social Security Administration.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-white font-semibold text-lg mb-2">S-Corp Tax Return (Form 1120-S)</h3>
                    <p className="text-slate-400">
                      File an annual S-Corp tax return, separate from your personal return.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-white font-semibold text-lg mb-2">Shareholder Basis Tracking</h3>
                    <p className="text-slate-400">
                      Maintain accurate records of your basis in the S-Corp for tax purposes.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-6">
                  <p className="text-slate-200 text-lg leading-relaxed mb-0">
                    <span className="font-semibold text-white">Good news:</span> The S-Corp may not require as much
                    paperwork as you think if you can share employee payroll services, but this process is complex and
                    best handled by a tax professional.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Section 6: Making the Decision */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6">Making the Right Decision</h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-6">
                The S-Corp election can be a powerful tax-saving tool, but it's not right for everyone. Consider these
                key factors:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      Good Fit For:
                    </h3>
                    <ul className="space-y-2 text-slate-300">
                      <li>• Net income over $60,000-$80,000</li>
                      <li>• Stable, predictable income</li>
                      <li>• Willingness to handle payroll</li>
                      <li>• Long-term business commitment</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-orange-500/10 border-orange-500/30">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-orange-400" />
                      May Not Be Ideal For:
                    </h3>
                    <ul className="space-y-2 text-slate-300">
                      <li>• New businesses with low income</li>
                      <li>• Highly variable income</li>
                      <li>• Side businesses or hobbies</li>
                      <li>• Those wanting minimal paperwork</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* CTA Section */}
            <section className="mb-12">
              <Card className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-emerald-500/30">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">Ready to Explore S-Corp Election?</h3>
                  <p className="text-slate-200 mb-6 max-w-2xl mx-auto">
                    Get personalized guidance from our AI tax advisor or schedule a consultation with a CPA to determine
                    if S-Corp status is right for your business.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/startsmart-gpt">
                      <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Calculator className="w-5 h-5 mr-2" />
                        Calculate Your Savings
                      </Button>
                    </Link>
                    <Link href="/contact">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-emerald-600 text-emerald-400 hover:bg-emerald-600 hover:text-white bg-transparent"
                      >
                        Talk to a CPA
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </article>
    </div>
  )
}
