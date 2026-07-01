import type { VerdictZone } from "./sba-engine";

// Locked verdict headlines. Single source of truth for the payload, the breakdown,
// and (later) the page and OG image, so wording never drifts across surfaces.
export const ZONE_HEADLINE: Record<VerdictZone, string> = {
  PASS: "Likely clears the 1.25\u00d7 lender screen",
  BUBBLE: "Depends on add-back support",
  FAIL: "Likely fails the 1.25\u00d7 lender screen",
};
