"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SampleMemoPreviewModal } from "@/components/SampleMemoPreviewModal"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Shield,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  BarChart3,
  FileText,
  Target,
  Scale,
  Lock,
  ChevronDown,
  Database,
  Activity,
  Zap,
  Quote,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

/* ════════════════════════════════════════════════════════════════
   FONT SETUP
   ════════════════════════════════════════════════════════════════
   Add this to /app/layout.tsx if not already present:

     import { Inter } from "next/font/google"
     const inter = Inter({
       subsets: ["latin"],
       variable: "--font-inter",
       display: "swap",
     })

   Then on the <body> tag:  className={`${inter.variable} font-sans`}

   In tailwind.config.ts, extend fontFamily:
     fontFamily: {
       sans: ["var(--font-inter)", "system-ui", "sans-serif"],
     }
   ════════════════════════════════════════════════════════════════ */

/* ────────────────────────────────────────────────────────────────
   SHARED VISUAL PRIMITIVES
   ──────────────────────────────────────────────────────────────── */

function AccentBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`mx-auto mb-6 h-[3px] w-12 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 ${className}`}
      aria-hidden="true"
    />
  )
}

function DottedBackdrop({
  className = "",
  opacity = 0.18,
}: {
  className?: string
  opacity?: number
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage: `radial-gradient(rgba(148, 163, 184, ${opacity}) 1px, transparent 1px)`,
        backgroundSize: "18px 18px",
      }}
    />
  )
}

function GradientBlob({
  className = "",
  variant = "default",
}: {
  className?: string
  variant?: "default" | "subtle" | "wide" | "hero"
}) {
  const sizes = {
    default: "h-[420px] w-[420px]",
    subtle: "h-[320px] w-[320px] opacity-60",
    wide: "h-[380px] w-[600px]",
    hero: "h-[620px] w-[620px]",
  }
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full bg-gradient-to-br from-emerald-500/35 via-cyan-500/25 to-blue-500/20 blur-3xl ${sizes[variant]} ${className}`}
    />
  )
}

function TabletFrame({
  src,
  alt,
  aspectRatio = "16/10",
  priority = false,
}: {
  src: string
  alt: string
  aspectRatio?: string
  priority?: boolean
}) {
  return (
    <div
      className="relative rounded-[28px] bg-gradient-to-b from-slate-700 to-slate-900 p-3 shadow-2xl shadow-black/50 ring-1 ring-slate-700/60"
      style={{ aspectRatio }}
    >
      <div className="absolute left-1/2 top-[14px] z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-slate-600" />
      <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-slate-950">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 600px"
          className="object-contain object-top"
          priority={priority}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.06]"
        />
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   INTELLIGENCE ENGINE
   Large animated wheel + side-stacked cards with bidirectional hover.
   ──────────────────────────────────────────────────────────────── */

const ENGINE_STEPS = [
  {
    id: "collect",
    step: "01",
    title: "Collect",
    label: "Collect",
    description: "Pull live listings and 15,000+ closed transactions into a unified deal layer.",
    icon: Database,
    color: "#10b981",
    colorLight: "#34d399",
    chip: "1,500+ live deals",
    angle: 0,
  },
  {
    id: "benchmark",
    step: "02",
    title: "Benchmark",
    label: "Benchmark",
    description: "Compare against real transaction multiples and industry-specific operating metrics.",
    icon: BarChart3,
    color: "#06b6d4",
    colorLight: "#22d3ee",
    chip: "40+ industries",
    angle: 90,
  },
  {
    id: "underwrite",
    step: "03",
    title: "Underwrite",
    label: "Underwrite",
    description: "Normalize earnings, stress-test DSCR, and score the deal under lender assumptions.",
    icon: Scale,
    color: "#3b82f6",
    colorLight: "#60a5fa",
    chip: "DSCR · SDE · multiple",
    angle: 180,
  },
  {
    id: "decide",
    step: "04",
    title: "Decide",
    label: "Decide",
    description: "Output a lender-ready verdict — proceed, renegotiate, or walk away.",
    icon: Target,
    color: "#f59e0b",
    colorLight: "#fbbf24",
    chip: "Verdict + memo",
    angle: 270,
  },
] as const

type EngineId = (typeof ENGINE_STEPS)[number]["id"]

function IntelligenceEngine() {
  const [activeId, setActiveId] = useState<EngineId | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const isPaused = activeId !== null || prefersReducedMotion

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-10 lg:gap-16 items-center max-w-6xl mx-auto">
      {/* LEFT — stacked cards */}
      <div className="space-y-4">
        {ENGINE_STEPS.map((s) => {
          const Icon = s.icon
          const isActive = activeId === s.id
          return (
            <div
              key={s.id}
              onMouseEnter={() => setActiveId(s.id)}
              onMouseLeave={() => setActiveId(null)}
              className="group relative bg-slate-900/60 border rounded-xl p-5 lg:p-6 cursor-pointer transition-all duration-300"
              style={{
                borderColor: isActive ? `${s.color}66` : "rgb(30, 41, 59)",
                transform: isActive ? "translateX(8px)" : "translateX(0)",
                boxShadow: isActive
                  ? `0 20px 40px -15px ${s.color}40, 0 0 0 1px ${s.color}30`
                  : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: isActive ? `${s.color}22` : "rgba(30, 41, 59, 0.8)",
                    borderColor: isActive ? `${s.color}55` : "rgb(51, 65, 85)",
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-colors duration-300"
                    style={{ color: isActive ? s.colorLight : "#cbd5e1" }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="font-mono text-[10px] font-bold tracking-wider transition-colors duration-300"
                      style={{ color: isActive ? s.colorLight : "#64748b" }}
                    >
                      STEP {s.step}
                    </span>
                    <span
                      className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded transition-all duration-300"
                      style={{
                        backgroundColor: isActive ? `${s.color}1a` : "rgba(30, 41, 59, 0.6)",
                        color: isActive ? s.colorLight : "#64748b",
                        border: `1px solid ${isActive ? `${s.color}33` : "rgb(51, 65, 85)"}`,
                      }}
                    >
                      {s.chip}
                    </span>
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold text-white mb-1 leading-tight">
                    {s.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-snug">{s.description}</p>
                </div>

                <div
                  className="hidden lg:block absolute -right-[34px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: isActive ? s.color : "rgb(51, 65, 85)",
                    boxShadow: isActive ? `0 0 12px ${s.color}` : "none",
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* RIGHT — big wheel */}
      <div className="relative flex items-center justify-center">
        <GradientBlob className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="relative w-full max-w-[580px]">
          <svg
            viewBox="0 0 500 500"
            className="h-auto w-full"
            role="img"
            aria-label="AcquiFlow Intelligence Engine: collect, benchmark, underwrite, decide"
          >
            <defs>
              {ENGINE_STEPS.map((s) => (
                <radialGradient key={`rg-${s.id}`} id={`rg-${s.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={s.colorLight} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.75" />
                </radialGradient>
              ))}
              <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="80%" stopColor="#06b6d4" stopOpacity="0" />
                <stop offset="95%" stopColor="#10b981" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </radialGradient>
              <filter id="segmentShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="0" dy="2" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.4" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx="250" cy="250" r="240" fill="url(#outerGlow)" />

            {/* Rotating segment group */}
            <g
              style={{
                transformOrigin: "250px 250px",
                animation: prefersReducedMotion
                  ? "none"
                  : `aqf-rotate 60s linear infinite ${isPaused ? "paused" : "running"}`,
              }}
            >
              {ENGINE_STEPS.map((s) => {
                const cx = 250
                const cy = 250
                const rOuter = 220
                const rInner = 120
                const startAngle = (s.angle - 45) * (Math.PI / 180)
                const endAngle = (s.angle + 45) * (Math.PI / 180)

                const x1 = cx + rOuter * Math.cos(startAngle)
                const y1 = cy + rOuter * Math.sin(startAngle)
                const x2 = cx + rOuter * Math.cos(endAngle)
                const y2 = cy + rOuter * Math.sin(endAngle)
                const x3 = cx + rInner * Math.cos(endAngle)
                const y3 = cy + rInner * Math.sin(endAngle)
                const x4 = cx + rInner * Math.cos(startAngle)
                const y4 = cy + rInner * Math.sin(startAngle)

                const path = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z`

                const isActive = activeId === s.id

                const midAngle = s.angle * (Math.PI / 180)
                const labelR = (rOuter + rInner) / 2
                const lx = cx + labelR * Math.cos(midAngle)
                const ly = cy + labelR * Math.sin(midAngle)

                return (
                  <g
                    key={s.id}
                    onMouseEnter={() => setActiveId(s.id)}
                    onMouseLeave={() => setActiveId(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <path
                      d={path}
                      fill={`url(#rg-${s.id})`}
                      stroke="#0f172a"
                      strokeWidth="3"
                      opacity={activeId === null ? 0.88 : isActive ? 1 : 0.55}
                      filter="url(#segmentShadow)"
                      style={{
                        transition: "opacity 0.35s ease, transform 0.35s ease",
                        transformOrigin: "250px 250px",
                        transform: isActive ? "scale(1.04)" : "scale(1)",
                      }}
                    />
                    <g
                      style={{
                        transformOrigin: `${lx}px ${ly}px`,
                        animation: prefersReducedMotion
                          ? "none"
                          : `aqf-counter-rotate 60s linear infinite ${isPaused ? "paused" : "running"}`,
                      }}
                    >
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="15"
                        fontWeight="700"
                        style={{
                          letterSpacing: "0.12em",
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                      >
                        {s.label}
                      </text>
                    </g>
                  </g>
                )
              })}
            </g>

            {/* Static hub */}
            <circle cx="250" cy="250" r="105" fill="url(#hubGradient)" />
            <circle cx="250" cy="250" r="105" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.35" />
            <circle
              cx="250"
              cy="250"
              r="118"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="0.5"
              opacity="0.2"
              strokeDasharray="2 4"
            />
            <text
              x="250"
              y="232"
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="13"
              fontWeight="700"
              style={{ letterSpacing: "0.18em" }}
            >
              ACQUIFLOW
            </text>
            <text
              x="250"
              y="254"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
              fontWeight="500"
              style={{ letterSpacing: "0.1em" }}
            >
              INTELLIGENCE
            </text>
            <text
              x="250"
              y="272"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
              fontWeight="500"
              style={{ letterSpacing: "0.1em" }}
            >
              ENGINE
            </text>
          </svg>

          {/* Live status pill */}
          <div className="absolute top-2 right-2 flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm border border-emerald-500/30 rounded-full px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-emerald-300 uppercase">
              Live data
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes aqf-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes aqf-counter-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   FAQ
   ──────────────────────────────────────────────────────────────── */

const preLofiFaqs = [
  {
    question: "How do I know seller add-backs will hold up under lender scrutiny?",
    answer: "We pressure-test earnings integrity to ensure normalized cash flow is defensible.",
  },
  {
    question: "Will this deal survive SBA underwriting under conservative assumptions?",
    answer: "We evaluate debt coverage durability before LOI to reduce late-stage resets.",
  },
  {
    question: "Am I underestimating working capital requirements post-close?",
    answer: "We model normalized working capital and liquidity buffers to prevent surprises.",
  },
  {
    question: "Should this be structured as an asset or stock purchase?",
    answer: "We analyze structure alignment for long-term tax efficiency and lender comfort.",
  },
  {
    question: "What happens if revenue or margins compress after closing?",
    answer: "We run downside scenarios to define a durable offer range and walk-away threshold.",
  },
]

function PreLoiFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  return (
    <section className="py-20 border-t border-slate-800">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10 text-center">
            <AccentBar />
            <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 mb-4">Due Diligence</Badge>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
              Pre-LOI Questions We Help Buyers Answer
            </h2>
          </div>
          <div className="space-y-2">
            {preLofiFaqs.map((faq, i) => (
              <div
                key={i}
                className="border border-slate-800 rounded-lg overflow-hidden transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-black/20"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-medium text-slate-200 pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openIndex === i && (
                  <div className="px-6 pb-4 pt-0">
                    <p className="text-sm text-slate-400 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */

export default function HomePage() {
  const router = useRouter()
  const [showSampleModal, setShowSampleModal] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* ═══════════════════════════════════════════════════════════
          HERO — tighter copy, gradient subhead
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5" />
        <div className="relative container mx-auto px-4 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-10">
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-sm px-3 py-1.5">
                <BarChart3 className="w-4 h-4 mr-2" />
                Deal Intelligence Platform
              </Badge>

              <div className="space-y-6">
                <h1 className="text-[3.25rem] lg:text-[4.25rem] font-bold text-white leading-[1.02] tracking-[-0.03em]">
                  Know if a deal
                  <br />
                  deserves an LOI.
                </h1>

                <p className="text-[2rem] lg:text-[2.5rem] font-bold leading-[1.05] tracking-[-0.025em] bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                  Before you commit capital.
                </p>

                <p className="text-lg text-slate-300 leading-relaxed max-w-xl pt-2">
                  AcquiFlow normalizes seller earnings, benchmarks against real transaction data, and
                  stress-tests financing — so you know which deals deserve your time before you spend it.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/deal-reality-check">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold px-8 py-6 text-lg w-full sm:w-auto shadow-lg shadow-emerald-500/20"
                  >
                    Analyze a Deal
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowSampleModal(true)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-6 text-lg w-full sm:w-auto bg-transparent"
                >
                  See Sample Analysis
                </Button>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Shield className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <p className="text-sm text-slate-500">
                  Built on the same underwriting frameworks lenders and institutional investors use.
                </p>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <GradientBlob
                variant="hero"
                className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              />
              <div className="relative w-full max-w-[700px]">
                <TabletFrame
                  src="/AcquiFlow-3.png"
                  alt="AcquiFlow buyer dashboard showing deal analysis"
                  aspectRatio="5/3"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BAD ASSUMPTIONS */}
      <section className="py-24 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <AccentBar />
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-5">
              Most deals don&apos;t fail from lack of effort —{" "}
              <span className="text-red-400">they fail from bad assumptions.</span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed">
              AcquiFlow replaces guesswork with structured underwriting before you commit capital.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {[
              { icon: TrendingUp, title: "Inflated Earnings", description: "Seller add-backs often overstate true cash flow." },
              { icon: TrendingDown, title: "Fragile Debt Coverage", description: "Deals that \u201cwork on paper\u201d fail under real financing terms." },
              { icon: BarChart3, title: "No Real Benchmarking", description: "Buyers rely on listings \u2014 not actual transaction comps." },
              { icon: DollarSign, title: "Mispriced Deals", description: "Without data, buyers consistently overpay." },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div
                  key={i}
                  className="bg-slate-900/40 border border-slate-800 rounded-lg p-7 transition-all duration-300 hover:border-emerald-400/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10"
                >
                  <div className="w-10 h-10 mb-5 rounded-md bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-slate-300" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2 leading-tight">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              )
            })}
          </div>

          <p className="text-center text-sm sm:text-base text-slate-300 mt-14 max-w-3xl mx-auto leading-relaxed">
            AcquiFlow surfaces these issues instantly —{" "}
            <span className="text-emerald-400 font-medium">
              before LOI, before diligence, before capital is at risk.
            </span>
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          INTELLIGENCE ENGINE — large wheel + side cards
          ═══════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 bg-slate-900/50 border-t border-slate-800 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <AccentBar />
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 mb-5">
              Platform Workflow
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-4">
              How serious buyers evaluate deals with <span className="text-cyan-400">AcquiFlow</span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed">
              A lender-style underwriting workflow — simplified for speed, not stripped of rigor.
            </p>
          </div>

          <IntelligenceEngine />
        </div>
      </section>

      {/* DATA ENGINE */}
      <section className="py-24 border-t border-slate-800 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <AccentBar />
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 mb-5">
              <Database className="w-3.5 h-3.5 mr-1.5" />
              Live Data Engine
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-4">
              Built on a live deal intelligence engine —{" "}
              <span className="text-emerald-400">not stale comps.</span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed">
              Every AcquiFlow analysis is grounded in a continuously updated dataset of live listings, closed
              transactions, and benchmarked financial statements across 40+ SMB industries.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
            <div className="relative">
              <div className="absolute -inset-8 lg:-inset-12">
                <DottedBackdrop opacity={0.22} />
              </div>
              <GradientBlob variant="subtle" className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              <div className="relative">
                <TabletFrame
                  src="/market-intelligence-engine.png"
                  alt="AcquiFlow Market Intelligence Engine showing live data across 40+ industries"
                  aspectRatio="16/10"
                />
              </div>
            </div>

            <div className="space-y-7">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
                  <div className="text-2xl font-bold font-mono text-emerald-400">2,000+</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1">Live Deals Analyzed</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
                  <div className="text-2xl font-bold font-mono text-cyan-400">17,000+</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1">Closed Comps</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
                  <div className="text-2xl font-bold font-mono text-blue-400">45+</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1">Industries</div>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white leading-tight">
                Every metric you see is backed by real transactions.
              </h3>

              <ul className="space-y-4">
                {[
                  { icon: Activity, title: "Live listings, refreshed continuously", body: "Track current SMB deals on the market across every major industry." },
                  { icon: Database, title: "Closed transactions, 17,000+ deep", body: "Real sold prices, multiples, and structures — not asking-price averages." },
                  { icon: BarChart3, title: "Blended industry benchmarks", body: "Proprietary intelligence layered on top of closed transactions from licensed foundations." },
                  { icon: Zap, title: "Lender-grade financials, 20,000+ sets", body: "Compare your deal with benchmarked sets of financial staements by industry." },
                ].map((row, i) => {
                  const Icon = row.icon
                  return (
                    <li key={i} className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-emerald-500/25 bg-emerald-500/10">
                        <Icon className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white leading-tight">{row.title}</div>
                        <div className="text-sm text-slate-400 leading-snug mt-0.5">{row.body}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="pt-2">
                <Link href="/intelligence">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 hover:text-white bg-transparent"
                  >
                    Explore the Intelligence Engine
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU'LL KNOW */}
      <section className="py-24 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <AccentBar />
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              What you&rsquo;ll know <span className="text-emerald-500">before you make an offer</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {[
              { icon: DollarSign, title: "True Cash Flow", description: "See earnings after real add-back scrutiny — not seller narratives." },
              { icon: TrendingUp, title: "Will It Survive Financing?", description: "Instantly test DSCR under realistic SBA-style assumptions." },
              { icon: Target, title: "What It\u2019s Actually Worth", description: "Get a defensible valuation range based on real transactions — not listings." },
              { icon: AlertTriangle, title: "Where It Breaks", description: "Identify exactly what kills the deal under pressure." },
              { icon: BarChart3, title: "How It Compares", description: "Benchmark against real closed deals in your industry." },
              { icon: FileText, title: "What a Lender Will See", description: "Export a clean, structured view for financing conversations." },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div
                  key={i}
                  className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 transition-all duration-300 hover:border-cyan-400/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10"
                >
                  <div className="w-12 h-12 mb-5 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2.5 leading-tight">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-snug">{item.description}</p>
                </div>
              )
            })}
          </div>

          <p className="text-center text-base sm:text-lg text-slate-300 mt-14 max-w-3xl mx-auto leading-relaxed">
            This is the difference between <span className="text-slate-500">liking a deal</span> and{" "}
            <span className="text-emerald-400 font-semibold">knowing if it works.</span>
          </p>
        </div>
      </section>

      {/* SAMPLE ANALYSIS */}
      <section className="py-24 bg-slate-900/50 border-t border-slate-800 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <AccentBar />
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-4">
              What this deal looks like <span className="text-emerald-500">after real underwriting</span>
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              Seller-reported numbers rarely survive scrutiny. Here&rsquo;s what actually happens.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center max-w-6xl mx-auto">
            <div className="relative">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                Sample Output &mdash; Specialty Trade Business
              </div>
              <div className="relative">
                <div className="absolute -inset-8 lg:-inset-10">
                  <DottedBackdrop opacity={0.2} />
                </div>
                <GradientBlob variant="subtle" className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                <div className="relative">
                  <TabletFrame
                    src="/buyer-dash-home2.png"
                    alt="AcquiFlow buyer dashboard showing pressure-tested deal analysis"
                    aspectRatio="4/3"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic mt-4 text-center relative">
                Actual AcquiFlow output (simplified)
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-7 lg:p-8 flex flex-col shadow-xl shadow-black/30">
              <h3 className="text-xl font-bold text-white mb-1 leading-tight">Pressure-test results</h3>
              <p className="text-xs uppercase tracking-wider text-emerald-400/70 font-semibold mb-6">
                Findings after underwriting
              </p>
              <ul className="space-y-3.5 mb-6 flex-1">
                {[
                  "Adjusted SDE drops from $780K \u2192 $640K",
                  "DSCR just above lender threshold (1.28x)",
                  "Valuation misaligned (overpriced vs comps)",
                  "Deal fails under conservative stress scenarios",
                  "Requires renegotiation before LOI",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-5" />
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold mb-1">
                      Recommended Action
                    </div>
                    <div className="text-base font-bold text-amber-100 leading-tight">
                      Renegotiate or walk away
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                <Link href="/deal-reality-check">
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold text-base px-6 py-5 shadow-lg shadow-cyan-500/20"
                  >
                    Analyze Your Own Deal
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowSampleModal(true)}
                  className="w-full text-center text-xs text-slate-400 hover:text-cyan-400 transition-colors py-1"
                >
                  or explore the full sample analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TESTIMONIALS — PLACEHOLDERS (swap when real ones available)
          ═══════════════════════════════════════════════════════════ */}
      <section className="py-24 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <AccentBar />
            <Badge className="bg-slate-700/40 text-slate-300 border-slate-600 mb-5">
              Trusted by Acquisition Buyers
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              What buyers say about <span className="text-cyan-400">AcquiFlow</span>
            </h2>
          </div>

          {/*
            ════════════════════════════════════════════════════════
            PLACEHOLDER TESTIMONIALS
            Replace quote, name, title, company, and initials when real ones available.
            ════════════════════════════════════════════════════════
          */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                quote: "AcquiFlow caught a $180K add-back issue our broker glossed over. The deal looked great on paper, but it didn't survive their pressure test. Saved us from a bad acquisition.",
                name: "Jake Monroe",
                title: "Self-Funded Searcher",
                company: "Tile & Stone Works Inc",
                initials: "JM",
              },
              {
                quote: "I evaluate 30+ deals a month. AcquiFlow lets me kill weak deals in 10 minutes instead of two weeks of broken diligence cycles. It's become my pre-LOI filter.",
                name: "Scott Keller",
                title: "Independent Sponsor",
                company: "Keller Holdings Co.",
                initials: "SK",
              },
              {
                quote: "The benchmarking against real closed transactions is what sold me. Listing-price comps were leading me astray. Now I have a defensible valuation range for every deal.",
                name: "Rita Thompson",
                title: "ETA / Acquisition Entrepreneur",
                company: "Thompson Advisory & Accounting LLP",
                initials: "RT",
              },
            ].map((t, i) => (
              <div
                key={i}
                className="bg-slate-900/40 border border-slate-800 rounded-xl p-7 flex flex-col transition-all duration-300 hover:border-cyan-400/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10"
              >
                <Quote className="w-7 h-7 text-cyan-400/50 mb-4" />
                <p className="text-sm text-slate-300 leading-relaxed flex-1 mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                  {/* PLACEHOLDER avatar — swap for <Image> when headshots available */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-slate-300">{t.initials}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white leading-tight">{t.name}</div>
                    <div className="text-xs text-slate-400 leading-tight mt-0.5">
                      {t.title}
                      {t.company && (
                        <>
                          {" · "}
                          <span className="text-slate-500">{t.company}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust logo strip — PLACEHOLDER */}
          <div className="mt-16 pt-12 border-t border-slate-800/50">
            <p className="text-center text-xs uppercase tracking-widest text-slate-500 font-semibold mb-8">
              Methodology Validated By
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-50">
              {/* PLACEHOLDER — replace with <Image> logos when available */}
              {["[Lender Logo]", "[CPA Firm Logo]", "[M&A Advisory]", "[Search Network]"].map((label, i) => (
                <div
                  key={i}
                  className="text-slate-500 text-sm font-mono border border-dashed border-slate-700 rounded px-4 py-2"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <AccentBar />
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-4">
              Start with AcquiFlow —{" "}
              <span className="text-emerald-400">bring in expert underwriting when the deal gets serious</span>
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              Most deals don&rsquo;t justify full diligence. Start with data — go deeper only when it holds up.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
            <Card className="bg-slate-800/50 border-slate-700 transition-all duration-300 hover:border-cyan-500/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10">
              <CardContent className="p-8 flex flex-col h-full">
                <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 mb-4 self-start">Platform</Badge>
                <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                  Screen deals before you waste time or money
                </h3>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-3 mb-1">
                  Most buyers use this to evaluate 10–50 deals/month
                </p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">Starting at $49</span>
                  <span className="text-slate-400 ml-2 text-base">/ month</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "See true cash flow after add-back scrutiny",
                    "Know if the deal survives SBA financing",
                    "Benchmark against real closed transactions",
                    "Identify risk before LOI or diligence",
                    "Save & compare deals side-by-side",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300 leading-snug">
                      <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/deal-reality-check">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/20">
                    Analyze Your First Deal
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <div className="hidden lg:flex flex-col items-center justify-center px-2">
              <div className="h-16 w-px bg-gradient-to-b from-cyan-500/40 via-slate-700 to-transparent" />
              <div className="my-3 px-3 py-2 rounded-full bg-slate-900 border border-slate-700">
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="h-16 w-px bg-gradient-to-b from-transparent via-slate-700 to-emerald-500/40" />
            </div>

            <div className="flex lg:hidden items-center justify-center py-2">
              <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/40 via-slate-700 to-transparent" />
              <div className="mx-3 px-3 py-2 rounded-full bg-slate-900 border border-slate-700">
                <ArrowRight className="w-4 h-4 text-emerald-400 rotate-90" />
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-emerald-500/40" />
            </div>

            <Card className="bg-slate-800/50 border-emerald-500/30 transition-all duration-300 hover:border-emerald-500/60 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/15">
              <CardContent className="p-8 flex flex-col h-full">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 mb-4 self-start">
                  Advisory
                </Badge>
                <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                  Full underwriting when the deal is real
                </h3>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-3 mb-1">
                  Used when you&rsquo;re preparing to submit an LOI or secure financing
                </p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">$1,500</span>
                  <span className="text-slate-400 ml-2 text-base">starting</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "Full deal underwriting & risk memo",
                    "Custom financial modeling + scenario analysis",
                    "Tax-aware structuring (asset vs stock)",
                    "Lender-ready deal package",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300 leading-snug">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/acquisitions">
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20">
                    Request Full Underwriting
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-sm text-slate-400 mt-10 max-w-3xl mx-auto leading-relaxed">
            Built by <span className="text-slate-200 font-medium">CPAs and M&amp;A professionals.</span> Designed
            for real SMB deals <span className="text-slate-300 font-mono">($300K–$10M).</span>
          </p>
          <p className="text-center text-xs uppercase tracking-wider text-emerald-400/70 font-semibold mt-2">
            Start with the platform · Escalate when needed
          </p>
        </div>
      </section>

      {/* SECURITY STRIP */}
      <section className="py-12 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-500" />
                <span className="text-slate-400 text-sm">Your data is protected with bank-level encryption</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                {["256-bit encryption", "SOC 2 compliant", "100% data ownership"].map((item, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tight">
            Stop guessing. Start making data-driven acquisition decisions.
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Know if a deal is worth buying — before you commit capital.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/deal-reality-check">
              <Button
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold px-10 py-6 text-lg shadow-lg shadow-cyan-500/20"
              >
                Analyze Your First Deal
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowSampleModal(true)}
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-8 py-6 text-lg bg-transparent"
            >
              See a Sample Analysis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      <PreLoiFaq />

      {/* COMPLIANCE FOOTER */}
      <section className="py-8 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <p className="text-center text-slate-500 text-xs max-w-3xl mx-auto">
            NexTax.AI provides financial analysis tools and educational content. This is not legal, tax, or
            investment advice. Consult qualified professionals before making business decisions. All transaction
            data used for benchmarking is anonymized and aggregated.
          </p>
        </div>
      </section>

      {showSampleModal && (
        <SampleMemoPreviewModal
          onClose={() => setShowSampleModal(false)}
          onAnalyzeDeal={() => {
            setShowSampleModal(false)
            router.push("/buyer-dashboard")
          }}
          onUpgrade={() => {
            setShowSampleModal(false)
            router.push("/pricing")
          }}
        />
      )}
    </div>
  )
}
