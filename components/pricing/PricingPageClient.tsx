"use client"
// components/pricing/PricingPageClient.tsx
//
// Client wrapper for /pricing — reads ?view= and renders the right view.
// Default (no param)  → ServicesPricing   (the new all-services overview)
// ?view=formation     → FormationPricing  (extracted from the old page, unchanged)
//
// The dark gradient wrapper lives HERE so ServicesPricing gets the same site
// background AcquisitionsPricing used to get from the old page shell.
// (FormationPricing carries its own identical gradient internally — harmless.)
import { useSearchParams } from "next/navigation"
import { PricingToggle, type PricingView } from "@/components/pricing/PricingToggle"
import { ServicesPricing } from "@/components/pricing/ServicesPricing"
import { FormationPricing } from "@/components/pricing/FormationPricing"

export function PricingPageClient() {
  const searchParams = useSearchParams()
  const view: PricingView =
    searchParams?.get("view") === "formation" ? "formation" : "services"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-4">
      <PricingToggle view={view} />
      {view === "formation" ? <FormationPricing /> : <ServicesPricing />}
    </div>
  )
}

export default PricingPageClient
