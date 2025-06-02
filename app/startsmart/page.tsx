"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Rocket, ExternalLink, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function StartSmartPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">
            <Rocket className="w-4 h-4 mr-2" />
            StartSmart by NexTax.AI
          </Badge>

          {/* StartSmart Logo - BIGGER */}
          <div className="flex justify-center mb-8">
            <img src="/images/startsmart-logo-white.png" alt="StartSmart by NexTax.AI" className="h-32 w-auto" />
          </div>

          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Launch Your Business in
            <span className="block text-emerald-400">48 Hours or Less</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
            Complete our questionnaire and our AI will handle entity formation, tax setup, compliance, and everything
            you need to start operating legally.
          </p>
        </div>
      </section>

      {/* Process Steps Section */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">How StartSmart Works</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Follow these simple steps to launch your business in 48 hours
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12">
            {[
              {
                step: "1",
                title: "Choose Your Package",
                description: "Select the right business launch package on our pricing page",
                time: "2 minutes",
                action: "Visit Pricing Page",
                color: "emerald",
              },
              {
                step: "2",
                title: "Complete Payment",
                description: "Secure checkout and you'll be redirected back here to complete the questionnaire",
                time: "3 minutes",
                action: "After Payment",
                color: "cyan",
              },
              {
                step: "3",
                title: "AI-Generated SS-4",
                description: "Receive your pre-filled SS-4 form for review and signature",
                time: "2-3 minutes",
                action: "Email Delivery",
                color: "violet",
              },
              {
                step: "4",
                title: "Business Ready",
                description: "Receive your EIN and complete business formation documents",
                time: "48 hours",
                action: "Launch Complete",
                color: "orange",
              },
            ].map((step, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 text-center">
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 mx-auto mb-4 rounded-full bg-${step.color}-500/20 flex items-center justify-center`}
                  >
                    <span className={`text-${step.color}-400 font-bold text-lg`}>{step.step}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-slate-300 text-sm mb-3">{step.description}</p>
                  <Badge className={`bg-${step.color}-500/20 text-${step.color}-300 text-xs mb-2`}>{step.time}</Badge>
                  <div className={`text-${step.color}-400 text-xs font-medium`}>{step.action}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA to Pricing */}
          <div className="text-center">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold text-white mb-3">Ready to Get Started?</h3>
              <p className="text-slate-300 mb-4">First, choose your business launch package to begin the process</p>
              <Link href="/pricing">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3">
                  Choose Your Package
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Typeform Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Payment Notice */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 text-sm">!</span>
                </div>
                <div>
                  <p className="text-amber-200 text-sm">
                    <strong>Important:</strong> This questionnaire should only be completed after purchasing a
                    StartSmart package. If you haven't purchased yet, please{" "}
                    <Link href="/pricing" className="underline text-amber-300 hover:text-amber-100">
                      visit our pricing page
                    </Link>{" "}
                    first.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              {/* NEXTAX BLUE COLOR */}
              <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: "#00B9F1" }}>
                Step 2: Complete Your Business Questionnaire
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Complete our business formation questionnaire below.
              </p>
            </div>

            {/* TYPEFORM EMBED */}
            <div className="bg-slate-800/30 rounded-2xl p-2 border border-slate-700 mb-8">
              <iframe
                src="https://form.typeform.com/to/hybbpz1Z?typeform-medium=embed-snippet"
                style={{
                  width: "100%",
                  height: "500px",
                  border: "none",
                  borderRadius: "12px",
                }}
                title="StartSmart Business Launch Form"
                loading="lazy"
              />
            </div>

            {/* Backup Link */}
            <div className="text-center">
              <Link href="https://form.typeform.com/to/hybbpz1Z" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10">
                  <ExternalLink className="mr-2 w-4 h-4" />
                  Open in New Tab
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
