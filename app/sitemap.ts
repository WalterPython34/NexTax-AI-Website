import type { MetadataRoute } from "next"

const BASE = "https://www.nextax.ai"

// Key public URLs. Add new resource and guide pages here as they publish.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-22")
  const urls = [
    "/",
    "/acquiflow",
    "/deal-reality-check",
    "/sba-checker",
    "/resources",
    "/resources/pre-loi-smb-acquisition-checklist",
    "/resources/tax-first-launch-guide",
    "/resources/tax-planning-checklist",
    "/resources/startup-calculator",
    "/resources/guides/pre-loi-diligence-smb-acquisitions",
    "/resources/guides/why-smb-deals-fall-apart",
    "/resources/guides/asset-vs-stock-sales-tax",
    "/resources/guides/llc-vs-corporation-complete-guide",
    "/resources/guides/s-corp-election-definitive-guide",
    "/resources/guides/quarterly-estimated-tax-guide",
    "/resources/guides/maximizing-startup-tax-deductions",
    "/resources/guides/multi-state-compliance-nexus-guide",
    "/resources/guides/tax-planning-high-growth-companies",
    "/resources/guides/fund-your-startup",
    "/resources/guides/do-i-need-a-business-plan",
    "/resources/guides/validate-your-idea",
    "/resources/guides/1099-k-rules-2026",
    "/resources/guides/llc-vs-sole-prop-vs-s-corp-ecommerce",
  ]
  return urls.map((path) => ({ url: `${BASE}${path}`, lastModified }))
}
