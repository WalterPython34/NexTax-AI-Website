import { Suspense } from "react"
import { PricingPageClient } from "@/components/pricing/PricingPageClient"

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <PricingPageClient />
    </Suspense>
  )
}
