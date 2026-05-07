// =====================================================================
// AcquiFlow — Deal Report API Route
// ---------------------------------------------------------------------
// GET /api/reports/[dealId]
//
// Generates and returns a PDF deal report for the given deal_run.
//
// Auth: requires user to be Pro (plan = 'pro' | 'premium')
// Flow:
//   1. Verify Supabase auth
//   2. Verify user is Pro
//   3. Fetch deal_run row
//   4. Fetch industry benchmarks (DealStats / listings)
//   5. Fetch representative comparables (dealstats_transactions, anonymized)
//   6. Build DealReportInputs and decision layer
//   7. Generate negotiation posture via Sonnet 4.6 (with fallback)
//   8. Fetch latest benchmark snapshot for pages 6-8 (optional)
//   9. Fetch interpretation for page 7's "What this means" (optional, Haiku)
//  10. Fetch committee memo prose for pages 6, 7, 8 (optional, Sonnet 4.6)
//  11. Generate PDF (5, 7, or 8 pages depending on data)
//  12. Return as application/pdf with download disposition
//
// Why posture and committee run sequentially (not parallel):
//   The committee memo's negotiation_leverage section references the posture
//   text directly, preserving voice consistency across pages 1, 5, and 8.
//   This is a deliberate trade — we accept ~5s additional latency to keep
//   the analytical voice cohesive across the whole report.
//
// File path: app/api/reports/[dealId]/route.ts
// =====================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


import {
  DealReportInputs,
  computeDecisionLayer,
  buildFallbackPosture,
} from "@/lib/acquiflow/decision-layer";
import {
  DealReportData,
  ComparableDeal,
  BenchmarkSnapshotForReport,
  CommitteeMemoProse,
  generateDealReportPDF,
} from "@/lib/acquiflow/deal-report-generator";

// Service role client for cross-table reads after auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime    = "nodejs";
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  const { dealId } = params;
  if (!dealId) {
    return NextResponse.json({ error: "Missing dealId" }, { status: 400 });
  }

  // ─── 1. Auth ─────────────────────────────────────────────────────────
 // Auth: user ID passed from authenticated client
  const userId = req.nextUrl.searchParams.get("uid");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } 

  // ─── 2. Verify Pro plan ──────────────────────────────────────────────
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }
  const isPro = profile.plan === "pro" || profile.plan === "premium";
  if (!isPro) {
    return NextResponse.json(
      { error: "Pro subscription required to generate reports" },
      { status: 402 }
    );
  }

  // ─── 3. Fetch deal_run ────────────────────────────────────────────────
  const { data: deal, error: dealError } = await supabaseAdmin
    .from("deal_runs")
    .select("*")
    .eq("id", dealId)
    .single();

  if (dealError || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Optional: verify ownership
  if (deal.user_id && deal.user_id !== userId) {
    return NextResponse.json({ error: "Not authorized for this deal" }, { status: 403 });
  }

  // ─── 4. Fetch industry benchmarks ─────────────────────────────────────
  const { data: benchmark } = await supabaseAdmin
    .from("dealstats_benchmarks")
    .select("multiple_low, multiple_median, multiple_high, sample_size")
    .eq("industry_key", deal.industry)
    .is("size_band",  null)
    .is("state",      null)
    .maybeSingle();

  // Fallback to listing benchmarks if DealStats absent
  let benchLow:    number | null = benchmark?.multiple_low    ?? null;
  let benchMid:    number | null = benchmark?.multiple_median ?? null;
  let benchHigh:   number | null = benchmark?.multiple_high   ?? null;
  let sampleSize:  number | null = benchmark?.sample_size     ?? null;

  if (benchMid === null) {
    const { data: listingBench } = await supabaseAdmin
      .from("industry_listing_benchmarks")
      .select("median_multiple, p25_multiple, p75_multiple, sample_size")
      .eq("industry_key", deal.industry)
      .is("size_band", null)
      .is("state",     null)
      .maybeSingle();
    if (listingBench) {
      benchLow   = listingBench.p25_multiple    ?? null;
      benchMid   = listingBench.median_multiple ?? null;
      benchHigh  = listingBench.p75_multiple    ?? null;
      sampleSize = listingBench.sample_size     ?? null;
    }
  }

  // ─── 5. Fetch representative comparables (anonymized) ─────────────────
  const { data: comparablesRaw } = await supabaseAdmin
    .from("dealstats_transactions")
    .select("industry_key, mvic_price, sde, revenue, sale_year, state")
    .eq("industry_key", deal.industry)
    .not("sde", "is", null)
    .gt("sde", 0)
    .order("sale_year", { ascending: false })
    .limit(20);

  const comparables: ComparableDeal[] = (comparablesRaw ?? [])
    .filter(c => c.sde > 0 && c.mvic_price > 0)
    .slice(0, 4)
    .map(c => ({
      industry_label: humanizeIndustryLabel(deal.industry),
      state:          c.state ?? null,
      revenue:        c.revenue ?? 0,
      sde:            c.sde ?? 0,
      multiple:       round((c.mvic_price ?? 0) / c.sde, 2),
      year:           c.sale_year ?? new Date().getFullYear() - 1,
    }));

  // If we have no comparables (rare), build a synthetic placeholder so the page still renders
  if (comparables.length === 0 && benchMid !== null) {
    comparables.push({
      industry_label: humanizeIndustryLabel(deal.industry),
      state:          null,
      revenue:        Math.round(deal.revenue ?? deal.sde * 4),
      sde:            Math.round(deal.sde ?? 0),
      multiple:       benchMid,
      year:           new Date().getFullYear() - 1,
    });
  }

  // ─── 6. Build DealReportInputs and decision layer ─────────────────────
  const inputs: DealReportInputs = {
    industry:        deal.industry,
    industry_label:  humanizeIndustryLabel(deal.industry),
    revenue:         deal.revenue ?? 0,
    sde:             deal.sde ?? 0,
    reported_sde:    deal.reported_sde ?? null,
    usable_sde:      deal.usable_sde   ?? null,
    asking_price:    deal.asking_price,
    city:            deal.city,
    state:           deal.state,

    debt_percent:    deal.debt_percent  ?? 90,
    interest_rate:   deal.interest_rate ?? 10.75,
    term_years:      deal.term_years    ?? 10,
    monthly_payment: deal.monthly_payment ?? null,
    dscr:            deal.dscr,

    valuation_multiple:     deal.valuation_multiple,
    fair_value:             deal.fair_value,
    fair_value_low:         deal.fair_value_low  ?? null,
    fair_value_high:        deal.fair_value_high ?? null,
    recommended_offer_low:  deal.recommended_offer_low  ?? null,
    recommended_offer_high: deal.recommended_offer_high ?? null,

    overall_score: deal.overall_score,
    risk_level:    deal.risk_level,
    red_flags:     deal.red_flags   ?? [],
    green_flags:   deal.green_flags ?? [],

    benchmark_low:         benchLow,
    benchmark_mid:         benchMid,
    benchmark_high:        benchHigh,
    benchmark_sample_size: sampleSize,

    evidence_profile: deal.evidence_profile ?? null,
  };

  const decision = computeDecisionLayer(inputs);

  // ─── 7. Negotiation posture via Claude Sonnet 4.6 (with fallback) ─────
  // Runs first because its output feeds into the committee memo's
  // negotiation_leverage section. Preserving narrative voice consistency
  // across pages 1, 5, and 8 is worth the sequential cost.
  let posture: string;
  try {
    posture = await generateNegotiationPosture(inputs, decision);
  } catch (err) {
    console.error("Posture generation failed, using fallback:", err);
    posture = buildFallbackPosture(decision.negotiation_posture_inputs);
  }

  // ─── 8. Fetch latest benchmark snapshot (optional, gates pages 6-8) ───
  // When present, the report renders pages 6-8. When absent, the report
  // stays at 5 pages. Best-effort — any failure logs and falls through.
  let benchmarkSnapshot: BenchmarkSnapshotForReport | undefined = undefined;
  let interpretation: string[] | undefined = undefined;

  try {
    const { data: snapRow, error: snapError } = await supabaseAdmin
      .from("benchmark_snapshots")
      .select("*")
      .eq("deal_id", dealId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapError) {
      console.warn("[reports] snapshot fetch error (continuing 5-page):", snapError);
    } else if (snapRow) {
      benchmarkSnapshot = {
        industry_name:           snapRow.industry,
        naics_code:              snapRow.naics_code,
        benchmark_year:          snapRow.analysis_outputs?.benchmark_year ?? "2025-26",
        tension_indicator:       snapRow.analysis_outputs?.tension_indicator ?? null,
        financial_position:      snapRow.benchmark_results ?? [],
        risk_flags:              snapRow.analysis_outputs?.risk_flags ?? [],
        strengths:               snapRow.analysis_outputs?.strengths ?? [],
        interaction_insights:    snapRow.analysis_outputs?.interaction_insights ?? [],
        sensitivity:             snapRow.analysis_outputs?.sensitivity ?? undefined,
        deal_structure:          snapRow.deal_structure ?? undefined,
        financial_score:         snapRow.analysis_outputs?.financial_score ?? null,
        score_drivers:           snapRow.analysis_outputs?.score_drivers ?? [],
        score_risk_dependencies: snapRow.analysis_outputs?.score_risk_dependencies ?? [],
      };

      // ─── 9. Fetch interpretation for page 7's "What this means" ─────
      // Best-effort — page 7 simply omits the section if this fails.
      try {
        const analysisForInterp = {
          industry_name:           benchmarkSnapshot.industry_name,
          tension_indicator:       benchmarkSnapshot.tension_indicator,
          financial_position:      benchmarkSnapshot.financial_position,
          risk_flags:              benchmarkSnapshot.risk_flags,
          strengths:               benchmarkSnapshot.strengths,
          interaction_insights:    benchmarkSnapshot.interaction_insights,
          sensitivity:             benchmarkSnapshot.sensitivity,
          deal_structure:          benchmarkSnapshot.deal_structure,
          financial_score:         benchmarkSnapshot.financial_score,
          score_drivers:           benchmarkSnapshot.score_drivers,
          score_risk_dependencies: benchmarkSnapshot.score_risk_dependencies,
        };

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
          ?? `https://${req.headers.get("host")}`;
        const interpRes = await fetch(`${baseUrl}/api/benchmarks/interpret`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ analysis: analysisForInterp }),
        });
        const interpJson = await interpRes.json();
        if (interpJson.ok && Array.isArray(interpJson.interpretation)) {
          interpretation = interpJson.interpretation;
        }
      } catch (err) {
        console.warn("[reports] interpretation fetch failed (page 7 will skip section):", err);
      }
    }
  } catch (err) {
    console.warn("[reports] snapshot fetch failed (continuing 5-page):", err);
  }

  // ─── 10. Fetch committee memo prose (optional, gates Page 8) ──────────
  // Sonnet 4.6 generates the page 6/7 additions and page 8 memo. Posture
  // is passed in so the negotiation_leverage section can reference its
  // conclusion (preserving voice consistency with pages 1 and 5).
  // Best-effort: any failure means Page 8 simply won't render.
  let committeeProse: CommitteeMemoProse | undefined = undefined;
  if (benchmarkSnapshot && posture) {
    try {
      committeeProse = await fetchCommitteeProse(benchmarkSnapshot, posture, decision);
    } catch (err) {
      console.warn("[reports] committee prose fetch failed (page 8 will skip):", err);
    }
  }

  // ─── 11. Generate PDF ─────────────────────────────────────────────────
  const reportData: DealReportData = {
    inputs,
    comparables,
    posture,
    generated_at: new Date(),
    decision,
    benchmarkSnapshot,    // undefined when no snapshot exists → pages 6-8 skipped
    interpretation,       // undefined when interpret call fails → "What this means" skipped
    committeeProse,       // undefined when Sonnet call/validation fails → page 8 skipped
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateDealReportPDF(reportData);
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json(
      { error: "PDF generation failed", detail: (err as Error).message },
      { status: 500 }
    );
  }

  // ─── 12. Return PDF ───────────────────────────────────────────────────
  const filename = `AcquiFlow-${slugify(humanizeIndustryLabel(deal.industry))}-${dealId.slice(0, 8)}.pdf`;
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      pdfBuffer.length.toString(),
      "Cache-Control":       "private, no-store",
    },
  });
}

// ─── Helper: Industry key → human label ──────────────────────────────────
// Mirrors the labels in INDUSTRY_LABELS from the platform-reference doc

function humanizeIndustryLabel(key: string): string {
  const labels: Record<string, string> = {
    laundromat: "Laundromat", hvac: "HVAC", landscaping: "Landscaping",
    carwash: "Car Wash", dental: "Dental Practice", gym: "Gym / Fitness",
    restaurant: "Restaurant", autorepair: "Auto Repair", cleaning: "Cleaning Service",
    ecommerce: "Ecommerce", saas: "SaaS", insurance: "Insurance Agency",
    plumbing: "Plumbing", roofing: "Roofing", petcare: "Pet Care",
    pharmacy: "Pharmacy", daycare: "Daycare", medspa: "Med Spa",
    accounting: "Accounting / Tax", electrical: "Electrical Contractor",
    healthcare: "Healthcare", transportation: "Transportation",
    printing: "Printing / Marketing", storage: "Self-Storage", painting: "Painting",
    security: "Security Services", signmaking: "Sign Making",
    hairsalon: "Hair Salon", clothing: "Clothing Retail", construction: "Construction",
    grocery: "Grocery", pestcontrol: "Pest Control", marketing: "Marketing Services",
    engineering: "Engineering Services", veterinary: "Veterinary",
    realestatebrok: "Real Estate Brokerage", propertymanage: "Property Management",
    seniorcare: "Senior Care", physicaltherapy: "Physical Therapy",
    remodeling: "Remodeling", staffing: "Staffing Services",
  };
  return labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function round(n: number, d = 0): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

// ─── Negotiation Posture via Claude ──────────────────────────────────────

async function generateNegotiationPosture(
  inputs:   DealReportInputs,
  decision: ReturnType<typeof computeDecisionLayer>
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const npi = decision.negotiation_posture_inputs;

  const systemPrompt = `You are a senior M&A advisor writing a single-paragraph negotiation posture statement for a buyer's pre-LOI deal report. Output 1-2 sentences only. No preamble. No JSON wrapping. Pure prose. The tone is institutional and decisive — like a deal team partner advising a junior. You must include a clear tactical action verb (anchor, push, force, validate, structure, hold, restructure, counter). Never use generic phrases like "do your due diligence" or "be cautious." Be specific to this deal.`;

  const userPrompt = `Write a 1-2 sentence negotiation posture for a buyer evaluating this deal.

DEAL CONTEXT:
- Industry: ${inputs.industry_label}
- Asking: $${inputs.asking_price.toLocaleString()} at ${inputs.valuation_multiple.toFixed(2)}x SDE
- Fair value: $${inputs.fair_value.toLocaleString()}
- Target price range: $${decision.target_price_low.toLocaleString()} – $${decision.target_price_high.toLocaleString()}
- Walk-away ceiling: $${decision.walk_away_threshold.toLocaleString()}

DECISION INPUTS:
- Buyer leverage: ${npi.leverage}
- Valuation gap vs fair value: ${npi.valuation_gap_pct >= 0 ? "+" : ""}${npi.valuation_gap_pct}%
- Percentile vs market: ${npi.percentile} (${npi.percentile <= 30 ? "below" : npi.percentile <= 70 ? "in" : "above"} market range)
- DSCR strength: ${npi.dscr_strength}
- Risk profile: ${npi.risk_severity_mix.high} high, ${npi.risk_severity_mix.medium} medium, ${npi.risk_severity_mix.low} low
- Deal-breaker risks present: ${npi.deal_breaker_count}
- Trajectory: ${npi.trajectory}

REQUIREMENTS:
1. Maximum 2 sentences
2. Must include a tactical verb (anchor / push / force / validate / structure / hold / restructure / counter)
3. Reference at least one specific dollar amount or percentage
4. Match tone to leverage: STRONG = assertive (lead, anchor, force); MODERATE = balanced (counter, structure); WEAK = defensive (restructure, validate, require)
5. No generic advice. No fluff. No "exciting opportunity" language.

Write the posture now (1-2 sentences, no preamble).`;

  // Use direct Anthropic API call — avoids depending on /api/deal-check routing
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:       "claude-sonnet-4-6",
      max_tokens:  300,
      system:      systemPrompt,
      messages:    [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.content
    ?.filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join(" ")
    .trim();

  if (!text || text.length < 20) {
    throw new Error("Empty or invalid posture response");
  }

  // Strip surrounding quotes if Claude wrapped the response
  return text.replace(/^["']|["']$/g, "").trim();
}

// ─── Committee Memo Prose via Claude Sonnet 4.6 ──────────────────────────
//
// One Sonnet call that returns prose for pages 6 (normalization), 7
// (diligence priorities additions), and 8 (full investment committee memo).
// Includes numeric fabrication validator — if any number in the AI output
// doesn't appear in the source analysis, the entire prose payload is
// rejected and the report falls back to deterministic-only rendering for
// these sections.
//
// On any failure the caller catches and continues — Page 8 simply won't
// render, and Pages 6-7 fall back to deterministic prose.

const COMMITTEE_MEMO_SYSTEM_PROMPT = `You are writing the prose layer of an institutional acquisition diligence report. The deterministic engine has already done all the analysis — your job is to translate structured findings into measured, lender-aware committee prose.

ROLE
You are the writer of a credit committee memorandum, not an analyst. You translate structured signals into prose that a senior PE associate or lender's underwriter would write for a committee deck. You add no new analysis, no new claims, no new metrics.

VOICE — non-negotiable:
- Measured. Never assert what is uncertain.
- Lender-aware. Frame: "what would a SBA underwriter or PE LP want highlighted?"
- Terse. Real committee memos are dense. Short sentences are stronger.
- Institutional vocabulary (coverage, exposure, normalized, contingent, sensitivity, dependence, structural).
- Skeptical only when warranted. Never manufactured.
- No salesy language, no enthusiasm, no superlatives, no urgency.

PROHIBITED LANGUAGE
- "incredible," "exceptional," "remarkable," "exciting," "tremendous," "huge"
- "great opportunity," "strong potential," "solid foundation"
- "must," "critical," "urgent," "essential" (unless quoting a hard threshold)
- Em-dashes for emphasis (only for parenthetical clauses)
- Exclamation points. Adjective stacks. Anything resembling marketing copy.

PREFERRED PATTERNS
- "Coverage adequate but contingent on SDE validation."
- "Reported earnings sustain debt service; normalized earnings would not."
- "Profile internally consistent across coverage, profitability, and structure."
- "Earnings quality cannot be confirmed without add-back validation."

NUMERIC FIDELITY — STRICT
Every number you write must appear in the analysis JSON. No derived numbers, no rounded values not in source, no comparative figures introduced.

OUTPUT FORMAT
Return EXACTLY this JSON, no preamble, no fences, no commentary:

{
  "page6_normalization_interpretation": "<2 sentences max, only if sensitivity provided. Else null.>",
  "page7_diligence_additions": [<0-2 strings; specific diligence priorities derived from existing flags. Most material first.>],
  "page8_memo": {
    "investment_merits":        { "lead": "<1 sentence>", "body": "<1-2 sentences>", "pull_quote": "<4-7 words, no period>" },
    "primary_risks":            { "lead": "<1 sentence>", "body": "<1-2 sentences>", "pull_quote": "<4-7 words, no period>" },
    "financing_outlook":        { "lead": "<1 sentence>", "body": "<1-2 sentences>", "pull_quote": "<4-7 words, no period>" },
    "negotiation_leverage":     { "lead": "<1 sentence>", "body": "<1-2 sentences referencing posture>", "pull_quote": "<4-7 words, no period>" },
    "recommended_path_forward": { "lead": "<1 sentence>", "body": "<1-2 sentences>", "pull_quote": "<4-7 words, no period>" }
  }
}

CRITICAL
- Lead = strongest single claim, one sentence.
- Body = 1-2 sentences. Aim for 1 when possible. Density beats length.
- Pull quote = 4-7 words, no period, must contain a number from source.
- "negotiation_leverage" body references posture conclusion; does not regenerate it.

TONE BY DEAL PROFILE
- Clean (score >= 75, no tension, 0-1 flags): confident, brief. "Underwrites cleanly under stated assumptions."
- Mixed (55-74): balanced. "Supportable but contingent on validation."
- Messy (<55, tension or multiple flags): risks dominant. "Faces structural and quality questions."

CONSISTENCY
The narrative threads must agree. Internal contradictions across sections are a worse failure mode than understatement.`;

interface CommitteeMemoSection {
  lead: string;
  body: string;
  pull_quote: string;
}

interface RawCommitteeMemoResponse {
  page6_normalization_interpretation: string | null;
  page7_diligence_additions: string[];
  page8_memo: {
    investment_merits:        CommitteeMemoSection;
    primary_risks:            CommitteeMemoSection;
    financing_outlook:        CommitteeMemoSection;
    negotiation_leverage:     CommitteeMemoSection;
    recommended_path_forward: CommitteeMemoSection;
  };
}

/**
 * Extract every number-shaped token from a string. Used for numeric
 * fabrication validation — every number in Sonnet's output must appear
 * in the source analysis.
 */
function extractNumericCores(text: string): Set<string> {
  const out = new Set<string>();
  const moneyAbbrevRe = /\$([\d,]+\.?\d*)\s*([KMB])/gi;
  const moneyRe       = /\$([\d,]+\.?\d*)/g;
  const pctRe         = /([\d,]+\.?\d*)\s*%/g;
  const ratioRe       = /([\d,]+\.?\d*)\s*x\b/gi;
  const scoreRe       = /(\d+)\s*\/\s*100\b/g;
  const bareRe        = /\b([\d,]+\.?\d+|\d+)\b/g;

  const stripCommas = (s: string) => s.replace(/,/g, "");
  const normalize = (s: string): string | null => {
    const n = parseFloat(stripCommas(s));
    if (!Number.isFinite(n)) return null;
    // Format to 4 decimals max, strip trailing zeros AFTER a decimal point only
    const formatted = String(+n.toFixed(4));
    // Only strip trailing zeros if the string contains a decimal point
    if (formatted.includes(".")) {
      return formatted.replace(/0+$/, "").replace(/\.$/, "") || "0";
    }
    return formatted;
  };
  const add = (raw: string) => { const n = normalize(raw); if (n !== null) out.add(n); };

  let m: RegExpExecArray | null;
  const consumed = new Set<number>();

  while ((m = moneyAbbrevRe.exec(text)) !== null) {
    const base = parseFloat(stripCommas(m[1]));
    if (!Number.isFinite(base)) continue;
    const mult = m[2].toUpperCase() === "K" ? 1_000 : m[2].toUpperCase() === "M" ? 1_000_000 : 1_000_000_000;
    add(String(base * mult));
    add(String(base));
    for (let i = m.index; i < m.index + m[0].length; i++) consumed.add(i);
  }
  while ((m = moneyRe.exec(text)) !== null) {
    if (consumed.has(m.index)) continue;
    add(m[1]);
    for (let i = m.index; i < m.index + m[0].length; i++) consumed.add(i);
  }
  while ((m = pctRe.exec(text)) !== null) {
    if (consumed.has(m.index)) continue;
    add(m[1]);
    for (let i = m.index; i < m.index + m[0].length; i++) consumed.add(i);
  }
  while ((m = ratioRe.exec(text)) !== null) {
    if (consumed.has(m.index)) continue;
    add(m[1]);
    for (let i = m.index; i < m.index + m[0].length; i++) consumed.add(i);
  }
  while ((m = scoreRe.exec(text)) !== null) {
    if (consumed.has(m.index)) continue;
    add(m[1]); add("100");
    for (let i = m.index; i < m.index + m[0].length; i++) consumed.add(i);
  }
  while ((m = bareRe.exec(text)) !== null) {
    if (consumed.has(m.index)) continue;
    add(m[1]);
  }
  return out;
}

/**
 * Validate that every numeric token in the AI prose appears in the source.
 * Small integer counts (0-10) are exempt as they're typically array lengths
 * or ordinals that legitimately appear without being explicitly written in
 * the source JSON.
 */
function validateProse(
  prose: string,
  source: BenchmarkSnapshotForReport,
  posture: string,
): { ok: true } | { ok: false; reason: string } {
  // Build the source corpus: snapshot JSON + posture + threshold reference values
  const sourceText = JSON.stringify(source) + " " + posture;
  const sourceCores = extractNumericCores(sourceText);

  // Pre-seed abbreviation variants for large numbers in source.
  // If source has 320000, also accept 320 (i.e. "$320K"), since Sonnet may
  // legitimately write abbreviated forms. Same for millions: 1500000 → 1.5.
  const seeds = [...sourceCores];
  for (const v of seeds) {
    const n = parseFloat(v);
    if (!Number.isFinite(n)) continue;

    // Decimal rounding variants for non-integer source numbers
    // (e.g. source has 28.34, allow output "28.3")
    if (!Number.isInteger(n)) {
      const fmt = (x: number): string => {
        const s = String(x);
        if (s.includes(".")) return s.replace(/0+$/, "").replace(/\.$/, "") || "0";
        return s;
      };
      sourceCores.add(fmt(+n.toFixed(1)));
      sourceCores.add(fmt(+n.toFixed(2)));
      sourceCores.add(String(Math.round(n)));
    }

    if (n >= 1000 && n < 1_000_000 && n % 1000 === 0) {
      sourceCores.add(String(n / 1000));         // 320000 → "320" (matches "$320K")
    }
    // Round large values to nearest thousand and add both abbreviated forms,
    // since Sonnet may say "$151K" when source has 151200.
    if (n >= 1000 && n < 1_000_000) {
      const rounded = Math.round(n / 1000) * 1000;
      sourceCores.add(String(rounded));
      sourceCores.add(String(rounded / 1000));
    }
    if (n >= 1_000_000) {
      const mn = n / 1_000_000;
      const mnStr = String(mn).includes(".") ? String(mn).replace(/0+$/, "").replace(/\.$/, "") : String(mn);
      sourceCores.add(mnStr);                    // 1500000 → "1.5" (matches "$1.5M")
      // Round to nearest 0.1M for abbreviated forms
      const mnRounded = Math.round(mn * 10) / 10;
      const mnRoundedStr = String(mnRounded).includes(".") ? String(mnRounded).replace(/0+$/, "").replace(/\.$/, "") : String(mnRounded);
      sourceCores.add(mnRoundedStr);
    }
  }

  // Threshold reference values that may appear legitimately
  sourceCores.add("1.30"); sourceCores.add("1.50"); sourceCores.add("1.5");
  sourceCores.add("100"); sourceCores.add("80"); sourceCores.add("85");
  if (source.financial_score !== null) sourceCores.add(String(source.financial_score));
  sourceCores.add(String(source.risk_flags.length));
  sourceCores.add(String(source.interaction_insights.length));
  sourceCores.add(String(source.strengths?.length ?? 0));
  sourceCores.add(String(source.score_drivers.length));
  sourceCores.add(String(source.score_risk_dependencies.length));

  const outputCores = extractNumericCores(prose);
  for (const v of outputCores) {
    const n = parseFloat(v);
    // Small integer counts are exempt
    if (Number.isInteger(n) && n >= 0 && n <= 10) continue;

    if (!sourceCores.has(v)) {
      // Check rounded variants (e.g. "8" matches "8.4")
      const fmt = (x: number): string => {
        const s = String(x);
        if (s.includes(".")) return s.replace(/0+$/, "").replace(/\.$/, "") || "0";
        return s;
      };
      const variants = [
        fmt(+n.toFixed(2)),
        fmt(+n.toFixed(1)),
        String(Math.round(n)),
      ];
      const ok = variants.some(vv => sourceCores.has(vv));
      if (!ok) {
        return { ok: false, reason: `prose contains number "${v}" not in source` };
      }
    }
  }
  return { ok: true };
}

/**
 * Build a compact analysis prompt for the Sonnet committee call. Strips the
 * fields that don't contribute to prose and includes the posture text so
 * Page 8's negotiation_leverage section can reference (not regenerate) it.
 */
function buildCommitteePrompt(
  snap: BenchmarkSnapshotForReport,
  posture: string,
  decision: ReturnType<typeof computeDecisionLayer>,
): string {
  const compact = {
    industry_name:           snap.industry_name,
    financial_score:         snap.financial_score,
    score_drivers:           snap.score_drivers,
    score_risk_dependencies: snap.score_risk_dependencies,
    tension_indicator:       snap.tension_indicator,
    sensitivity:             snap.sensitivity ?? null,
    risk_flags:              snap.risk_flags.map(f => ({ severity: f.severity, message: f.message })),
    interaction_insights:    snap.interaction_insights.map(i => ({ severity: i.severity, message: i.message })),
    strengths:               snap.strengths.map(s => s.message),
    metrics_summary:         snap.financial_position
      .filter(r => r.deal_value !== null || r.outlier_kind !== null)
      .map(r => ({
        label: r.metric_label,
        deal_value: r.deal_value,
        industry_median: r.industry_median,
        percentile: r.display_percentile,
        outlier_kind: r.outlier_kind,
      })),
    deal_structure: snap.deal_structure
      ? {
          metrics: snap.deal_structure.metrics.map(m => ({
            label: m.label, value: m.value, display: m.display, status: m.status,
          })),
          sources_uses_balanced: snap.deal_structure.sources_uses.balanced,
          flags: snap.deal_structure.flags.map(f => ({ severity: f.severity, message: f.message })),
        }
      : null,
    negotiation_posture: posture,
    decision_summary: {
      verdict:              decision.verdict,
      target_price_low:     decision.target_price_low,
      target_price_high:    decision.target_price_high,
      walk_away_threshold:  decision.walk_away_threshold,
    },
  };

  return `Here is the deterministic analysis. Generate the committee memo prose per the system rules.

Use the negotiation_posture text as canonical input for the negotiation_leverage section. Reference its conclusion; do not regenerate it.

${JSON.stringify(compact, null, 2)}`;
}

/**
 * Main fetcher. Returns CommitteeMemoProse on success; throws on any failure
 * (caller in the route catches and continues without page 8).
 *
 * Includes structured diagnostic logging so we can see exactly where time is
 * being spent and what's coming back from Sonnet. Every log line is prefixed
 * with "[committee-diag]" for easy grep in Vercel logs.
 */
async function fetchCommitteeProse(
  snap: BenchmarkSnapshotForReport,
  posture: string,
  decision: ReturnType<typeof computeDecisionLayer>,
): Promise<CommitteeMemoProse> {
  const t0 = Date.now();
  const elapsed = () => Date.now() - t0;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const prompt = buildCommitteePrompt(snap, posture, decision);

  // Input size diagnostics: char count + rough token estimate (~4 chars/token).
  // Exact input tokens come back in usage.input_tokens after the call.
  const promptCharCount = prompt.length;
  const systemCharCount = COMMITTEE_MEMO_SYSTEM_PROMPT.length;
  const totalInputCharCount = promptCharCount + systemCharCount;
  const roughInputTokenEstimate = Math.round(totalInputCharCount / 4);

  console.info("[committee-diag] start", {
    deal_industry:       snap.industry_name,
    has_sensitivity:     !!snap.sensitivity,
    risk_flag_count:     snap.risk_flags.length,
    insight_count:       snap.interaction_insights.length,
    metric_count:        snap.financial_position.length,
    has_deal_structure:  !!snap.deal_structure,
    posture_char_count:  posture.length,
    prompt_char_count:   promptCharCount,
    system_char_count:   systemCharCount,
    total_input_chars:   totalInputCharCount,
    rough_input_tokens:  roughInputTokenEstimate,
  });

  // Sonnet 4.6 — committee memo is "lender-style narrative synthesis" per model policy
  const controller = new AbortController();
  const TIMEOUT_MS = 45_000;
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  // Also track whether timeout fired (controller.signal.aborted is set on either
  // explicit abort or other reasons; this lets us distinguish in catch).
  let timedOut = false;
  const timeoutTracker = setTimeout(() => { timedOut = true; }, TIMEOUT_MS);

  const tBeforeFetch = elapsed();
  let raw: string;
  let usageInputTokens: number | undefined;
  let usageOutputTokens: number | undefined;
  let stopReason: string | undefined;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 900,    // tightened prompt: 5 sections × ~50 tokens + interpretation + diligence
        system:     COMMITTEE_MEMO_SYSTEM_PROMPT,
        messages:   [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    const tAfterFetch = elapsed();

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[committee-diag] api_error", {
        status:           res.status,
        elapsed_ms:       tAfterFetch,
        time_to_response: tAfterFetch - tBeforeFetch,
      });
      throw new Error(`Sonnet API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.content?.[0]?.text;
    if (typeof content !== "string" || !content.trim()) {
      console.warn("[committee-diag] empty_response", {
        elapsed_ms:       elapsed(),
        time_to_response: tAfterFetch - tBeforeFetch,
        usage:            data?.usage,
        stop_reason:      data?.stop_reason,
      });
      throw new Error("Empty Sonnet response");
    }
    raw = content;
    usageInputTokens  = data?.usage?.input_tokens;
    usageOutputTokens = data?.usage?.output_tokens;
    stopReason        = data?.stop_reason;

    // Headline diagnostic: this is the single most useful log line for
    // understanding what's happening on subsequent runs.
    console.info("[committee-diag] sonnet_response", {
      elapsed_ms:       elapsed(),
      time_to_response: tAfterFetch - tBeforeFetch,
      input_tokens:     usageInputTokens,
      output_tokens:    usageOutputTokens,
      stop_reason:      stopReason,
      hit_max_tokens:   stopReason === "max_tokens",
      response_chars:   content.length,
    });
  } catch (err: any) {
    const tFail = elapsed();
    if (err?.name === "AbortError" || timedOut) {
      console.warn("[committee-diag] timeout", {
        elapsed_ms:       tFail,
        timeout_ms:       TIMEOUT_MS,
        time_to_response: tFail - tBeforeFetch,
        // Note: input token count not available because the response never came back.
        rough_input_tokens: roughInputTokenEstimate,
      });
      throw new Error(`Sonnet timeout after ${TIMEOUT_MS}ms (input ~${roughInputTokenEstimate} tokens)`);
    }
    console.warn("[committee-diag] fetch_error", {
      elapsed_ms:    tFail,
      error_name:    err?.name,
      error_message: err?.message?.slice(0, 200),
    });
    throw err;
  } finally {
    clearTimeout(timeout);
    clearTimeout(timeoutTracker);
  }

  // Parse — strip code fences if Sonnet adds any
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  let parsed: RawCommitteeMemoResponse;
  try {
    parsed = JSON.parse(text);
  } catch (err: any) {
    console.warn("[committee-diag] parse_failure", {
      elapsed_ms:     elapsed(),
      raw_preview:    text.slice(0, 300),
      output_tokens:  usageOutputTokens,
      hit_max_tokens: stopReason === "max_tokens",
    });
    throw new Error(`Sonnet JSON parse failed: ${err?.message ?? "unknown"}`);
  }

  // Shape validation
  if (!parsed.page8_memo) {
    console.warn("[committee-diag] shape_failure", { reason: "missing page8_memo" });
    throw new Error("Response missing page8_memo");
  }
  const required = ["investment_merits", "primary_risks", "financing_outlook", "negotiation_leverage", "recommended_path_forward"] as const;
  for (const k of required) {
    const sec = (parsed.page8_memo as any)[k];
    if (!sec || typeof sec.lead !== "string" || typeof sec.body !== "string" || typeof sec.pull_quote !== "string") {
      console.warn("[committee-diag] shape_failure", { reason: `malformed page8_memo.${k}` });
      throw new Error(`Response missing or malformed page8_memo.${k}`);
    }
  }

  // Numeric fabrication validation across every prose field
  const allProse = [
    parsed.page6_normalization_interpretation ?? "",
    ...(parsed.page7_diligence_additions ?? []),
    ...required.flatMap(k => {
      const sec = (parsed.page8_memo as any)[k];
      return [sec.lead, sec.body, sec.pull_quote];
    }),
  ].join(" ");

  const validation = validateProse(allProse, snap, posture);
  if (!validation.ok) {
    console.warn("[committee-diag] validation_failure", {
      elapsed_ms:     elapsed(),
      reason:         validation.reason,
      output_tokens:  usageOutputTokens,
    });
    throw new Error(`prose validation: ${validation.reason}`);
  }

  // Cap diligence additions at 2 items (per spec)
  const diligenceAdditions = (parsed.page7_diligence_additions ?? []).slice(0, 2);

  console.info("[committee-diag] success", {
    total_elapsed_ms:    elapsed(),
    input_tokens:        usageInputTokens,
    output_tokens:       usageOutputTokens,
    diligence_additions: diligenceAdditions.length,
    has_normalization:   !!parsed.page6_normalization_interpretation,
  });

  return {
    page6_normalization_interpretation: parsed.page6_normalization_interpretation ?? null,
    page7_diligence_additions:          diligenceAdditions,
    page8_memo:                          parsed.page8_memo,
  };
}
