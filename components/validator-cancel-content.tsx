"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { XCircle, AlertTriangle, ArrowRight, PenLine, MessageCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ValidatorCancelContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 pt-16">
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            {/* Cancel Icon */}
            <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-amber-400" />
            </div>

            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 mb-6">Checkout Canceled</Badge>

            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">Checkout Canceled — No Charge Was Made</h1>

            <p className="text-xl text-slate-300 mb-4">
              You canceled the payment, so your Idea Validation Report has not been generated yet.
            </p>
            <p className="text-lg text-slate-400 mb-8">
              Your answers are still saved, and you can resume checkout anytime.
            </p>

            {/* Primary CTA */}
            <Link href="https://chatgpt.com/g/g-684641e9df808191a9d2025951aa3f09-startsmart-ai-business-launch-assistant">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8 py-6 text-lg mb-8"
              >
                Resume Checkout to Generate My Report
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>

            {/* Secondary Options Card */}
            <Card className="bg-slate-800/50 border-slate-700 mb-8">
              <CardContent className="p-8">
                <h2 className="text-xl font-semibold text-white mb-6">Other Options</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <Link href="https://chatgpt.com/g/g-684641e9df808191a9d2025951aa3f09-startsmart-ai-business-launch-assistant">
                    <Card className="bg-slate-700/50 border-slate-600 hover:bg-slate-700 transition-colors cursor-pointer h-full">
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <PenLine className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-white mb-1">Edit My Answers First</h3>
                          <p className="text-slate-400 text-sm">Return to the validator form</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link href="mailto:support@nextax.ai">
                    <Card className="bg-slate-700/50 border-slate-600 hover:bg-slate-700 transition-colors cursor-pointer h-full">
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-white mb-1">Contact Support</h3>
                          <p className="text-slate-400 text-sm">support@nextax.ai</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Small Print Notice */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 flex items-start gap-3 mb-8">
              <AlertTriangle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-400 text-sm text-left">
                If you believe you were charged, check your email receipt from Stripe or{" "}
                <Link href="mailto:support@nextax.ai" className="text-emerald-400 hover:underline">
                  contact us
                </Link>{" "}
                and we'll confirm immediately.
              </p>
            </div>

            {/* Return Home */}
            <div className="space-y-4">
              <Link href="/">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                >
                  Return to Homepage
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* StartSmart CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl p-8">
              <div className="flex justify-center mb-8">
                <img src="/images/startsmart-logo-white.png" alt="StartSmart by NexTax.AI" className="h-28 w-auto" />
              </div>

              <h3 className="text-3xl font-bold text-white mb-4">Start Smart. Scale Smarter.</h3>
              <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
                Start your journey towards financial independence today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/pricing">
                  <Button size="lg" className="bg-white text-emerald-600 hover:bg-slate-100 px-8 py-4">
                    Start My Business Now
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 px-8 py-4 bg-transparent"
                  >
                    Compare Plans
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
