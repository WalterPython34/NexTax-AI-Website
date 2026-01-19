"use client"

import { useEffect } from "react"
import Script from "next/script"
import { CheckCircle, Calendar, Clock, Shield, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ThanksPage() {
  // Fire Google Ads conversion on page load
  useEffect(() => {
    // Google Ads conversion tracking
    if (typeof window !== "undefined" && (window as any).gtag) {
      ;(window as any).gtag("event", "conversion", {
        send_to: "AW-AW-17878724249", // Replace with your actual conversion ID and label
        value: 1.0,
        currency: "USD",
      })
    }
  }, [])

  return (
    <>
      {/* Google Ads Conversion Tag - fires on page load */}
      <Script id="google-ads-conversion" strategy="afterInteractive">
        {`
          gtag('event', 'conversion', {
            'send_to': 'AW-17878724249/PhMOCN7Ky-gbEJndns1C'
          });
        `}
      </Script>

      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        {/* Hero Section */}
        <section className="pt-20 pb-12 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Information Received! <span className="text-emerald-400">Your Analysis is Starting...</span>
            </h1>

            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Your preliminary tax savings report is being generated. Book a 12-minute validation call now to see your
              full audit-proof roadmap.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span>12-Minute Call</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span>No Obligation</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>Pick Your Time</span>
              </div>
            </div>
          </div>
        </section>

        {/* Calendly Embed Section */}
        <section className="pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 lg:p-8">
              <h2 className="text-2xl font-bold text-white text-center mb-6">Book Your Free Strategy Call</h2>

              {/* Calendly Inline Widget */}
              <div
                className="calendly-inline-widget rounded-xl overflow-hidden"
                data-url="https://calendly.com/steven-morello-nextax?hide_gdpr_banner=1&background_color=1e293b&text_color=ffffff&primary_color=10b981"
                style={{ minWidth: "320px", height: "700px" }}
              />
              <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" />
            </div>
          </div>
        </section>

        {/* What Happens Next */}
        <section className="pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-white text-center mb-8">What Happens Next?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                  <span className="text-emerald-400 font-bold">1</span>
                </div>
                <h3 className="text-white font-semibold mb-2">We Analyze</h3>
                <p className="text-slate-400 text-sm">
                  Our AI processes your information and identifies your optimal tax structure.
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                  <span className="text-emerald-400 font-bold">2</span>
                </div>
                <h3 className="text-white font-semibold mb-2">You Meet with Us</h3>
                <p className="text-slate-400 text-sm">
                  In your 12-minute call, we walk through your personalized savings roadmap.
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                  <span className="text-emerald-400 font-bold">3</span>
                </div>
                <h3 className="text-white font-semibold mb-2">You Decide</h3>
                <p className="text-slate-400 text-sm">
                  No pressure. You'll have all the info you need to make the best decision.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA to explore more */}
        <section className="pb-20 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <p className="text-slate-400 mb-4">While you wait, explore our resources:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/resources">
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                  Business Guides
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                  View Pricing
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
