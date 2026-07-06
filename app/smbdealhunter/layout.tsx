// app/smbdealhunter/layout.tsx
// Metadata for the SMB Deal Hunter member checker. Reuses the zone-locked OG
// endpoint so shared images cannot be spoofed into different claims.

import type { Metadata } from "next";
import type { ReactNode } from "react";

const TITLE = "SBA Deal Check for SMB Deal Hunter members";
const DESCRIPTION =
  "Free deterministic 1.25\u00d7 DSCR underwriting screen for SMB Deal Hunter members. Full add-back breakdown unlocked, plus member pricing on AcquiFlow.";

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

export default function SmbDealHunterLayout({ children }: { children: ReactNode }) {
  return children;
}
