// components/site-chrome-gate.tsx
// Hides global site chrome (Navigation, Footer) on self-contained partner
// routes so co-branded pages read as one cohesive surface instead of a
// partner page stapled into the main site. Add future partner routes here.

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const CHROMELESS_ROUTES = ["/smbdealhunter"];

export default function SiteChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const chromeless = CHROMELESS_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (chromeless) return null;
  return <>{children}</>;
}
