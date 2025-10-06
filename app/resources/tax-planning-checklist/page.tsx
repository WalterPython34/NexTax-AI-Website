"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckSquare, Mail, CheckCircle, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function TaxPlanningChecklistPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [error, setError] = useState("")

  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if the page was accessed with the unlocked parameter from email
    if (searchParams.get("unlocked") === "true") {
      setIsUnlocked(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/send-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send checklist")
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
          <Link href="/resources" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Resources
          </Link>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 mb-4">
            <CheckSquare className="w-4 h-4 mr-2" />
            Checklist
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Tax Planning Checklist: Essential Strategies for New Businesses
          </h1>
          <p className="text-xl text-slate-300">
            A comprehensive checklist to help new business owners identify and implement essential tax planning
            strategies
          </p>
        </div>

        {/* Checklist Content */}
        <Card className="bg-gray-900/50 border-gray-700 mb-8">
          <CardContent className="p-8">
            <div className="relative">
              <div className={`${!isUnlocked ? "max-h-[600px] overflow-hidden" : ""}`}>
                <div className="prose prose-invert max-w-none">
                  {/* Disclaimer */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-8">
                    <p className="text-yellow-300 text-sm m-0">
                      <strong>Disclaimer:</strong> This checklist provides general guidance based on tax strategies
                      relevant for 2025. Tax laws are subject to change, and individual circumstances vary. Always
                      consult a qualified tax professional or CPA for personalized advice tailored to your business.
                      This is not legal or financial advice.
                    </p>
                  </div>

                  <p className="text-slate-300 leading-relaxed mb-8">
                    The following checklist is organized into key categories to help new business owners identify and
                    implement essential tax planning strategies. Use it as a reference to review your setup, track
                    progress, and prepare for tax season.
                  </p>

                  {/* Section 1 */}
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    <span className="text-blue-400">1.</span>
                    Choose and Evaluate Your Business Structure
                  </h2>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Selecting the right entity impacts taxes, liability, and deductions. Re-evaluate annually as your
                    business grows.
                  </p>
                  <div className="space-y-4 mb-8">
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Assess entity type</strong> (e.g., sole proprietorship, LLC, S-Corp, C-Corp,
                          partnership): Consider tax implications like self-employment taxes (15.3% on net earnings for
                          sole proprietors) vs. potential savings with S-Corp (paying yourself a reasonable salary to
                          reduce self-employment tax on distributions).
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Visit our Contact page and reach out to a NexTax.AI advisor to file
                          for changes (e.g., S-Corp election via Form 2553) if beneficial.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Separate personal and business finances:</strong> Open dedicated business bank
                          accounts and credit cards to avoid commingling, which simplifies deductions and IRS audits.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Track all transactions separately from day one.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2 */}
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    <span className="text-blue-400">2.</span>
                    Understand Tax Obligations and Filing Requirements
                  </h2>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Know your tax types and deadlines to avoid penalties.
                  </p>
                  <div className="space-y-4 mb-8">
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Identify applicable taxes:</strong> Include income tax (file annual returns like
                          Schedule C for sole proprietors), self-employment tax (if net earnings ≥ $400), employment
                          taxes (if hiring), and excise taxes (for certain industries).
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Use IRS Publication 583 for starting a business and Publication 509
                          for tax calendars.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Prepare for estimated taxes:</strong> Pay quarterly if expecting to owe ≥ $1,000
                          (individuals) or $500 (corporations) after withholdings; due April 15, June 15, Sept. 15, Jan.
                          15.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Use Form 1040-ES to calculate and pay via EFTPS or IRS Direct Pay;
                          Use the StartSmart App's Tax Compliance Calendar to set reminders to avoid underpayment
                          penalties.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3 - Partially visible before fade */}
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    <span className="text-blue-400">3.</span>
                    Maximize Deductions and Credits
                  </h2>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Reduce taxable income through eligible expenses and incentives.
                  </p>
                  <div className="space-y-4 mb-8">
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Claim ordinary and necessary business expenses:</strong> Deduct rent, utilities,
                          office supplies, insurance, professional fees, and home office costs (if qualifying).
                        </p>
                      </div>
                    </div>
                  </div>

                  {!isUnlocked && (
                    <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent" />
                  )}
                </div>

                {!isUnlocked && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
                    <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 border-0 shadow-2xl">
                      <CardContent className="p-8 text-center">
                        <Mail className="w-12 h-12 text-white mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-3">
                          Download the Full Version of the Free Guide Now
                        </h3>
                        <p className="text-blue-100 mb-6">
                          Enter your email to receive the complete checklist and unlock all strategies instantly.
                        </p>
                        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                          <div className="flex flex-col gap-3">
                            <Input
                              type="email"
                              placeholder="Enter your email address"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              className="bg-white text-gray-900 h-12 text-base"
                              disabled={isSubmitting}
                            />
                            <Button
                              type="submit"
                              disabled={isSubmitting}
                              size="lg"
                              className="bg-white text-blue-600 hover:bg-blue-50 h-12 text-base font-semibold"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Mail className="w-5 h-5 mr-2" />
                                  Get Full Checklist Free
                                </>
                              )}
                            </Button>
                          </div>
                          {error && <p className="text-red-200 text-sm mt-3 bg-red-900/30 p-2 rounded">{error}</p>}
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Full Content (shown after email submission) */}
              {isUnlocked && (
                <div className="prose prose-invert max-w-none">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-6 h-6 text-blue-400" />
                      <h3 className="text-xl font-bold text-white m-0">Checklist Sent Successfully!</h3>
                    </div>
                    <p className="text-blue-300 m-0">
                      Check your email for the complete PDF checklist. Continue reading the full content below.
                    </p>
                  </div>

                  {/* Continue Section 3 */}
                  <div className="space-y-4 mb-8">
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Claim ordinary and necessary business expenses:</strong> Deduct rent, utilities,
                          office supplies, insurance, professional fees, and home office costs (if qualifying).
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Track expenses year-round; consider itemizing if they exceed the
                          standard deduction ($15,000 single/$30,000 joint for 2025).
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Leverage tax credits:</strong> Apply for R&D credit, work opportunity tax credit,
                          small employer health insurance credit, employee retention credit, and energy-efficient
                          credits (e.g., for solar or EVs).
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Review eligibility under the Inflation Reduction Act; document
                          qualifying activities.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Deduct self-employment tax adjustment:</strong> Claim 50% of self-employment tax as an
                          above-the-line deduction.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> File Schedule SE with your return.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 4 */}
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    <span className="text-blue-400">4.</span>
                    Plan for Depreciation, Assets, and Capital Expenditures
                  </h2>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Optimize timing for purchases to accelerate deductions.
                  </p>
                  <div className="space-y-4 mb-8">
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Use Section 179 and bonus depreciation:</strong> Immediately deduct up to $1.25
                          million for qualifying equipment; bonus depreciation allows 100% for assets placed in service
                          after Jan. 19, 2025.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Time purchases before year-end; consult for limits and phase-outs.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Depreciate assets over time:</strong> Spread deductions for larger items if immediate
                          expensing isn't optimal.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Use IRS depreciation tables in Publication 946.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 5 */}
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    <span className="text-blue-400">5.</span>
                    Optimize Retirement and Health Benefits
                  </h2>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Shelter income while building long-term security.
                  </p>
                  <div className="space-y-4 mb-8">
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Set up retirement plans:</strong> Contribute to solo 401(k) (up to $23,500 + catch-up
                          for 2025), SEP-IRA (up to $70,000), or SIMPLE IRA; deductions reduce taxable income.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Open accounts early; maximize employer/employee contributions.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Utilize Health Savings Accounts (HSAs):</strong> If eligible (high-deductible plan),
                          contributions are deductible, growth tax-free, withdrawals tax-free for medical expenses.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Deduct health insurance premiums; explore for employees.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 6 */}
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    <span className="text-blue-400">6.</span>
                    Maintain Records, Compliance, and Payroll
                  </h2>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Ensure accuracy to support claims and avoid issues.
                  </p>
                  <div className="space-y-4 mb-8">
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Keep detailed records:</strong> Retain receipts, invoices, payroll docs, and asset
                          records for at least 3-7 years; use software like QuickBooks.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Digitize records; subscribe to IRS e-News for updates.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Manage payroll correctly:</strong> Classify workers (employee vs. contractor),
                          withhold taxes, and claim credits like ERC; outsource if needed.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Use Publication 15 for guidance; file Forms W-2/1099 timely.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 7 */}
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    <span className="text-blue-400">7.</span>
                    Advanced Strategies for Tax Efficiency
                  </h2>
                  <p className="text-slate-300 leading-relaxed mb-4">Implement as your business matures.</p>
                  <div className="space-y-4 mb-8">
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Time income & expenses:</strong> Defer income to next year or accelerate deductions to
                          manage brackets.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Review in Q4; understand your marginal tax rate.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Income splitting:</strong> Pay family members reasonable wages for work to shift
                          income to lower brackets.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Document roles and payments.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <CheckSquare className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300 m-0">
                          <strong>Maximize Qualified Business Income (QBI) deduction:</strong> Up to 20% deduction on
                          pass-through income for eligible businesses.
                        </p>
                        <p className="text-blue-300 text-sm mt-2 m-0">
                          <strong>Action:</strong> Check phase-out thresholds.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Next Steps */}
                  <h2 className="text-2xl font-bold text-white mb-4">Next Steps</h2>
                  <ul className="list-disc list-inside text-slate-300 mb-8 space-y-2">
                    <li>
                      <strong>Review annually:</strong> Update this checklist at year-end and mid-year.
                    </li>
                    <li>
                      <strong>Seek professional help:</strong> Visit our Contact page, and Book a Call on our Calendar,
                      to speak with a NexTax.AI tax advisor and discuss complex issues like state taxes or international
                      operations for your entity.
                    </li>
                    <li>
                      <strong>Resources:</strong> Visit IRS.gov for forms and publications; Use the StartSmart App's Tax
                      Compliance Center for tracking.
                    </li>
                  </ul>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-8">
                    <p className="text-blue-300 mb-4">
                      <strong>Ready to optimize your tax strategy?</strong> Contact us for a free consultation on
                      tax-optimized business planning.
                    </p>
                    <Link href="/contact">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">Schedule Free Consultation</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 border-0">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Launch Your Business?</h3>
            <p className="text-blue-100 mb-6">
              Get personalized guidance and launch your business in 48 hours with StartSmart GPT.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/startsmart">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
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
