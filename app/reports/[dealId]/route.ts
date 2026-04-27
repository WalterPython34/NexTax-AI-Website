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
//   6. Generate negotiation posture via Claude (with fallback)
//   7. Generate PDF
//   8. Return as application/pdf with download disposition
//
// File path: app/api/reports/[dealId]/route.ts
// =====================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import {
  DealReportInputs,
  computeDecisionLayer,
  buildFallbackPosture,
} from "@/lib/acquiflow/decision-layer";
import {
  DealReportData,
  ComparableDeal,
  generateDealReportPDF,
} from "@/lib/acquiflow/deal-report-generator";

// Service role client for cross-table reads after auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime    = "nodejs";
export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  const { dealId } = params;
  if (!dealId) {
    return NextResponse.json({ error: "Missing dealId" }, { status: 400 });
  }

  // ─── 1. Auth ─────────────────────────────────────────────────────────
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ─── 2. Verify Pro plan ──────────────────────────────────────────────
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
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
  if (deal.user_id && deal.user_id !== user.id) {
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

  // ─── 7. Negotiation posture via Claude ────────────────────────────────
  let posture: string;
  try {
    posture = await generateNegotiationPosture(inputs, decision);
  } catch (err) {
    console.error("Posture generation failed, using fallback:", err);
    posture = buildFallbackPosture(decision.negotiation_posture_inputs);
  }

  // ─── 8. Generate PDF ──────────────────────────────────────────────────
  const reportData: DealReportData = {
    inputs,
    comparables,
    posture,
    generated_at: new Date(),
    decision,
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

  // ─── 9. Return PDF ────────────────────────────────────────────────────
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
      model:       "claude-sonnet-4-20250514",
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
