"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Mail, Phone, Calendar, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ValidatorSuccessContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>

            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">Payment Successful</Badge>

            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">Your Purchase is Complete!</h1>

            <p className="text-xl text-slate-300 mb-8">
              Thank you for your purchase. You'll receive a confirmation email shortly with details about your order.
            </p>

            {/* What Happens Next Section */}
            <Card className="bg-slate-800/50 border-slate-700 mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold text-white mb-6">What Happens Next?</h2>

                <div className="space-y-6 text-left">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-emerald-400 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Payment Confirmed</h3>
                      <p className="text-slate-300">
                        We've received your order and have started processing your Idea Validation Report.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-emerald-400 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">We Generate Your Report</h3>
                      <p className="text-slate-300">
                        Our system compiles the market signals, competitive context, and fit/scoring based on your
                        validator answers and turns them into a structured research + scoring report.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-emerald-400 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Delivery by Email</h3>
                      <p className="text-slate-300">
                        You'll receive an email with your secure PDF report link once it's ready.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-emerald-400 font-bold text-sm">4</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Need Changes?</h3>
                      <p className="text-slate-300">
                        Reply to the delivery email if you want to update inputs or run another variation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tip callout */}
                <div className="mt-8 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-200 text-sm">
                    <span className="font-semibold">Tip:</span> If you don't see the email within a few minutes, check
                    your spam/promotions folder.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Support Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center">
                  <Mail className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Email Support</h3>
                  <p className="text-slate-400 text-sm">support@nextax.ai</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center">
                  <Phone className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Phone Support</h3>
                  <p className="text-slate-400 text-sm">1-800-NEXTAX</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Schedule Call</h3>
                  <p className="text-slate-400 text-sm">calendly.com/steven-morello-nextax</p>
                </CardContent>
              </Card>
            </div>

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
              <p className="text-slate-400 text-sm">
                Questions? Contact us anytime - we're here to help your business succeed!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
