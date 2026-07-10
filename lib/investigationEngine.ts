// lib/investigationEngine.ts
// E4 Phase 1 — Confidence grade + conviction cap (score_version v2.0)
//
// THE single channel (locked architecture):
//   divergence observations → confidence grade → conviction cap
// The cap consumes ONLY the grade. Nothing else may read divergence to
// modify a verdict, score input, or ceiling. (CLAUDE.md governance rule.)
//
// Calibration (n=1,396, 2026-07-09): grade distribution HIGH 61% /
// MODERATE 25% / LOW 10% / UNVERIFIED 4%. This ceiling table demotes 13%
// of current High Conviction deals, concentrated in LOW/UNVERIFIED grades.
// Capping at MODERATE was evaluated and rejected (38% demotion, penalizes
// top-quartile margins).
//
// Pure functions. No I/O. Never throws.

export type ConfidenceGrade = "HIGH" | "MODERATE" | "LOW" | "UNVERIFIED";
export type DivergenceBand = "LOW" | "MODERATE" | "HIGH" | "EXTREME";
export type ReferenceQuality = "A" | "B" | "C";
// Full production vocabulary (buyer-dashboard DealVerdict). "pass" retained
// for legacy v1 rows; live derivation now splits it into reprice_required /
// outside_range.
export type Verdict =
  | "high_conviction" | "pursue" | "investigate"
  | "reprice_required" | "outside_range" | "manual_review" | "pass";

const BAND_ORDER: DivergenceBand[] = ["LOW", "MODERATE", "HIGH", "EXTREME"];

// Positive ladder only — the cap can lower a verdict along this ladder.
// Terminal negative verdicts (reprice_required, outside_range, manual_review,
// legacy pass) are NOT on the ladder: they pass through the cap untouched,
// because "capping" an already-negative verdict is meaningless.
const LADDER_RANK: Partial<Record<Verdict, number>> = {
  investigate: 1,
  pursue: 2,
  high_conviction: 3,
};

export interface GradeInputs {
  divergenceBand: DivergenceBand | null;   // null = observation skipped (plausibility window / no reference)
  referenceQuality: ReferenceQuality | null;
  closedLensBand: DivergenceBand | null;   // null = closed lens ineligible
}

/**
 * D1 mapping. Returns null when no divergence observation exists — deals
 * outside the plausibility window carry no v2 grade and receive no cap
 * (score_version is still stamped v2.0; the absence is explainable via
 * the 'divergence: skipped' pipeline event).
 *
 * low_margin_flag deliberately absent: it never affects the grade
 * (no overstatement risk); it generates an investigation item only (D4).
 */
export function deriveConfidenceGrade(inputs: GradeInputs): ConfidenceGrade | null {
  const { divergenceBand: band, referenceQuality: q, closedLensBand: closed } = inputs;
  if (!band || !q) return null;

  // Lens disagreement > 1 band → UNVERIFIED regardless of band (D1, fixture 7)
  if (
    closed !== null &&
    Math.abs(BAND_ORDER.indexOf(band) - BAND_ORDER.indexOf(closed)) > 1
  ) {
    return "UNVERIFIED";
  }

  if (band === "EXTREME") return "UNVERIFIED";
  if (band === "HIGH") return "LOW";
  if (band === "MODERATE") return q === "C" ? "LOW" : "MODERATE";
  // band === "LOW"
  return q === "C" ? "MODERATE" : "HIGH";
}

export interface CapResult {
  finalVerdict: Verdict;
  capApplied: boolean;
  ceiling: Verdict | null;                 // null = no cap for this grade
  verificationRequired: boolean;           // UNVERIFIED renders as "Earnings Verification Required"
}

/**
 * D2 ceiling table — consumes confidence grade ONLY:
 *   HIGH / MODERATE → no cap
 *   LOW             → ceiling 'pursue' (High Conviction unavailable)
 *   UNVERIFIED      → ceiling 'investigate' (+ verificationRequired flag;
 *                     rendered as "Investigate — Verify Earnings")
 * The stored verdict enum is unchanged; the "— Verify Earnings" suffix is
 * presentation, composed from verificationRequired at display time.
 * A null grade (no observation) applies no cap.
 */
export function applyConvictionCap(
  computedVerdict: Verdict,
  grade: ConfidenceGrade | null
): CapResult {
  const ceiling: Verdict | null =
    grade === "LOW" ? "pursue" :
    grade === "UNVERIFIED" ? "investigate" :
    null;

  const verdictRank = LADDER_RANK[computedVerdict];
  const ceilingRank = ceiling ? LADDER_RANK[ceiling] : undefined;

  // No ceiling for this grade, OR the verdict is a terminal negative
  // (not on the positive ladder) → pass through untouched.
  if (ceiling === null || verdictRank === undefined || ceilingRank === undefined) {
    return {
      finalVerdict: computedVerdict,
      capApplied: false,
      ceiling,
      verificationRequired: grade === "UNVERIFIED",
    };
  }

  const capped = verdictRank > ceilingRank;
  return {
    finalVerdict: capped ? ceiling : computedVerdict,
    capApplied: capped,
    ceiling,
    verificationRequired: grade === "UNVERIFIED",
  };
}
