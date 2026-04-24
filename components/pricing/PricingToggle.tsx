"use client"

// components/pricing/PricingToggle.tsx
//
// Segmented pill control for switching between Acquisitions and Formation
// pricing views. URL-persisted (?view=formation) for deep-linking + back button.
// Brand-matched emerald for active state.

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Building2, Briefcase } from "lucide-react"

export type PricingView = "acquisitions" | "formation"

export function PricingToggle({
  view,
}: {
  view: PricingView
}) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const setView = (next: PricingView) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    if (next === "acquisitions") {
      params.delete("view")
    } else {
      params.set("view", next)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className="flex justify-center pt-8 pb-4">
      <div
        role="tablist"
        aria-label="Pricing view"
        className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/50 p-1"
      >
        <button
          role="tab"
          aria-selected={view === "acquisitions"}
          onClick={() => setView("acquisitions")}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all
            ${view === "acquisitions"
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              : "text-slate-400 hover:text-slate-200"
            }
          `}
        >
          <Briefcase className="w-4 h-4" />
          Acquisitions
        </button>
        <button
          role="tab"
          aria-selected={view === "formation"}
          onClick={() => setView("formation")}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all
            ${view === "formation"
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              : "text-slate-400 hover:text-slate-200"
            }
          `}
        >
          <Building2 className="w-4 h-4" />
          Formation
        </button>
      </div>
    </div>
  )
}

export default PricingToggle
