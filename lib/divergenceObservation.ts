// lib/divergenceObservation.ts
// E3 — Divergence observation computation (normalization v2)
//
// Computes OBSERVATIONS only, per the locked principles:
//   - Never adjusts earnings. usable_sde remains reported SDE everywhere.
//   - Nothing consumes these outputs until E4 (single-channel rule: E4 may
//     read them only via divergence → confidence grade → conviction cap).
//   - Reads industry_margin_reference (populated by refresh functions).
//   - Never throws: any failure returns null; the caller logs a 'divergence'
//    pipeline_events entry and the save proceeds.
//
// Approved computation rules (calibration memo + E3 spec, 2026-07-08):
//   - Reference: industry listing distribution when n >= 30, else '_pooled'
//     listing distribution with quality capped at C. Keyed on deal_runs.industry.
//   - Bands (high side only): > p97 EXTREME · > p90 HIGH · > p75 MODERATE · else LOW
//   - Closed lens eligible only when closed n >= 30 AND n_recent >= 30.
//   - Quality: A = listing n>=30 + eligible closed lens agreeing within one
//     band · B = listing n>=30 otherwise · C = pooled fallback.
//   - low_margin_flag = stated margin below listing reference p10.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface MarginReferenceRow {
  industry_key: string;
  source: "listing" | "closed";
  n: number;
  n_recent: number | null;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  p97: number | null;
}

export type DivergenceBand = "LOW" | "MODERATE" | "HIGH" | "EXTREME";

export interface DivergenceObservation {
  normalization_version: "v2";
  peer_margin_percentile: number;        // 0–1, interpolated across stored anchors
  divergence_band: DivergenceBand;
  industry_reference_sde: number;        // revenue × selected reference p50 — reference point, never a conclusion
  reference_source_quality: "A" | "B" | "C";
  reference_n: number;
  closed_lens_band: DivergenceBand | null;
  low_margin_flag: boolean;
}

const MIN_REFERENCE_N = 30;

/** Fetch the reference rows needed for one deal: the industry's rows plus '_pooled'. */
export async function loadMarginReferences(
  supabaseAdmin: SupabaseClient,
  industry: string
): Promise<MarginReferenceRow[]> {
  const { data, error } = await supabaseAdmin
    .from("industry_margin_reference")
    .select("industry_key, source, n, n_recent, p10, p25, p50, p75, p90, p97")
    .in("industry_key", [industry, "_pooled"]);
  if (error) throw new Error(`industry_margin_reference read failed: ${error.message}`);
  return (data ?? []) as MarginReferenceRow[];
}

function bandFor(margin: number, ref: MarginReferenceRow): DivergenceBand {
  if (ref.p97 != null && margin > ref.p97) return "EXTREME";
  if (ref.p90 != null && margin > ref.p90) return "HIGH";
  if (ref.p75 != null && margin > ref.p75) return "MODERATE";
  return "LOW";
}

const BAND_ORDER: DivergenceBand[] = ["LOW", "MODERATE", "HIGH", "EXTREME"];

/** Piecewise-linear percentile across stored anchors; clamped to [0.01, 0.99]. */
function interpolatePercentile(margin: number, ref: MarginReferenceRow): number {
  const anchors: Array<[number, number]> = [];
  if (ref.p10 != null) anchors.push([ref.p10, 0.10]);
  if (ref.p25 != null) anchors.push([ref.p25, 0.25]);
  if (ref.p50 != null) anchors.push([ref.p50, 0.50]);
  if (ref.p75 != null) anchors.push([ref.p75, 0.75]);
  if (ref.p90 != null) anchors.push([ref.p90, 0.90]);
  if (ref.p97 != null) anchors.push([ref.p97, 0.97]);
  if (anchors.length < 2) return 0.5; // degenerate reference; band logic still valid

  if (margin <= anchors[0][0]) {
    // Linear from the origin to the first anchor.
    const [m0, q0] = anchors[0];
    return clamp((margin / m0) * q0);
  }
  for (let i = 0; i < anchors.length - 1; i++) {
    const [m1, q1] = anchors[i];
    const [m2, q2] = anchors[i + 1];
    if (margin <= m2) {
      if (m2 === m1) return clamp(q2);
      return clamp(q1 + ((margin - m1) / (m2 - m1)) * (q2 - q1));
    }
  }
  return clamp(0.99); // beyond p97
}

function clamp(x: number): number {
  return Math.min(0.99, Math.max(0.01, Math.round(x * 10000) / 10000));
}

/**
 * Pure computation. Returns null when inputs or references are insufficient
 * (caller records a 'skipped' pipeline event). Never throws.
 */
export function computeDivergenceObservation(
  input: { revenue: number; sde: number; industry: string },
  references: MarginReferenceRow[]
): DivergenceObservation | null {
  try {
    const { revenue, sde, industry } = input;
    if (!isFinite(revenue) || revenue <= 0 || !isFinite(sde) || sde <= 0) return null;
    const margin = sde / revenue;
    if (margin < 0.01 || margin > 0.95) return null; // outside plausibility window

    const listingInd = references.find(r => r.source === "listing" && r.industry_key === industry);
    const listingPooled = references.find(r => r.source === "listing" && r.industry_key === "_pooled");
    const closedInd = references.find(r => r.source === "closed" && r.industry_key === industry);

    // Reference selection per operating rule 1.
    let ref: MarginReferenceRow | undefined;
    let pooledFallback = false;
    if (listingInd && listingInd.n >= MIN_REFERENCE_N) {
      ref = listingInd;
    } else if (listingPooled && listingPooled.n >= MIN_REFERENCE_N) {
      ref = listingPooled;
      pooledFallback = true;
    }
    if (!ref || ref.p50 == null) return null; // reference table empty/degenerate → skipped

    const band = bandFor(margin, ref);
    const percentile = interpolatePercentile(margin, ref);

    // Closed lens: eligibility per operating rule 4.
    let closedBand: DivergenceBand | null = null;
    if (
      closedInd &&
      closedInd.n >= MIN_REFERENCE_N &&
      (closedInd.n_recent ?? 0) >= MIN_REFERENCE_N
    ) {
      closedBand = bandFor(margin, closedInd);
    }

    // Quality grade per operating rule 5.
    let quality: "A" | "B" | "C";
    if (pooledFallback) {
      quality = "C";
    } else if (
      closedBand !== null &&
      Math.abs(BAND_ORDER.indexOf(band) - BAND_ORDER.indexOf(closedBand)) <= 1
    ) {
      quality = "A";
    } else {
      quality = "B";
    }

    return {
      normalization_version: "v2",
      peer_margin_percentile: percentile,
      divergence_band: band,
      industry_reference_sde: Math.round(revenue * ref.p50),
      reference_source_quality: quality,
      reference_n: ref.n,
      closed_lens_band: closedBand,
      low_margin_flag: ref.p10 != null ? margin < ref.p10 : false,
    };
  } catch {
    return null; // observation must never block or corrupt a save
  }
}
