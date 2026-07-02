import type { Metadata } from "next";
import type { ReactNode } from "react";

const TITLE = "SBA Deal Check — will this deal clear a lender screen?";
const DESCRIPTION =
  "Free deterministic 1.25\u00d7 DSCR underwriting screen for SMB acquisitions \u2014 the first test an SBA lender runs, using BLS-benchmarked owner replacement cost.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/api/sba-check/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/api/sba-check/og"],
  },
};

export default function SbaCheckerLayout({ children }: { children: ReactNode }) {
  return children;
}
