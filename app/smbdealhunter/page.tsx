// app/smbdealhunter/page.tsx
// Partner route: SMB Deal Hunter member version of the SBA Deal Check.
//
// "use client" is REQUIRED here: SBA_PARTNERS is a plain object exported from
// a client module. A server component importing it receives a client
// reference, and property access on that reference silently yields undefined,
// which renders the no-partner (dark, gated) version. Making this page a
// client component gives it the real object. Metadata lives in layout.tsx,
// which stays a server component, so nothing is lost.

"use client";

import SbaChecker, { SBA_PARTNERS } from "@/components/SbaChecker";

export default function SmbDealHunterCheckerPage() {
  return <SbaChecker partner={SBA_PARTNERS.smbdealhunter} />;
}
