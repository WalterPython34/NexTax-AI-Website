// app/acquiflow-intel/_lib/marketFacts.ts
// ─────────────────────────────────────────────────────────────────────────────
// Backward-compatibility re-export shim (Patch C).
//
// The canonical implementation of readMarketFacts now lives at
// lib/acquiflow/marketFacts.ts so it can be consumed by BOTH the Intel memo
// (committee route) and the workspace PDF report route. This file preserves
// the original import path so existing importers continue to resolve without
// modification.
//
// Prefer the canonical path for new code:
//   import { readMarketFacts } from "@/lib/acquiflow/marketFacts";
//
// This shim should be removed once all importers in app/acquiflow-intel
// have been updated to the canonical path. Tracking as a follow-up cleanup.
// ─────────────────────────────────────────────────────────────────────────────
export { readMarketFacts } from "@/lib/acquiflow/marketFacts";
export type { MarketFacts } from "@/lib/acquiflow/marketFacts";
