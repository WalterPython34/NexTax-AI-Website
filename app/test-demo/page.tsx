"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Rocket, MessageSquare, Shield, Bell, Calculator, FolderOpen, FileText, BarChart3, CheckCircle, DollarSign, Clock, Zap, Target, Sparkles, Brain, ChevronRight, ChevronLeft, BookOpen, TrendingUp, ArrowRight } from "lucide-react"

export default function TestDemoPage() {
  const [currentSlide, setCurrentSlide] = useState(0)

   // Add the new state here
  const [docSlideIndex, setDocSlideIndex] = useState(0);

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

    // Add the new useEffect for document slides here
  useEffect(() => {
    const timer = setInterval(() => {
      setDocSlideIndex((prev) => (prev === 2 ? 0 : prev + 1));
    }, 5000);
    
    return () => clearInterval(timer);
  }, []);

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
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 flex items-center gap-3">
                Launch Your Business in Record Time
               <Rocket className="w-10 h-10 md:w-12 md:h-12 text-emerald-400 flex-shrink-0 animate-pulse" />
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                Form your LLC or S-Corp in less than 48 hours with guided AI workflows and our tax expert support every step
                of the way.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">EIN setup with IRS integration by a tax expert</span>
                </li>    
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Auto-generated LLC documents and filings prepared for you</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Registered Agent setup & State business registration</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">StartSmart AI access code to App included with all launch packages</span>
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
              {/* Add social proof */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex -space-x-2">
               {[1,2,3,4,5].map(i => (
              <div key={i} className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-900" />
               ))}
           </div>
            <span className="text-sm text-slate-400">Join 500+ business owners getting instant tax answers</span>
           </div>
              {/* Benefit-focused bullet points */}  
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                   <span className="text-slate-300 font-semibold">Get answers in seconds, not days</span>
                   <p className="text-slate-400 text-sm mt-1">AI chat + option to book calls with CPAs</p>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300 font-semibold">Save $3,000+ on consultants</span>
                  <p className="text-slate-400 text-sm mt-1">AI trained on your specific business needs</p>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300 font-semibold">Never miss a deadline</span>
                  <p className="text-slate-400 text-sm mt-1">Turn advice into tracked tasks automatically</p>
                </li>
                  <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300 font-semibold">Use our curated list of 100+ prompts</span>
                  <p className="text-slate-400 text-sm mt-1">Grow & scale your business</p>  
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
            
            {/* Add below the video */}
            <div className="absolute -bottom-4 -right-4 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-300">Live expert available</span>
              </div>  
             </div>
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
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">Stay Organized and 100% Compliant
              <FolderOpen className="inline-block w-10 h-10 md:w-12 md:h-12 text-yellow-400 ml-3" />
              </h2>
              
              {/* Add urgency/fear-based subheading */}
              <p className="text-xl text-red-400 font-semibold mb-4">
                Stop risking $10,000+ IRS penalties from missed deadlines
              </p>
              <p className="text-lg text-slate-300 mb-8">
                Keep your documents, deadlines, and filings in one secure place — auto-organized by entity, state, and
                due date.
              </p>

              {/* ROI-focused bullets with specific outcomes */}
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                 <div>
                  <span className="text-slate-300 font-semibold">Never miss another deadline</span>
                  <p className="text-slate-400 text-sm mt-1">Auto-populated filing calendar saves 10+ hours/month</p>
                 </div>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                 <div>
                  <span className="text-slate-300 font-semibold">Sleep easy with 30-day alerts</span>
                  <p className="text-slate-400 text-sm mt-1">Federal, state, and local reminders before penalties kick in</p>
                 </div>
                </li>
                <li className="flex items-start gap-3">
                  <Calculator className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                 <div>
                  <span className="text-slate-300 font-semibold">Audit-ready in seconds</span>
                  <p className="text-slate-400 text-sm mt-1">Every document tagged, dated, and instantly searchable</p>
                 </div>
                </li>
              </ul>

              <Link href="/features/compliance">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Get Your Compliance Calendar
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
      {/* Text Column - Left side */}
      <div className="order-1">                   
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Your Business, Your AI Tools 📊</h2>
        <p className="text-xl text-slate-300 mb-8">
          Stop paying $10,000+ for consultants. Generate professional documents and access expert knowledge instantly — all powered by AI trained on Big 4 best practices.
        </p>

        {/* Benefit-focused bullet points */}  
        <ul className="space-y-4 mb-8">
          <li className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
            <div>
              <span className="text-slate-300 font-semibold">Lawyers Charge $500/Hour for Simple Forms</span>
              <p className="text-slate-400 text-sm mt-1">AI generates same docs for you in 30 seconds</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Bell className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
            <div>
              <span className="text-slate-300 font-semibold">Professional tools to accelerate your business growth</span>
              <p className="text-slate-400 text-sm mt-1">Launch checklist, Social media calendar, marketing email generation + more</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Calculator className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
            <div>
              <span className="text-slate-300 font-semibold">Professional answers at your fingertips</span>
              <p className="text-slate-400 text-sm mt-1">100+ business formation & legal prompts for most asked startup questions</p>
            </div>
          </li>
        </ul>

        {/* Trust indicators */}
        <div className="flex items-center gap-6 mb-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">500+</div>
            <div className="text-xs text-slate-400">Businesses Launched</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">$2.1M+</div>
            <div className="text-xs text-slate-400">Saved in Fees</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">48hrs</div>
            <div className="text-xs text-slate-400">Average Setup</div>
          </div>
        </div>
      </div>
            
      {/* Slideshow Container - Right side */}
      <div className="order-2 relative">
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50">
          <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${docSlideIndex * 100}%)` }}>
            
            {/* Slide 1: Template Library */}
            <div className="min-w-full">
              <div className="relative">
                <img
                  src="/images/auto_docs.jpg"
                  alt="Business Templates"
                  className="w-full h-90 object-cover"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-red-500/20 text-red-300">Problem</Badge>
                    <div className="text-xs text-slate-400">1 of 3</div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Document Generation Center
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-emerald-400 font-bold">
                      Save $5,000+ • Generate in 30 seconds
                    </div>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      Try Free Now
                      <ArrowRight className="ml-1 w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 2: Automation Templates */}
            <div className="min-w-full">
              <div className="relative">
                <img
                  src="/images/automations.jpg"
                  alt="Pro Automation Templates"
                  className="w-full h-90 object-cover"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-blue-500/20 text-blue-300">Solution</Badge>
                    <div className="text-xs text-slate-400">2 of 3</div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Pro Automation Templates
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-purple-400 font-bold">
                      100+ Templates • Industry-Specific
                    </div>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                      Start Planning
                      <Rocket className="ml-1 w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 3: Prompt Library */}
            <div className="min-w-full">
              <div className="relative">
                <img
                  src="/images/playground.jpg"
                  alt="Prompt Playground"
                  className="w-full h-90 object-cover"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-emerald-500/20 text-emerald-300">Proof</Badge>
                    <div className="text-xs text-slate-400">3 of 3</div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Expert Knowledge Hub
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-cyan-400 font-bold">
                      Expert Knowledge • Instant Access
                    </div>
                    <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                      Get Started Now
                      <Zap className="ml-1 w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

    {/* Enhanced Navigation with progress indicator */}
        <div className="flex justify-center gap-2 mt-4">
          {[
            { label: 'Problem', color: 'red' },
            { label: 'Solution', color: 'blue' }, 
            { label: 'Proof', color: 'emerald' }
          ].map((slide, index) => (
            <button
              key={index}
              onClick={() => setDocSlideIndex(index)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                docSlideIndex === index
                  ? `bg-${slide.color}-500/20 text-${slide.color}-300 border border-${slide.color}-500/30`
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {slide.label}
            </button>
          ))}
        </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => setDocSlideIndex((prev) => (prev === 0 ? 2 : prev - 1))}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-800/80 hover:bg-slate-700 rounded-full p-2 transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={() => setDocSlideIndex((prev) => (prev === 2 ? 0 : prev + 1))}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-800/80 hover:bg-slate-700 rounded-full p-2 transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
    </div>
   </div>         

     {/* Live usage indicator */}
        <div className="absolute top-4 right-4 bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-300 text-xs font-medium">47 users online now</span>
          </div>
        </div>
      </div>
  

    {/* Value Proposition Bar */}
    <div className="mt-12 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg p-6 border border-emerald-500/30">
      <div className="text-center mb-4">
        <h3 className="text-white font-bold text-lg">Why Smart Entrepreneurs Choose StartSmart</h3>
      </div>
      <div className="grid md:grid-cols-4 gap-6 text-center">
        <div>
          <div className="text-3xl font-bold text-emerald-400">100+ Hours</div>
          <p className="text-slate-300 text-sm">Saved per month</p>          
        </div>
        <div>
          <div className="text-3xl font-bold text-emerald-400">$15,000+</div>
          <p className="text-slate-300 text-sm">In consultant fees avoided</p>
        </div>
        <div>
          <div className="text-3xl font-bold text-emerald-400">48hrs</div>
          <p className="text-slate-300 text-sm">To complete setup</p>          
        </div>
        <div>
          <div className="text-3xl font-bold text-emerald-400">500+</div>
          <p className="text-slate-300 text-sm">Businesses launched</p>
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

         {/* Button moved outside the grid and properly structured */}   
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
