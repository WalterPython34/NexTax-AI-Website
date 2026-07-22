import type React from "react"
import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google"
import "./globals.css"
import Navigation from "@/components/navigation"
import { Footer } from "@/components/footer"
import SiteChromeGate from "@/components/site-chrome-gate"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", })

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-plus-jakarta",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "NexTax.AI | SMB Acquisition Intelligence & Underwriting",
  description:
    "Analyze deals, compare against real transactions, and understand the market in just minutes.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {/* Site chrome (nav + footer) hides on self-contained partner routes */}
        <SiteChromeGate>
          <Navigation />
        </SiteChromeGate>
        <main>{children}</main>
        <SiteChromeGate>
          <Footer />
        </SiteChromeGate>
        {/* Sitewide Organization entity: every page carries the same
            NexTax.AI -> AcquiFlow -> acquisition-intelligence identity that
            page-level SoftwareApplication/Article schema references by @id */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://www.nextax.ai/#organization",
              name: "NexTax.AI",
              url: "https://www.nextax.ai/",
              description:
                "NexTax.AI develops deal-intelligence tools for SMB acquisition buyers, including AcquiFlow, a buyer deal-intelligence platform for pre-LOI screening, SBA loan readiness, and financial analysis.",
              knowsAbout: [
                "SMB Acquisition Intelligence",
                "Pre-LOI Due Diligence",
                "SBA Loan Readiness",
                "Financial Ratio Analysis",
                "Business Acquisition",
              ],
            }),
          }}
        />
        <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" />
        {/* Add Google Analytics */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-5VHGTSGCCN" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5VHGTSGCCN');
            gtag('config', 'AW-17878724249');
          `}
        </Script>
      </body>
    </html>
  )
}
