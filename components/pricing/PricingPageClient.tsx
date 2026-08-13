"use client"
// components/pricing/PricingPageClient.tsx
//
// Client wrapper for /pricing — reads ?view= and renders the right view.
// Default (no param)        → ServicesPricing  (the new all-services overview)
// ?view=formation           → FormationPricing (unchanged, still on the toggle)
//
// The old AcquisitionsPricing (AcquiFlow Free/Pro) is NO LONGER rendered here —
// mount it on the /acquiflow route instead (see notes in chat).
import { useSearchParams } from "next/navigation"
import { PricingToggle, type PricingView } from "@/components/pricing/PricingToggle"
import { ServicesPricing } from "@/components/pricing/ServicesPricing"
// TODO: confirm your Formation component's actual name & path:
import { FormationPricing } from "@/components/pricing/FormationPricing"

export function PricingPageClient() {
  const searchParams = useSearchParams()
  const view: PricingView =
    searchParams?.get("view") === "formation" ? "formation" : "services"

  return (
    <>
      <PricingToggle view={view} />
      {view === "formation" ? <FormationPricing /> : <ServicesPricing />}
    </>
  )
}

export default PricingPageClient
