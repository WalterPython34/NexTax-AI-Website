"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Rocket, MessageSquare, FileText, BarChart3, CheckCircle, ArrowRight } from "lucide-react"

export default function TestDemoPage() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      type: "image" as const,
      src: "/images/chat.jpg",
      text: "Ask anything about your business — and get answers instantly.",
    },
    {
      type: "video" as const,
      src: "/videos/doc_center.mp4",
      text: "Your business documents, organized automatically.",
    },
    {
      type: "video" as const,
      src: "/videos/roadmap.mp4",
      text: "From idea to launch — track every step with your AI Roadmap.",
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4000) // Change slide every 4 seconds

    return () => clearInterval(interval)
  }, [slides.length])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <Badge className="mb-6 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">All-in-One Platform</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 text-balance">
              Everything You Need to Launch and Grow — All in One Platform
            </h1>
            <p className="text-xl text-slate-300 mb-8 text-pretty">
              StartSmart combines AI automation with real human support to guide you through every stage of starting and
              managing your business — faster, easier, and smarter.
            </p>

            <div className="relative max-w-3xl mx-auto mb-8 h-[400px] md:h-[500px]">
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      index === currentSlide ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {slide.type === "video" ? (
                    <video src={slide.src} autoPlay muted loop playsInline className="w-full h-full object-contain" />
                    ) : (
                      <img
                        src={slide.src || "/placeholder.svg"}
                        alt={slide.text}
                        className="w-full h-full object-contain bg-slate-900"
                      />
                    )}
                    {/* Overlay text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end justify-center pb-8">
                      <p className="text-white text-lg md:text-xl font-medium px-6 text-center max-w-2xl">
                        {slide.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Slide indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentSlide ? "bg-emerald-400 w-8" : "bg-slate-500"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Rocket className="w-5 h-5 mr-2" />
                  Try StartSmart Free
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
              >
                See Features Below
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: AI Business Formation (Left Image / Right Text) */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
           {/* Video/Image Left */}
            <div className="relative">
              <video
                src="/videos/laptop_launch.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="max-h-[460px] mx-auto rounded-2xl border border-slate-700 object-contain bg-slate-900"
              />
            </div>


            {/* Text */}
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6"><Rocket className="w-12 h-12 text-emerald-400 mx-auto mb-4" />Launch Your Business in Record Time</h2>
              <p className="text-xl text-slate-300 mb-8">
                Form your LLC or S-Corp in as little as 48 hours with guided AI workflows and expert support every step
                of the way.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Auto-generated LLC documents and filings</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">EIN setup with IRS integration</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Compliance reminders and status tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Real human review before submission</span>
                </li>
              </ul>
              <Link href="/signup?plan=pro">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Start My LLC
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: AI Chat + Expert Help (Right Image / Left Text) */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Instant Answers, Real Expertise 💬</h2>
              <p className="text-xl text-slate-300 mb-8">
                From tax strategies to entity questions, StartSmart AI gives clear, actionable guidance — backed by real
                tax professionals for complete peace of mind.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Ask anything, anytime — AI chat, or book a call with our tax experts</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">AI assistant trained to help w/ setup, marketing, product design, tax + more</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Turn chat responses into managed tasks on your Progress Roadmap page</span>
                </li>
                  <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Use our curated list of 100+ prompts as you grow and scale your business</span>
                </li>
              </ul>
              <Link href="/startsmart-gpt">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Try the AI Assistant
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

             {/* Video/Image Right */}
            <div className="relative flex justify-center">
              <video
                src="/videos/tax_call.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="h-[460px] w-auto rounded-2xl border border-slate-700 object-cover"
              />
            </div>         
          </div>
        </div>
      </section>

      {/* Feature 3: Document Hub + Compliance Tracker (Left Image / Right Text) */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="order-2 lg:order-1">
              <video
                src="/videos/SS_compliance.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full aspect-video rounded-2xl border border-slate-700 object-cover"
              />
            </div>


            {/* Text */}
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Stay Organized and 100% Compliant 📂</h2>
              <p className="text-xl text-slate-300 mb-8">
                Keep your documents, deadlines, and filings in one secure place — auto-organized by entity, state, and
                due date.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Upload, auto-tag, and retrieve key business docs</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Real-time compliance calendar</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Tax deadlines and state filing alerts</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Bank-level encryption + private cloud storage</span>
                </li>
              </ul>
              <Link href="/features/compliance">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Explore the Doc Hub
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4: Business & Tax Dashboard (Right Image / Left Text) */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Your Business, At a Glance 📊</h2>
              <p className="text-xl text-slate-300 mb-8">
                Track your growth, compliance, and tax savings all in one intuitive dashboard — powered by real-time
                data and automation.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Dynamic overview of business metrics</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Tax savings and deductions analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Alerts for expiring licenses or filings</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Syncs seamlessly with QuickBooks and Stripe</span>
                </li>
              </ul>
              <Link href="/demo">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  See Dashboard Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Image */}
            <div>
              <div className="aspect-video bg-slate-800/50 rounded-2xl border border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-400">Business & Tax Dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Explanation */}
      <section className="py-10 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16"> 
            <h2 className="text-3xl lg:text-5xl font-bold text-cyan-400 mb-6">What Happens After You Purchase?</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Our streamlined process gets your business legally formed and ready to operate in just 48 hours.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: "1",
                  title: "Safely Secure Payment",
                  description: "Complete your purchase with our secure, bank-level encrypted payment system.",
                  time: "2 minutes",
                },
                {
                  step: "2",
                  title: "Tell Us About Your Business",
                  description: "Answer a simple questionnaire about your business needs and structure.",
                  time: "5 minutes",
                },
                {
                  step: "3",
                  title: "AI Powered Setup",
                  description: "Our AI analyzes your information instantly and prepares all required legal documents.",
                  time: "2 hours",
                },
                {
                  step: "4",
                  title: "Launch Your Business",
                  description: "Receive EIN, State registration confirm, and a promo code to begin using our StartSmart AI App.",
                  time: "48 hours",
                },
              ].map((step, i) => (
                <Card key={i} className="bg-slate-800/50 border-slate-700 text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 font-bold text-lg">{step.step}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-slate-300 text-sm mb-3">{step.description}</p>
                    <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">{step.time}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
        <div className="flex justify-center mt-8">
               <Link href="/pricing">
              <Button
                size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-6 text-lg font-semibold w-full sm:w-auto mt-4"
                  >
                <Rocket className="mr-3 w-6 h-6" />
                Launch Now
                </Button>
               </Link>  
              </div>  
             </div> 
            </div>
          </section>

      {/* Testimonial + Trust Block */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">⭐ Loved by Founders, Built for You</h2>
          <p className="text-xl text-slate-300 mb-12">
            Join thousands of entrepreneurs who launched confidently with StartSmart.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-emerald-400 mb-2">1,000+</div>
                <div className="text-slate-300">Businesses Launched</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-emerald-400 mb-2">4.9/5</div>
                <div className="text-slate-300">Satisfaction Rating</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-emerald-400 mb-2">50 States</div>
                <div className="text-slate-300">Trusted Nationwide</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">🎯 Ready to Launch Smarter?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join today and start your business with confidence — for less than your morning coffee.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Rocket className="w-5 h-5 mr-2" />
                Start My Business Now
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
              >
                Compare Plans
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
