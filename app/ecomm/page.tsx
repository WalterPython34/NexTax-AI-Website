"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Bot, CheckCircle, Rocket, MessageSquare, Shield, Lock, Users, Zap, ArrowRight, Building2, TrendingUp, Clock, Flame, Lightbulb, DollarSign } from "lucide-react"
import Link from "next/link"
import { AuthModal } from "@/components/auth/auth-modal"
import { Navigation } from "@/components/navigation"
import { TaxSavingsWizard } from "@/components/tax-savings-wizard"

export default function TestLandingPage() {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "signin" | "signup" }>({
    isOpen: false,
    mode: "signin",
  })

  const stats = [
    { number: "48hrs", label: "Business Launch Time" },
    { number: "99.7%", label: "Document Accuracy" },
    { number: "24/7", label: "AI Support Available" },
    { number: "50+", label: "States Supported" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Hero Section - Copied from current homepage */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10" />
        <div className="relative container mx-auto px-4 py-20 lg:py-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-cyan-400 border-blue-500/30 text-lg px-2 py-2">
                <Bot className="w-4 h-4 mr-2" />
                Powered by StartSmart AI
              </Badge>

              <div className="space-y-6">
                <h1 className="text-3xl lg:text-5xl font-bold text-white leading-tight">
                  Bring your vision to life.
                  <span className="block text-white-400">We'll streamline the setup.</span>
                  <span className="block text-emerald-300 text-xl lg:text-xl mt-8">
                    From idea to new business in record time, our tax experts help you startup with confidence and stay
                    organized with our AI-powered tools.
                  </span>
                </h1>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/pricing">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-6 text-lg font-semibold w-full sm:w-auto"
                  >
                    <Rocket className="mr-3 w-6 h-6 text-orange-500" />
                    Get Started
                  </Button>
                </Link>
                <Link
                    href="https://chatgpt.com/g/g-684641e9df808191a9d2025951aa3f09-startsmart-ai-business-launch-assistant"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button 
                      size="lg"
                      className="w-full sm:w-auto bg-transparent border border-white/30 text-emerald-400 hover:bg-emerald-4=500 hover:text-yellow-200 px-8 py-6 text-lg font-semibold backdrop-blur">
                      <Lightbulb className="mr-3 w-6 h-6 text-yellow-200"/>
                      Validate my Idea
                    </Button>
                </Link>
                <Link href="/features">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-transparent border border-white/30 text-white/80 hover:bg-white/10 hover:text-emerald-400 px-8 py-6 text-lg font-semibold backdrop-blur"
                  >
                    <Bot className="ml-3 w-6 h-6 text-red-400" /> 
                    Learn more                   
                  </Button>
                </Link>               
              </div>

              <div className="space-y-3 py-4">
                {[
                  "Start your new business in less than 48 Hours",
                  "EIN, Legal doc, Registered Agent & State registrations begin immediately",
                  "StartSmart AI-powered App & Idea Validation GPT included in all startup packages",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Demo Preview */}
            <div className="relative -mt-8">
              <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-2xl" />
                <div className="relative space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white">StartSmart AI</h3>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <Badge className="bg-green-500/20 text-green-300 text-xs">Online & Ready</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-900/30 rounded-lg p-4">
                      <p className="text-slate-300 text-sm">
                        <strong className="text-emerald-400">You:</strong> "Should I elect S-Corp status for my new
                        LLC?"
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg p-4 border border-emerald-500/20">
                      <p className="text-slate-300 text-sm">
                        <strong className="text-emerald-400">StartSmart AI:</strong> "Based on your projected $85K
                        revenue and single-member structure, S-Corp election could save you ~$6,500 annually in
                        self-employment taxes. However, you'll need to run payroll. Let me show you the breakeven
                        analysis..."
                      </p>
                    </div>
                    <div className="bg-slate-900/30 rounded-lg p-4">
                      <p className="text-slate-300 text-sm">
                        <strong className="text-emerald-400">You:</strong> "What about multi-state tax implications?"
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg p-4 border border-emerald-500/20">
                      <p className="text-slate-300 text-sm">
                        <strong className="text-emerald-400">StartSmart AI:</strong> "Great question! Since you
                        mentioned clients in NY and CA, you'll need to consider nexus thresholds..."
                      </p>
                    </div>
                  </div>

                  <Link
                    href="https://chatgpt.com/g/g-684641e9df808191a9d2025951aa3f09-startsmart-ai-business-launch-assistant"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                      <MessageSquare className="mr-2 w-4 h-4" text-cyan-500/>
                      Try StartSmart → Live on ChatGPT
                    </Button>
                    </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tax Savings Quiz Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          {/* Section Header */}
           <h2 className="text-3xl lg:text-4xl font-bold text-white text-center mb-6">
            Don't let 2026 platform changes eat your margins.
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed">
                With the new $2,000 threshold, the IRS sees every livestream sale. Use the <span className="text-slate-300">StartSmart AI Leakage Check</span> below to see how much you’re overpaying in Self-Employment tax and claim your "Audit-Shield" roadmap.
              </p>
          

          {/* 60/40 Grid Layout */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
            {/* Left Column - Quiz Card (60%) */}
            <div className="flex-shrink-0">
              <TaxSavingsWizard variant="card" />
              </div>
            
            {/* Right Column - Creator Image (40%) */}
            <div className="lg:col-span-2 flex justify-center lg:justify-start">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-6 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-2xl opacity-60"></div>
                {/* Image container */}
                <div className="relative">
                  <img
                    src="/images/creator2.jpg"
                    alt="Content creator with ring light filming product showcase"
                    className="rounded-2xl border-2 border-slate-700/50 shadow-2xl max-h-[500px] object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

     {/* Section 1: Launching Doesn't Need to Be Difficult (Video Left, Text Right) */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-xl"></div>
            {/* Video/Image Left */}
            <div className="relative">
              <video
                src="/videos/buried_paperwork1.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="max-h-[460px] mx-auto rounded-2xl border border-slate-700 object-contain bg-slate-900"
              />
            </div>

            {/* Text Right */}
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-white">
                Starting a Business Doesn't Have to Be Complicated
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                Most founders get stuck before they start — buried in paperwork, tax forms, and state requirements.
                StartSmart simplifies it all with guided, AI-powered setup that feels effortless.
              </p>
              <div className="space-y-3">
                {[
                  "Launch your LLC or S-Corp in as little as 48 hours",
                  "Step-by-step guidance built for first-time founders",
                  "No legal jargon. No stress. Just progress.",
                  "AI + human experts to guide your every move",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/features">
              <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3">Learn More</Button>
            </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Business Question Solved (Text Left, Video Right) */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Left */}
            <div className="space-y-6 lg:order-1">
              <h2 className="text-3xl lg:text-4xl font-bold text-emerald-400">Got Questions? We've Got Answers.</h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                Whether it's taxes, entity selection, or compliance — StartSmart AI is powered by real pros who know
                small business inside out. Ask anything, anytime.
              </p>
              <div className="space-y-3">
                {[
                  "AI Assistant trained on real tax and business data",
                  "Live access to experienced U.S. tax professionals",
                  "Get clear, instant answers to complex business questions",
                  "Stay compliant and confident year-round",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/contact">
              <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3">See How It Works</Button>
            </Link>
            </div>

            {/* Video/Image Right */}
            <div className="relative lg:order-2">
              <video
                src="/videos/Question Solved_video.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full aspect-video rounded-2xl border border-slate-700 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Secure Tax Info (Video Left, Text Right) */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Video/Image Left */}
            <div className="relative">
              <video
                src="/videos/Secure Tax Info_video.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full aspect-video rounded-2xl border border-slate-700 object-cover"
              />
            </div>

            {/* Text Right */}
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-cyan-300">
                Your Data, Protected Like a Fortune 500 Company
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                Security isn't optional — it's built into everything we do. From encrypted document storage to secure
                tax data sharing, your information stays private and protected.
              </p>
              <div className="space-y-3 mb-6">
                {[
                  "Encrypted, bank-level data security",
                  "Auto-organized tax and business documents",
                  "Secure cloud sync for your startup's key files",
                  "100% privacy — your data belongs to you",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3">Learn About Security</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: AI + Human Launch Support (Text Left, Video Right) */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Left */}
            <div className="space-y-6 lg:order-1">
              <h2 className="text-3xl lg:text-4xl font-bold text-white">
                Your AI Assistant. <span className="text-cyan-400">Your Expert Team.</span> <span className="text-emerald-400">Your Business, Launched</span>.
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                Stop guessing. Start growing. StartSmart combines automation and expert insight so you can form, manage,
                and scale your business with confidence — all in one place.
              </p>
              <div className="space-y-3">
                {[
                  "Guided business formation powered by AI",
                  "Live expert chat when you need human help",
                  "Tax setup, compliance tracking, and more",
                  "Start today — see results instantly",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing">
                <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8 py-4 text-lg">
                  <Rocket className="mr-2 w-5 h-5" />
                  Get Started Now
                </Button>
              </Link>
            </div>

            {/* Video/Image Right */}
            <div className="relative lg:order-2">
              <video
                src="/videos/Launching_made_easy.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full aspect-video rounded-2xl border border-slate-700 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

       {/* NEW: AI Differentiator Section */}
      <section className="py-10 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Why StartSmart AI Changes Everything</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Other services stop at paperwork. We give you an AI business partner trained on decades of real-world
              experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: Bot,
                title: "Custom-Trained on Your Business",
                description:
                  "Not generic ChatGPT. StartSmart AI knows your entity type, industry, state requirements, and growth plans.",
                color: "purple",
              },
              {
                icon: Shield,
                title: "Big 4 Tax Expertise Built-In",
                description:
                  "Trained on 20+ years of Morgan Stanley, EY, and KPMG tax strategies. Get enterprise-level advice instantly.",
                color: "emerald",
              },
              {
                icon: TrendingUp,
                title: "Grows With Your Business",
                description:
                  "From startup questions to scaling challenges. Your AI advisor evolves as your business grows.",
                color: "cyan",
              },
            ].map((feature, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
                <CardContent className="p-8 text-center">
                  <div
                    className={`w-16 h-16 mx-auto mb-6 rounded-full ${
                      feature.color === "purple"
                        ? "bg-purple-500/20"
                        : feature.color === "emerald"
                          ? "bg-emerald-500/20"
                          : "bg-cyan-500/20"
                    } flex items-center justify-center`}
                  >
                    <feature.icon
                      className={`w-8 h-8 ${
                        feature.color === "purple"
                          ? "text-purple-400"
                          : feature.color === "emerald"
                            ? "text-emerald-400"
                            : "text-cyan-400"
                      }`}
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                  <p className="text-slate-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          </div>
          </section>
         

      {/* What's Included Section */}
      <section className="py-8 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Everything You Need to Start</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              One simple price includes everything required to legally operate your business.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: Building2,
                title: "Legal Entity Formation",
                items: [
                  "LLC or Corporation filing",
                  "Articles of organization",
                  "State compliance",
                  "Registered agent service",
                ],
              },
              {
                icon: Shield,
                title: "Tax & Compliance Setup",
                items: ["Federal EIN number", "State tax registration", "Operating agreements", "Compliance calendar"],
              },
              {
                icon: Zap,
                title: "Business Essentials",
                items: [
                  "Business plan generation",
                  "Digital document vault",
                  "Ongoing support",
                  "Future filing reminders",
                ],
              },
            ].map((feature, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <feature.icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4 text-center">{feature.title}</h3>
                  <ul className="space-y-2">
                    {feature.items.map((item, j) => (
                      <li key={j} className="flex items-center gap-2 text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pricing CTA */}
          <div className="text-center">
            <div className="inline-block bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">$499</span>
                <span className="text-slate-400 ml-2">one-time fee</span>
              </div>
              <div className="space-y-4 mb-6">
                <p className="text-slate-300">Everything included. What you see is what you pay.</p>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <h4 className="text-cyan-300 font-semibold mb-2">Our Transparency Guarantee:</h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>✓ No hidden state filing fees</li>
                    <li>✓ No surprise registered agent charges</li>
                    <li>✓ No mandatory add-ons or upsells</li>
                  </ul>
                </div>
              </div>
              <Link href="/pricing">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 text-lg">
                  Get Started Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

       <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-emerald-400 mb-2">{stat.number}</div>
                <div className="text-slate-300 text-sm lg:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
        
      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        mode={authModal.mode}
      />
    </div>
  )
}
