// app/fractional-cfo/page.tsx
//
// Route for the Fractional CFO landing page. The component lives at
// components/pricing/FractionalCfoPage.tsx; this file mounts it with the
// site's dark gradient background and page metadata for SEO.
import type { Metadata } from "next"
import { FractionalCfoPage } from "@/components/pricing/FractionalCfoPage"

export const metadata: Metadata = {
  title: "Fractional CFO Services | NexTax.AI",
  description:
    "Deal-grade fractional CFO services for small business owners — monthly close oversight, cash-flow forecasting, lender-ready reporting, and an annual valuation pulse. Led by former Big 4 & private equity professionals. Michigan-based, serving owners nationwide.",
}

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-4">
      <FractionalCfoPage />
    </div>
  )
}
