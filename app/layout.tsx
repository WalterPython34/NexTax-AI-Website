import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Navigation from "@/components/navigation"
import { Footer } from "@/components/footer"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NexTax.AI - AI Copilot for Modern Tax Teams",
  description:
    "Automate entity formation, streamline tax workflows, and launch confidently with AI-powered services for startups and modern tax teams.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Navigation />
        <main>{children}</main>
        <Footer />
        <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" />
        {/* Add Google Analytics */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-5VHGTSGCCN" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5VHGTSGCCN');
          `}
        </Script>
      </body>
    </html>
  )
}
