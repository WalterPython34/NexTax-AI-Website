// app/sba-checker/page.tsx
// Thin wrapper: the original Reddit-facing checker. Behavior is unchanged:
// email gate on, UTM/referrer lead capture intact. All logic lives in the
// shared component so /smbdealhunter never forks from this page.

import SbaChecker from "@/components/SbaChecker";

export default function SbaCheckerPage() {
  return (
    <>
      <SbaChecker />
      {/* SBA Deal Check entity schema: free screening tool published by
          NexTax.AI, part of the AcquiFlow acquisition-intelligence cluster */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "@id": "https://www.nextax.ai/sba-checker/#webapp",
            name: "SBA Deal Check",
            url: "https://www.nextax.ai/sba-checker",
            applicationCategory: "BusinessApplication",
            applicationSubCategory: "SBA Loan Readiness Screening",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            description:
              "Free 1.25x DSCR underwriting screen for SMB acquisitions from NexTax.AI. Screens any deal against the debt-service coverage an SBA lender looks for, using benchmarked owner replacement cost and a conservative add-back haircut.",
            publisher: {
              "@type": "Organization",
              "@id": "https://www.nextax.ai/#organization",
              name: "NexTax.AI",
            },
            about: [
              "SBA Loan Readiness",
              "Debt Service Coverage Ratio",
              "Business Acquisition",
              "Pre-LOI Due Diligence",
            ],
          }),
        }}
      />
    </>
  );
}
