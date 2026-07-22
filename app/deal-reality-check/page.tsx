import type { Metadata } from "next";
import DealRealityCheck from "@/components/deal-reality-check";

// Server wrapper so the page can carry metadata and entity schema; all tool
// logic lives in the client component.

export const metadata: Metadata = {
  title: "Deal Reality Check — Free SMB Acquisition Screening | NexTax.AI",
  description:
    "Score an acquisition on pricing, debt coverage, and risk, benchmarked against real closed transactions. Free pre-LOI screening from NexTax.AI, makers of AcquiFlow.",
  alternates: { canonical: "https://www.nextax.ai/deal-reality-check" },
};

export default function DealRealityCheckPage() {
  return (
    <>
      <DealRealityCheck />
      {/* Deal Reality Check entity schema: free screening tool published by
          NexTax.AI, part of the AcquiFlow acquisition-intelligence cluster */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "@id": "https://www.nextax.ai/deal-reality-check/#webapp",
            name: "Deal Reality Check",
            url: "https://www.nextax.ai/deal-reality-check",
            applicationCategory: "BusinessApplication",
            applicationSubCategory: "Acquisition Deal Screening",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            description:
              "Free pre-LOI screening tool from NexTax.AI. Scores an SMB acquisition on pricing, debt coverage, and risk, benchmarked against closed transactions, and produces a deal screening memo with a suggested offer range.",
            publisher: {
              "@type": "Organization",
              "@id": "https://www.nextax.ai/#organization",
              name: "NexTax.AI",
            },
            about: [
              "Business Acquisition",
              "SMB Acquisition Intelligence",
              "Business Valuation",
              "Pre-LOI Due Diligence",
              "Financial Ratio Analysis",
            ],
          }),
        }}
      />
    </>
  );
}
