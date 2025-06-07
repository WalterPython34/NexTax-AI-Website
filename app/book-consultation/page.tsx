"use client"

import { useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"

declare global {
  interface Window {
    Calendly: any
  }
}

export default function BookConsultationPage() {
  useEffect(() => {
    // Load Calendly widget script
    const script = document.createElement("script")
    script.src = "https://assets.calendly.com/assets/external/widget.js"
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      if (window.Calendly) {
        window.Calendly.initInlineWidget({
          url: "https://calendly.com/steven-morello-nextax",
          parentElement: document.getElementById("calendly-inline-widget"),
          prefill: {},
          utm: {},
        })
      }
    }

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">
            <Calendar className="w-4 h-4 mr-2" />
            Book Your Consultation
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Schedule Your
            <span className="block text-emerald-400">Free Consultation</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
            Book a 30-minute strategy session with our tax experts. We'll discuss your business needs and show you how
            NexTax.AI can help you save time and money.
          </p>
        </div>
      </section>

      {/* Calendly Widget */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div
              id="calendly-inline-widget"
              className="min-h-[700px] bg-white rounded-lg shadow-2xl"
              style={{ minHeight: "700px" }}
            />
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-8">What to Expect</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Discovery Call</h3>
                <p className="text-slate-300 text-sm">We'll learn about your business and current tax situation</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Custom Strategy</h3>
                <p className="text-slate-300 text-sm">We'll outline how our AI can optimize your tax processes</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Next Steps</h3>
                <p className="text-slate-300 text-sm">We'll provide a clear roadmap for implementation</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
