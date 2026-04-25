"use client"

// app/how-it-works/page.tsx
//
// Standalone marketing landing page for the listing → memo transformation.
// Linked from nextax.ai homepage button + /pricing page CTA.
//
// Wraps ListingTransformationPreview with:
//   - page-level header / framing copy
//   - SampleMemoPreviewModal opened inline via "View Full Investment Memo"
//   - "Analyze a Real Deal" routes to /buyer-dashboard

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ListingTransformationPreview } from "@/components/ListingTransformationPreview"
import { SampleMemoPreviewModal } from "@/components/SampleMemoPreviewModal"

export default function HowItWorksPage() {
  const router = useRouter()
  const [memoOpen, setMemoOpen] = useState(false)

  const handleAnalyze = () => {
    // Route into the actual product
    router.push("/buyer-dashboard")
  }

  const handleViewMemo = () => {
    // Open the deep-dive sample memo overlay — no navigation
    setMemoOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-4">
      {/* ─── Top framing — primary headline above the component ───────── */}
      <section className="pt-14 sm:pt-20 pb-2">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-5">
            From Listing Guesswork to{" "}
            <span className="text-emerald-400">Investment Decision</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            See how AcquiFlow transforms a broker listing into lender-ready analysis in minutes.
          </p>
        </div>
      </section>

      {/* ─── Transformation comparison ────────────────────────────────── */}
      <ListingTransformationPreview
        onAnalyzeDeal={handleAnalyze}
        onViewMemo={handleViewMemo}
        className="py-14 sm:py-20"
      />

      {/* ─── Sample memo overlay — opens inline, doesn't navigate ────── */}
      {memoOpen && (
        <SampleMemoPreviewModal
          onClose={() => setMemoOpen(false)}
          onAnalyzeDeal={() => {
            setMemoOpen(false)
            router.push("/buyer-dashboard")
          }}
          onUpgrade={() => {
            setMemoOpen(false)
            router.push("/pricing")
          }}
        />
      )}
    </div>
  )
}
