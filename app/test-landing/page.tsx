"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot, CheckCircle, Rocket, MessageSquare, Shield, Lock, Users, Zap } from "lucide-react"
import Link from "next/link"
import { AuthModal } from "@/components/auth/auth-modal"

export default function TestLandingPage() {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "signin" | "signup" }>({
    isOpen: false,
    mode: "signin",
  })

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
                  <span className="block text-emerald-400 text-xl lg:text-xl mt-8">
                    From idea to launch in record time, our tax experts help you startup with confidence and stay
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
                    <Rocket className="mr-3 w-6 h-6" />
                    Start My LLC
                  </Button>
                </Link>
                <Link href="/features">
                  <Button
                    size="lg"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg font-semibold w-full sm:w-auto"
                  >
                    Learn more
                    <Bot className="ml-3 w-6 h-6" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {[
                  "Startup in Less Than 48 Hours",
                  "EIN, Legal docs, & State registrations begin immediately",
                  "StartSmart AI-powered App included in all startup packages (Free)",
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
                    <img src="/images/startsmart-logo-black-cropped.jpg" alt="StartSmart" className="h-12 w-auto" />
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

                  <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                    onClick={() => setAuthModal({ isOpen: true, mode: "signup" })}
                  >
                    <MessageSquare className="mr-2 w-4 h-4" />
                    Try StartSmart AI Now
                  </Button>
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
            {/* Video/Image Left */}
            <div className="relative">
              <video
                src="/videos/buried_paperwork.MP4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full max-w-md aspect-[9/16] rounded-2xl border border-slate-700 object-contain bg-slate-900"
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
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3">Learn More</Button>
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
              <h2 className="text-3xl lg:text-4xl font-bold text-white">Got Questions? We've Got Answers.</h2>
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
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3">See How It Works</Button>
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
              <h2 className="text-3xl lg:text-4xl font-bold text-white">
                Your Data, Protected Like a Fortune 500 Company
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                Security isn't optional — it's built into everything we do. From encrypted document storage to secure
                tax data sharing, your information stays private and protected.
              </p>
              <div className="space-y-3">
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
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3">Learn About Security</Button>
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
                Your AI Assistant. Your Expert Team. Your Business, Launched.
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        mode={authModal.mode}
      />
    </div>
  )
}
