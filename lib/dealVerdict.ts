// lib/dealVerdict.ts
// E4 Phase 1 — Server-side verdict derivation (score_version v2.0)
//
// Ported from buyer-dashboard dealVerdict() (7/10/26 version) so the SERVER
// owns the final verdict (D2). Two deliberate differences from the client:
//
//   1. The numeric trust gates (trust < 45 → manual_review, trust < 60 →
//      investigate ceiling) are RETIRED here. Those gates consumed
//      normalization_trust_score, which mixes margin-driven deductions with
//      integrity checks — a parallel margin channel the locked single-channel
//      architecture prohibits. Their replacement is the confidence-grade
//      conviction cap (lib/investigationEngine.ts). Historical note: those
//      client gates were dormant until 2026-07-08 (trust was null → ??100)
//      and were never a deliberately shipped behavior.
//
//   2. The binary manual_review_required flag IS still honored — it fires on
//      hard data-integrity failures (sanity-rule violations), a legitimately
//      separate signal from margin divergence.
//
// Thresholds below are byte-faithful to the deployed client function,
// including the ≥82 High Conviction gate and the reprice/outside split.

import type { Verdict } from "@/lib/investigationEngine";

export interface VerdictInputs {
  gap_pct: number;                 // (asking - fair_value) / fair_value * 100
  dscr: number;
  overall_score: number;
  risk_level: string | null;
  manual_review_required: boolean; // data-integrity flag only (NOT trust score)
}

export function deriveVerdict(d: VerdictInputs): Verdict {
  const gp = d.gap_pct ?? 0;
  const rl = (d.risk_level || "").toLowerCase();
  const isHighRisk = rl === "high" || rl === "critical";

  // Data-integrity manual review (binary flag; numeric trust gates retired)
  if (d.manual_review_required) return "manual_review";

  // 🔥 High Conviction — gate at ≥82
  if (gp <= -30 && d.dscr >= 2.5 && d.overall_score >= 82 && rl === "low") {
    return "high_conviction";
  }
  // 🔴 Split Pass — gap-driven vs structural
  if (gp >= 15 && d.dscr >= 1.25 && !isHighRisk) {
    return "reprice_required";
  }
  if (d.dscr < 1.25 || isHighRisk) {
    return "outside_range";
  }
  // 🟢 Pursue
  if ((gp <= -20 && d.dscr >= 1.75) || (d.overall_score >= 80 && gp <= -10)) {
    return "pursue";
  }
  // 🟡 Investigate
  return "investigate";
}
