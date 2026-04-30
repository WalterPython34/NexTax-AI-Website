// =====================================================================
// AcquiFlow — Decision Layer Computations
// ---------------------------------------------------------------------
// Pure, deterministic functions that derive the decision-making elements
// shown in the deal report (Decision Bar, Walk-Away Threshold, Lender
// Readiness, Pricing Insight, Deal Breaker flags, Leverage classification,
// stress scenarios).
//
// All inputs come from the `deal_runs` row + benchmark data. No DB calls,
// no API calls, no LLM calls. Pure math + rules.
//
// File path: lib/acquiflow/decision-layer.ts
// =====================================================================

// ─── Types ──────────────────────────────────────────────────────────────

export interface DealReportInputs {
  // Core financials
  industry:        string;
  industry_label:  string;
  revenue:         number;
  sde:             number;
  reported_sde?:   number | null;
  usable_sde?:     number | null;
  asking_price:    number;
  city?:           string | null;
  state?:          string | null;

  // Debt
  debt_percent?:    number;   // e.g. 90 = 90%
  interest_rate?:   number;   // e.g. 10.75 = 10.75%
  term_years?:      number;   // e.g. 10
  monthly_payment?: number | null;
  dscr:             number;

  // Valuation
  valuation_multiple: number;
  fair_value:         number;
  fair_value_low?:    number | null;   // P25 if available
  fair_value_high?:   number | null;   // P75 if available
  recommended_offer_low?:  number | null;
  recommended_offer_high?: number | null;

  // Scoring
  overall_score: number;
  risk_level:    string;

  // Flags
  red_flags?:   string[] | null;
  green_flags?: string[] | null;

  // Benchmark context
  benchmark_low?:        number | null; // multiple low
  benchmark_mid?:        number | null; // multiple median
  benchmark_high?:       number | null; // multiple high
  benchmark_sample_size?: number | null;

  // Evidence profile (V2 normalization)
  evidence_profile?: {
    addBackPct?:        number;
    addBackBand?:       string;
    topCustomerPct?:    number | null;
    concentrationBand?: string;
  } | null;
}

export type LeverageTier   = "STRONG" | "MODERATE" | "WEAK";
export type LenderTier     = "PASS+" | "PASS" | "CONDITIONAL" | "FAIL";
export type RiskSeverity   = "HIGH" | "MEDIUM" | "LOW";
export type Recommendation = "PURSUE" | "INVESTIGATE" | "PASS" | "RESTRUCTURE";

export interface StressScenario {
  label:        string;
  sde:          number;
  dscr:         number;
  passed:       boolean;     // ≥ 1.25x
  comfortable:  boolean;     // ≥ 1.50x
}

export interface RiskFlag {
  severity:        RiskSeverity;
  category:        "OPERATIONAL" | "FINANCIAL" | "MARKET" | "STRUCTURAL";
  headline:        string;
  detail:          string;
  isDealBreaker:   boolean;
}

export interface PricingInsight {
  percentile:           number;
  percentile_ordinal:   string;       // "22nd"
  position:             "below" | "at" | "above";
  asking_multiple:      number;
  median_multiple:      number;
  delta_multiple:       number;       // |asking - median|
  fair_value_gap:       number;       // theoretical anchor
  multiple_based_gap:   number;       // cross-check
  realistic_savings:    number;       // capped capture
  headline_value:       number;       // displayed dollar value
  was_capped:           boolean;
  prose:                string;       // 4-sentence rule-based prose
}

export interface DecisionLayerResult {
  // Top-of-page decision bar
  recommendation:      Recommendation;
  target_price_low:    number;
  target_price_high:   number;
  confidence:          "High" | "Medium" | "Low";
  leverage:            LeverageTier;
  lender_readiness:    LenderTier;

  // Page 2 — stress scenarios + interpretations
  stress_scenarios:        StressScenario[];
  sde_interpretation:      string;
  dscr_interpretation:     string;

  // Page 3 — risk flags
  risk_flags:              RiskFlag[];
  trajectory_label:        "Stable" | "Improving" | "Declining" | "Unknown";
  trajectory_confidence:   "High" | "Medium" | "Low";

  // Page 4 — pricing insight
  pricing_insight:         PricingInsight;

  // Page 5 — walk-away
  walk_away_threshold:     number;
  walk_away_reason:        string;

  // Page 1 — investment take + negotiation posture inputs
  // (negotiation posture itself is generated externally via Claude)
  negotiation_posture_inputs: {
    leverage:           LeverageTier;
    valuation_gap_pct:  number;
    percentile:         number;
    dscr_strength:      "very_strong" | "strong" | "moderate" | "weak";
    risk_severity_mix:  { high: number; medium: number; low: number };
    trajectory:         string;
    deal_breaker_count: number;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

const round = (n: number, decimals: number = 0): number => {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
};

const clamp = (n: number, min: number, max: number): number =>
  Math.min(Math.max(n, min), max);

const ordinal = (n: number): string => {
  const r = Math.round(n);
  const lastTwo = r % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${r}th`;
  switch (r % 10) {
    case 1:  return `${r}st`;
    case 2:  return `${r}nd`;
    case 3:  return `${r}rd`;
    default: return `${r}th`;
  }
};

const fmtUsd = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
};

// ─── Stress Scenarios ───────────────────────────────────────────────────

function computeStressScenarios(
  sde: number,
  monthlyPayment: number,
  revenue: number,
  baseDscr: number   // authoritative DSCR for base case
): StressScenario[] {
  const annualDebt   = monthlyPayment * 12;
  const sdeMargin    = revenue > 0 ? sde / revenue : 0;

  // The base DSCR comes from upstream (deal.dscr) which may have been
  // computed from a slightly different SDE basis (reported vs adjusted).
  // We anchor base case to that authoritative value, then derive stress
  // scenarios proportionally.
  const baseRatio = sde > 0 && annualDebt > 0
    ? baseDscr / (sde / annualDebt)   // calibration factor
    : 1;

  const scenarios: { label: string; revDelta: number; marginDelta: number }[] = [
    { label: "Base case",                revDelta:  0.00, marginDelta:  0.00 },
    { label: "Stress -15% revenue",      revDelta: -0.15, marginDelta:  0.00 },
    { label: "Stress -25% revenue",      revDelta: -0.25, marginDelta:  0.00 },
    { label: "Margin compression -5pts", revDelta:  0.00, marginDelta: -0.05 },
  ];

  return scenarios.map(s => {
    const newRev    = revenue * (1 + s.revDelta);
    const newMargin = Math.max(0, sdeMargin + s.marginDelta);
    const newSde    = Math.max(0, newRev * newMargin);
    const rawDscr   = annualDebt > 0 ? newSde / annualDebt : 0;
    const dscr      = rawDscr * baseRatio;  // calibrate to upstream baseline
    return {
      label:       s.label,
      sde:         Math.round(newSde),
      dscr:        round(dscr, 2),
      passed:      dscr >= 1.25,
      comfortable: dscr >= 1.50,
    };
  });
}

// ─── Lender Readiness ───────────────────────────────────────────────────

function computeLenderReadiness(
  baseDscr: number,
  scenarios: StressScenario[]
): LenderTier {
  // Tier from base DSCR
  let tier: LenderTier;
  if      (baseDscr >= 1.50) tier = "PASS";
  else if (baseDscr >= 1.25) tier = "CONDITIONAL";
  else                       tier = "FAIL";

  // Downgrade if any stress scenario drops below 1.25x
  const anyStressed = scenarios.some(s => s.dscr < 1.25);
  if (anyStressed) {
    if      (tier === "PASS")        tier = "CONDITIONAL";
    else if (tier === "CONDITIONAL") tier = "FAIL";
  }

  // Upgrade to PASS+ if all scenarios stay ≥ 1.50x
  const allComfortable = scenarios.every(s => s.comfortable);
  if (tier === "PASS" && allComfortable) tier = "PASS+";

  return tier;
}

// ─── Leverage Classification ────────────────────────────────────────────

function computeLeverage(
  percentile: number,
  baseDscr: number,
  highRiskCount: number
): LeverageTier {
  // STRONG: ≤30th percentile AND DSCR ≥ 1.5x AND no HIGH risks
  if (percentile <= 30 && baseDscr >= 1.5 && highRiskCount === 0) {
    return "STRONG";
  }
  // WEAK: above market (>70th) OR DSCR < 1.25x OR ≥2 HIGH risks
  if (percentile > 70 || baseDscr < 1.25 || highRiskCount >= 2) {
    return "WEAK";
  }
  // Otherwise: MODERATE
  return "MODERATE";
}

// ─── Percentile Computation ─────────────────────────────────────────────

function computePercentile(
  askingMultiple: number,
  benchLow: number,
  benchMid: number,
  benchHigh: number
): number {
  // Linear interpolation across benchmark range
  // Below low → ~5–10th percentile range
  // At low → 10th
  // At median → 50th
  // At high → 90th
  // Above high → 90–98 range
  if (askingMultiple <= benchLow) {
    const ratio = benchLow > 0 ? askingMultiple / benchLow : 0;
    return clamp(round(5 + ratio * 5), 1, 10);
  }
  if (askingMultiple >= benchHigh) {
    const ratio = benchHigh > 0 ? askingMultiple / benchHigh : 1;
    return clamp(round(90 + (ratio - 1) * 20), 90, 99);
  }
  if (askingMultiple <= benchMid) {
    const span  = benchMid - benchLow;
    const pos   = span > 0 ? (askingMultiple - benchLow) / span : 0.5;
    return clamp(round(10 + pos * 40), 10, 50);
  }
  // benchMid < asking < benchHigh
  const span = benchHigh - benchMid;
  const pos  = span > 0 ? (askingMultiple - benchMid) / span : 0.5;
  return clamp(round(50 + pos * 40), 50, 90);
}

// ─── Risk Flag Detection ────────────────────────────────────────────────

function detectRiskFlags(d: DealReportInputs, scenarios: StressScenario[]): RiskFlag[] {
  const flags: RiskFlag[] = [];

  const topCustomerPct    = d.evidence_profile?.topCustomerPct ?? null;
  const concentrationBand = d.evidence_profile?.concentrationBand ?? "unknown";
  const addBackPct        = d.evidence_profile?.addBackPct ?? 0;

  // ─── Customer concentration ───────────────────────────────────────────
  if (topCustomerPct !== null && topCustomerPct >= 40) {
    flags.push({
      severity:      "HIGH",
      category:      "OPERATIONAL",
      headline:      "Customer concentration",
      detail:        `Top customer represents ${Math.round(topCustomerPct)}% of revenue. Loss of this account would materially impact SDE and DSCR coverage. Mitigation: binding multi-year contracts or earn-out tied to retention before LOI.`,
      isDealBreaker: true,
    });
  } else if (concentrationBand === "high" || (topCustomerPct !== null && topCustomerPct >= 25)) {
    flags.push({
      severity:      "MEDIUM",
      category:      "OPERATIONAL",
      headline:      "Customer concentration",
      detail:        topCustomerPct !== null
        ? `Top customer represents ~${Math.round(topCustomerPct)}% of revenue. Validate contract structure and renewal probability during diligence.`
        : "Customer concentration flagged in evidence profile. Validate top-customer exposure and contract structure during diligence.",
      isDealBreaker: false,
    });
  }

  // ─── DSCR-breaking under stress ───────────────────────────────────────
  const failedScenarios = scenarios.filter(s => !s.passed);
  if (failedScenarios.length >= 2 && d.dscr >= 1.25) {
    flags.push({
      severity:      "HIGH",
      category:      "FINANCIAL",
      headline:      "Debt coverage fails under stress",
      detail:        `DSCR drops below 1.25x in ${failedScenarios.length} of 4 stress scenarios. Financing structure may not survive realistic downside.`,
      isDealBreaker: false,
    });
  }

  // ─── Aggressive add-backs ─────────────────────────────────────────────
  if (addBackPct >= 25) {
    flags.push({
      severity:      "HIGH",
      category:      "FINANCIAL",
      headline:      "Aggressive add-back profile",
      detail:        `Add-backs total ${Math.round(addBackPct)}% of reported earnings. Validation through 3 years of tax returns is mandatory before LOI — adjusted SDE may be materially lower.`,
      isDealBreaker: addBackPct >= 35,
    });
  } else if (addBackPct >= 15) {
    flags.push({
      severity:      "MEDIUM",
      category:      "FINANCIAL",
      headline:      "Elevated add-back exposure",
      detail:        `Add-backs total ~${Math.round(addBackPct)}% of reported earnings. Validate through tax returns and add-back schedule.`,
      isDealBreaker: false,
    });
  }

  // ─── SDE normalization gap ────────────────────────────────────────────
  const reported = d.reported_sde ?? d.sde;
  const usable   = d.usable_sde   ?? d.sde;
  if (reported > 0 && usable < reported * 0.92) {
    const gapPct = round(((reported - usable) / reported) * 100, 1);
    flags.push({
      severity:      gapPct >= 20 ? "HIGH" : "MEDIUM",
      category:      "FINANCIAL",
      headline:      "SDE normalization gap",
      detail:        `Adjusted SDE is ${gapPct}% below reported figure. Validate normalization adjustments via tax returns and verifiable add-back schedule.`,
      isDealBreaker: gapPct >= 25,
    });
  }

  // ─── Above-market pricing ─────────────────────────────────────────────
  const benchHigh = d.benchmark_high ?? null;
  if (benchHigh !== null && d.valuation_multiple > benchHigh * 1.15) {
    const overPct = round(((d.valuation_multiple - benchHigh) / benchHigh) * 100, 1);
    flags.push({
      severity:      overPct >= 30 ? "HIGH" : "MEDIUM",
      category:      "MARKET",
      headline:      "Asking multiple above market range",
      detail:        `Asking multiple is ${overPct}% above the high end of comparable transactions. Premium requires earnings quality justification or strategic value above what comps reflect.`,
      isDealBreaker: false,
    });
  }

  // ─── Industry-typical risk: seasonality / volatility ──────────────────
  const seasonalIndustries = ["landscaping","carwash","gym","painting","roofing","construction"];
  if (seasonalIndustries.includes(d.industry.toLowerCase())) {
    flags.push({
      severity:      "LOW",
      category:      "MARKET",
      headline:      "Seasonal revenue volatility",
      detail:        `${d.industry_label} typically exhibits material Q1 revenue softness. Plan working capital peg and seasonal cash needs accordingly. Industry-typical - not deal-specific.`,
      isDealBreaker: false,
    });
  }

   // ── POSITIVE SIGNALS ─────────────────────────────────────────────────
  if (d.dscr >= 1.5) {
    const headroom = Math.round(((d.dscr - 1.25) / 1.25) * 100);
    flags.push({
      severity:      "LOW",
      category:      "FINANCIAL",
      headline:      "Strong Debt Coverage",
      detail:        `DSCR of ${d.dscr.toFixed(2)}x provides ${headroom}% headroom above the 1.25x lender minimum.`,
      isDealBreaker: false,
    });
  }

  if (d.overall_score >= 75) {
    flags.push({
      severity:      "LOW",
      category:      "FINANCIAL",
      headline:      "High Deal Quality Score",
      detail:        `Overall deal quality score of ${d.overall_score}/100 — above the 70-point threshold across valuation, debt, market, and industry dimensions.`,
      isDealBreaker: false,
    });
  }

 if (scenarios[1] && scenarios[1].dscr >= 1.25) {
    flags.push({
      severity:      "LOW",
      category:      "FINANCIAL",
      headline:      "Stress Resilient",
      detail:        `Deal maintains ${scenarios[1].dscr.toFixed(2)}x DSCR under -15% revenue stress — resilient under moderate downside.`,
      isDealBreaker: false,
    });
  }

  if (d.fair_value > 0 && d.asking_price < d.fair_value * 0.90) {
    const gapPct = Math.round(((d.asking_price - d.fair_value) / d.fair_value) * 100);
    flags.push({
      severity:      "LOW",
      category:      "MARKET",
      headline:      "Favorable Pricing",
      detail:        `Asking price is ${Math.abs(gapPct)}% below modeled fair value — favorable entry point if earnings are verified.`,
      isDealBreaker: false,
    });
  }

  if (d.evidence_profile?.addBackBand === "clean") {
    flags.push({
      severity:      "LOW",
      category:      "FINANCIAL",
      headline:      "Clean Add-Backs",
      detail:        `Add-backs are within clean underwriting tolerance — no material normalization adjustments required.`,
      isDealBreaker: false,
    });
  }

  // ── STANDARD DILIGENCE ITEMS ─────────────────────────────────────────
  flags.push({
    severity:      "MEDIUM",
    category:      "OPERATIONAL",
    headline:      "Owner Compensation",
    detail:        "Verify owner compensation is at or below market replacement cost. Above-market owner comp inflates SDE.",
    isDealBreaker: false,
  });

  flags.push({
    severity:      "MEDIUM",
    category:      "OPERATIONAL",
    headline:      "Lease Terms",
    detail:        "Confirm lease term extends at least 3 years beyond acquisition close.",
    isDealBreaker: false,
  });

  flags.push({
    severity:      "MEDIUM",
    category:      "CUSTOMER",
    headline:      "Customer Concentration",
    detail:        "Request top 5 customer breakdown as % of revenue. Single-customer concentration above 20% attracts lender scrutiny.",
    isDealBreaker: false,
  });

  flags.push({
    severity:      "MEDIUM",
    category:      "FINANCIAL",
    headline:      "Non-Recurring Items",
    detail:        "Validate SDE excludes one-time items (PPP loans, insurance settlements, asset sales).",
    isDealBreaker: false,
  });

  flags.push({
    severity:      "MEDIUM",
    category:      "OPERATIONAL",
    headline:      "Litigation & Liabilities",
    detail:        "Confirm no pending litigation, environmental liabilities, or regulatory actions.",
    isDealBreaker: false,
  });

  flags.push({
    severity:      "MEDIUM",
    category:      "FINANCIAL",
    headline:      "Accounts Receivable",
    detail:        "Request aged AR report. AR beyond 90 days signals collection risk and may require working capital adjustment.",
    isDealBreaker: false,
  });

  // ── INDUSTRY-SPECIFIC ────────────────────────────────────────────────
  const industryContext: Record<string, { headline: string; detail: string }> = {
    dental:          { headline: "Provider Retention", detail: "Patient base follows the dentist, not the practice. Transition period and non-compete are critical." },
    hvac:            { headline: "License Transfer", detail: "HVAC trade licenses are state-specific — confirm they transfer with the acquisition." },
    plumbing:        { headline: "License Transfer", detail: "Plumbing licenses are state-specific — confirm they transfer with the acquisition." },
    electrical:      { headline: "License Transfer", detail: "Electrical licenses are state-specific — confirm they transfer with the acquisition." },
    restaurant:      { headline: "Liquor License", detail: "Verify liquor license transferability and lease assignment. Both are deal-breakers if non-transferable." },
    daycare:         { headline: "Licensing Capacity", detail: "Confirm staff-to-child ratios meet state requirements. Licensing lapses can shut down operations." },
    insurance:       { headline: "Book Transfer", detail: "Verify retention rates and confirm carrier appointments transfer to the buyer entity." },
    pharmacy:        { headline: "DEA Registration", detail: "Confirm DEA registration and state pharmacy license transfer with the acquisition." },
    medspa:          { headline: "Medical Director", detail: "Verify medical director agreement transfers. Med spas require physician oversight in most states." },
    physicaltherapy: { headline: "Credentialing", detail: "Confirm provider credentialing with insurance panels transfers. Re-credentialing delays can create 90-180 day revenue gaps." },
    veterinary:      { headline: "DVM Requirement", detail: "Some states require the practice owner to hold a DVM license." },
    seniorcare:      { headline: "Certification Transfer", detail: "State licensing and Medicare/Medicaid recertification timelines can exceed 6 months." },
    healthcare:      { headline: "Provider Credentialing", detail: "Verify all provider credentialing, Medicare enrollment, and state licensing transfers." },
    staffing:        { headline: "EMR Rate", detail: "Verify workers' comp experience modification rate. High EMR indicates claims history affecting insurance costs." },
    accounting:      { headline: "Client Retention", detail: "Confirm client engagement letters are assignable. Non-transferable relationships erode value." },
    gym:             { headline: "Membership Churn", detail: "Verify membership contract terms. Monthly churn rates above 8% signal retention risk." },
    autorepair:      { headline: "Certifications", detail: "Confirm OEM certifications (ASE, manufacturer-specific) transfer and verify environmental compliance." },
    saas:            { headline: "Churn Rate", detail: "Confirm customer churn rate. MRR with annual contracts is more defensible than month-to-month." },
    ecommerce:       { headline: "Platform Standing", detail: "Verify platform account standing and confirm all IP, trademarks, and supplier agreements transfer." },
    laundromat:      { headline: "Equipment Age", detail: "Verify equipment replacement schedule. Washer/dryer lifecycle is 7-10 years." },
    storage:         { headline: "Occupancy Trend", detail: "Verify trailing 12-month occupancy rates. Use annualized figures, not peak-month." },
    construction:    { headline: "License & Bonding", detail: "Verify GC license transfers and confirm bonding capacity carries over." },
    cleaning:        { headline: "Contract Revenue", detail: "Confirm contract vs recurring split. Businesses with >60% contract revenue have more defensible cash flows." },
    marketing:       { headline: "Key Person Risk", detail: "Verify client contract terms and key employee retention. Agency value is tied to relationships." },
    transportation:  { headline: "DOT Compliance", detail: "Verify DOT compliance, CDL driver retention, and operating authority transfers." },
    realestatebrok:  { headline: "Broker License", detail: "Verify broker license requirements and confirm agent agreements are assignable." },
    propertymanage:  { headline: "Contract Assignment", detail: "Confirm management agreements are assignable without owner consent." },
    landscaping:     { headline: "License Transfer", detail: "Confirm pesticide application licenses and municipal contracts transfer." },
    pestcontrol:     { headline: "Certifications", detail: "Confirm all pesticide applicator licenses and regulatory certifications transfer." },
    remodeling:      { headline: "Contractor License", detail: "Verify contractor licensing transfers. Requirements vary by state and municipality." },
    roofing:         { headline: "Manufacturer Certs", detail: "Confirm contractor license and manufacturer certifications transfer to the acquiring entity." },
    carwash:         { headline: "Water Compliance", detail: "Verify water reclamation compliance and confirm equipment maintenance history." },
    petcare:         { headline: "Permits", detail: "Verify animal handling permits and confirm facility meets local zoning requirements." },
    printing:        { headline: "Equipment Relevance", detail: "Verify equipment age and technology relevance. Digital printing equipment depreciates quickly." },
    signmaking:      { headline: "Equipment Condition", detail: "Verify equipment condition and confirm municipal sign permit relationships transfer." },
    painting:        { headline: "Lead Abatement", detail: "Verify contractor licensing and lead paint abatement certifications if servicing pre-1978 properties." },
    hairsalon:       { headline: "Business Model", detail: "Verify booth rental vs employee model. Booth rental has lower margins but less payroll risk. Confirm stylist retention." },
    clothing:        { headline: "Inventory Valuation", detail: "Verify inventory valuation methodology and confirm supplier/brand authorization agreements transfer." },
    grocery:         { headline: "Supplier Terms", detail: "Verify supplier agreements and exclusive distribution rights. Grocery operates on thin margins." },
    security:        { headline: "Licensing", detail: "Confirm all security guard licenses and alarm installer certifications transfer." },
    engineering:     { headline: "PE License", detail: "Confirm professional engineering license requirements and government contract eligibility transfers." },
  };

  const indCtx = industryContext[d.industry?.toLowerCase() ?? ""];
  if (indCtx) {
    flags.push({
      severity:      "MEDIUM",
      category:      "OPERATIONAL",
      headline:      indCtx.headline,
      detail:        indCtx.detail,
      isDealBreaker: false,
    });
  }

  
  // Sort by severity (HIGH first, then MEDIUM, then LOW)
  const order: Record<RiskSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  flags.sort((a, b) => order[a.severity] - order[b.severity]);
 
  return flags;
}

// ─── Pricing Insight ────────────────────────────────────────────────────

function computePricingInsight(
  d:               DealReportInputs,
  percentile:      number,
  benchMid:        number
): PricingInsight {
  const askingMult   = d.valuation_multiple;
  const deltaMult    = round(Math.abs(askingMult - benchMid), 2);
  const position: "below" | "at" | "above" =
    askingMult < benchMid * 0.95 ? "below" :
    askingMult > benchMid * 1.05 ? "above" : "at";

  // Three calculations
  const fairValueGap     = round(d.fair_value - d.asking_price);
  const multipleBasedGap = round((benchMid * d.sde) - d.asking_price);
  const recOfferHigh     = d.recommended_offer_high ?? Math.round(d.fair_value * 0.92);
  const realisticSavings = round(d.asking_price - recOfferHigh);

  // Display rule:
  //   headline = fairValueGap (anchor)
  //   if direction is "below" (favorable for buyer):
  //     - fairValueGap is positive
  //     - if fairValueGap > realisticSavings × 1.5 → cap at realisticSavings × 1.25
  //   if direction is "above" (premium):
  //     - fairValueGap is negative
  //     - show absolute "premium" amount, no capping needed (it's a warning, not a sales pitch)
  let headlineValue = fairValueGap;
  let wasCapped     = false;
  if (position === "below" && fairValueGap > 0 && realisticSavings > 0) {
    if (fairValueGap > realisticSavings * 1.5) {
      headlineValue = round(realisticSavings * 1.25);
      wasCapped     = true;
    }
  }

  // Build prose using the 4-sentence template
  const positionLabel    = position === "below" ? "below"   : position === "above" ? "above"  : "in line with";
  const positionLabel2   = position === "below" ? "below"   : "above";
  const entryLabel       = position === "below" ? "favorable" : position === "above" ? "cautious" : "neutral";
  const fairOrRealistic  = wasCapped ? "realistic capture" : "buyer-side value";
  const directionVerb    = position === "below" ? "implying a theoretical valuation gap of" : position === "above" ? "implying a pricing premium of" : "indicating fair-range pricing within";

  const sentence1 = `This deal sits in the ${ordinal(percentile)} percentile of comparable transactions, indicating ${positionLabel} market pricing.`;
  const sentence2 = `The asking multiple of ${askingMult.toFixed(2)}x is ${deltaMult}x ${positionLabel2} the ${benchMid.toFixed(2)}x median, ${directionVerb} ~${fmtUsd(Math.abs(fairValueGap))}.`;
  const sentence3 = position === "below"
    ? `Based on achievable negotiation range, realistic ${fairOrRealistic} is approximately ${fmtUsd(Math.abs(headlineValue))}.`
    : position === "above"
      ? `Realistic acquisition would require seller concession or restructured terms to bridge the premium.`
      : `Negotiation should focus on terms and structure rather than headline price.`;
  const sentence4 = position === "below"
    ? `This creates a ${entryLabel} entry point if financials validate during diligence.`
    : position === "above"
      ? `Proceed only if seller-specific factors justify the premium and financials validate during diligence.`
      : `Execution risk - not pricing - dominates value capture for this deal.`;

  const prose = `${sentence1} ${sentence2} ${sentence3} ${sentence4}`;

  return {
    percentile,
    percentile_ordinal:  ordinal(percentile),
    position,
    asking_multiple:     askingMult,
    median_multiple:     benchMid,
    delta_multiple:      deltaMult,
    fair_value_gap:      fairValueGap,
    multiple_based_gap:  multipleBasedGap,
    realistic_savings:   realisticSavings,
    headline_value:      Math.abs(headlineValue),
    was_capped:          wasCapped,
    prose,
  };
}

// ─── Walk-Away Threshold ────────────────────────────────────────────────

function computeWalkAwayThreshold(
  d:                DealReportInputs,
  riskFlags:        RiskFlag[],
  scenarios:        StressScenario[],
  percentile:       number
): { threshold: number; reason: string } {
  // base = upper bound of recommended offer
  const recOfferHigh = d.recommended_offer_high
    ?? Math.round(d.fair_value * 0.92);
  const fairValHigh  = d.fair_value_high
    ?? Math.round(d.fair_value * 1.10);

  let adjustment = 0;
  const adjustmentNotes: string[] = [];

  // − 5% per HIGH risk flag (max −15%)
  const highRisks = riskFlags.filter(f => f.severity === "HIGH").length;
  const highAdj   = -0.05 * Math.min(highRisks, 3);
  if (highAdj < 0) {
    adjustment += highAdj;
    adjustmentNotes.push(`${highRisks} HIGH risk flag${highRisks > 1 ? "s" : ""}`);
  }

  // − 3% if any DEAL BREAKER tag
  const dealBreakers = riskFlags.filter(f => f.isDealBreaker).length;
  if (dealBreakers > 0) {
    adjustment += -0.03;
    adjustmentNotes.push("deal-breaker risk present");
  }

  // + 3% if all DSCR scenarios stay above 1.5x
  const allComfortable = scenarios.every(s => s.comfortable);
  if (allComfortable) {
    adjustment += 0.03;
    adjustmentNotes.push("DSCR comfortable in all stress scenarios");
  }

  // + 2% if percentile ≤ 25th
  if (percentile <= 25) {
    adjustment += 0.02;
    adjustmentNotes.push("below-market entry");
  }

  // Apply, clamp between recommendedOfferHigh and fairValueHigh
  const raw       = recOfferHigh * (1 + adjustment);
  const clamped   = clamp(raw, recOfferHigh, fairValHigh);
  const threshold = Math.round(clamped / 1000) * 1000;  // round to nearest $1K

  const reason = adjustmentNotes.length > 0
    ? `Walk-away derived from recommended offer ceiling, adjusted for: ${adjustmentNotes.join(", ")}.`
    : `Walk-away set at recommended offer ceiling - no risk or strength adjustments triggered.`;

  return { threshold, reason };
}

// ─── Recommendation + Confidence ────────────────────────────────────────

function deriveRecommendation(
  score:        number,
  leverage:     LeverageTier,
  lenderTier:   LenderTier,
  riskFlags:    RiskFlag[],
  position:     "below" | "at" | "above"
): { rec: Recommendation; confidence: "High" | "Medium" | "Low" } {
  const highRisks    = riskFlags.filter(f => f.severity === "HIGH").length;
  const dealBreakers = riskFlags.filter(f => f.isDealBreaker).length;

  let rec: Recommendation;
  if (lenderTier === "FAIL" || dealBreakers >= 2) {
    rec = "PASS";
  } else if (score >= 75 && leverage !== "WEAK" && highRisks <= 1) {
    rec = "PURSUE";
  } else if (score >= 55 || (position === "below" && highRisks <= 2)) {
    rec = "INVESTIGATE";
  } else if (position === "above" && score < 55) {
    rec = "RESTRUCTURE";
  } else {
    rec = "INVESTIGATE";
  }

  let confidence: "High" | "Medium" | "Low";
  if (score >= 80 && (lenderTier === "PASS" || lenderTier === "PASS+") && highRisks === 0) {
    confidence = "High";
  } else if (score < 45 || highRisks >= 3 || lenderTier === "FAIL") {
    confidence = "Low";
  } else {
    confidence = "Medium";
  }

  return { rec, confidence };
}

// ─── DSCR Strength Classification ───────────────────────────────────────

function classifyDscrStrength(dscr: number): "very_strong" | "strong" | "moderate" | "weak" {
  if (dscr >= 2.5)  return "very_strong";
  if (dscr >= 1.75) return "strong";
  if (dscr >= 1.25) return "moderate";
  return "weak";
}

// ─── Interpretation Strings ─────────────────────────────────────────────

function buildSdeInterpretation(d: DealReportInputs): string {
  const reported = d.reported_sde ?? d.sde;
  const usable   = d.usable_sde   ?? d.sde;
  if (reported <= 0 || usable >= reported) {
    return "Adjusted SDE matches reported figure. No normalization haircuts applied — financials should be validated through tax returns during diligence regardless.";
  }
  const gapPct = round(((reported - usable) / reported) * 100, 1);
  if (gapPct < 5) {
    return `Adjusted SDE is within ${gapPct}% of reported figure - normalization adjustments are minimal. Validate via tax returns to confirm earnings quality.`;
  }
  return `Adjusted SDE applies a ${gapPct}% haircut for unverified add-backs and normalization adjustments. Treatment is conservative - if reported SDE proves accurate during diligence, deal economics improve further.`;
}

function buildDscrInterpretation(scenarios: StressScenario[], dscr: number): string {
  const worst = scenarios.reduce((min, s) => s.dscr < min.dscr ? s : min, scenarios[0]);
  const allComfortable = scenarios.every(s => s.comfortable);
  const allPassed      = scenarios.every(s => s.passed);

  if (allComfortable && dscr >= 2.0) {
    return `Debt service remains above 2.0x even under the worst stress scenario (${worst.label.toLowerCase()}, DSCR ${worst.dscr.toFixed(2)}x). This significantly exceeds the 1.25x SBA lender threshold under all modeled scenarios, supporting strong financing optionality and downside resilience.`;
  }
  if (allPassed) {
    return `DSCR holds above the 1.25x SBA threshold across all modeled scenarios. Worst case is ${worst.label.toLowerCase()} at ${worst.dscr.toFixed(2)}x - meets standard lender minimums with limited buffer in adverse conditions.`;
  }
  const failed = scenarios.filter(s => !s.passed);
  return `DSCR drops below the 1.25x SBA threshold in ${failed.length} of ${scenarios.length} stress scenarios. Worst case: ${worst.label.toLowerCase()} at ${worst.dscr.toFixed(2)}x. Financing structure may require revision - lower leverage, longer term, or additional equity - to absorb realistic downside.`;
}

// ─── Trajectory (placeholder logic; refine when revenue history available) ──

function deriveTrajectory(d: DealReportInputs): { label: "Stable" | "Improving" | "Declining" | "Unknown"; confidence: "High" | "Medium" | "Low" } {
  // Without time-series revenue, we can't confidently assess trajectory.
  // Defer to "Unknown" and let the caller override based on what the deal
  // run actually has. For now, infer a reasonable default from green flags.
  const green = (d.green_flags ?? []).join(" ").toLowerCase();
  const red   = (d.red_flags   ?? []).join(" ").toLowerCase();

  if (green.includes("growing") || green.includes("growth")) {
    return { label: "Improving", confidence: "Medium" };
  }
  if (red.includes("declining") || red.includes("decline")) {
    return { label: "Declining", confidence: "Medium" };
  }
  return { label: "Stable", confidence: "Medium" };
}

// ─── Main Entry Point ───────────────────────────────────────────────────

export function computeDecisionLayer(d: DealReportInputs): DecisionLayerResult {
  // Ensure we have a benchmark mid; if not, derive from valuation_multiple as a fallback
  const benchMid  = d.benchmark_mid  ?? round(d.valuation_multiple * 1.15, 2);
  const benchLow  = d.benchmark_low  ?? round(benchMid * 0.7, 2);
  const benchHigh = d.benchmark_high ?? round(benchMid * 1.4, 2);

  // Compute stress scenarios
  const monthlyPayment = d.monthly_payment
    ?? estimateMonthlyPayment(d.asking_price, d.debt_percent ?? 90, d.interest_rate ?? 10.75, d.term_years ?? 10);
  const scenarios = computeStressScenarios(d.sde, monthlyPayment, d.revenue, d.dscr);

  // Risk flags (depends on scenarios)
  const riskFlags = detectRiskFlags(d, scenarios);
  const highRisks = riskFlags.filter(f => f.severity === "HIGH").length;

  // Percentile
  const percentile = computePercentile(d.valuation_multiple, benchLow, benchMid, benchHigh);

  // Lender readiness
  const lenderReadiness = computeLenderReadiness(d.dscr, scenarios);

  // Leverage
  const leverage = computeLeverage(percentile, d.dscr, highRisks);

  // Pricing insight
  const pricingInsight = computePricingInsight(d, percentile, benchMid);

  // Walk-away
  const { threshold: walkAway, reason: walkAwayReason } =
    computeWalkAwayThreshold(d, riskFlags, scenarios, percentile);

  // Recommendation
  const { rec, confidence } = deriveRecommendation(
    d.overall_score, leverage, lenderReadiness, riskFlags, pricingInsight.position
  );

  // Trajectory
  const { label: trajectoryLabel, confidence: trajConfidence } = deriveTrajectory(d);

  // Interpretations
  const sdeInterpretation  = buildSdeInterpretation(d);
  const dscrInterpretation = buildDscrInterpretation(scenarios, d.dscr);

  // Target price range = recommended offer range (or computed if absent)
  const targetLow  = d.recommended_offer_low  ?? Math.round(d.fair_value * 0.80);
  const targetHigh = d.recommended_offer_high ?? Math.round(d.fair_value * 0.92);

  // Negotiation posture inputs (consumed by Claude generation in API route)
  const dscrStrength = classifyDscrStrength(d.dscr);
  const negotiationPostureInputs = {
    leverage,
    valuation_gap_pct: round(((d.asking_price - d.fair_value) / d.fair_value) * 100, 1),
    percentile,
    dscr_strength:     dscrStrength,
    risk_severity_mix: {
      high:   riskFlags.filter(f => f.severity === "HIGH").length,
      medium: riskFlags.filter(f => f.severity === "MEDIUM").length,
      low:    riskFlags.filter(f => f.severity === "LOW").length,
    },
    trajectory:         trajectoryLabel,
    deal_breaker_count: riskFlags.filter(f => f.isDealBreaker).length,
  };

  return {
    recommendation:        rec,
    target_price_low:      targetLow,
    target_price_high:     targetHigh,
    confidence,
    leverage,
    lender_readiness:      lenderReadiness,
    stress_scenarios:      scenarios,
    sde_interpretation:    sdeInterpretation,
    dscr_interpretation:   dscrInterpretation,
    risk_flags:            riskFlags,
    trajectory_label:      trajectoryLabel,
    trajectory_confidence: trajConfidence,
    pricing_insight:       pricingInsight,
    walk_away_threshold:   walkAway,
    walk_away_reason:      walkAwayReason,
    negotiation_posture_inputs: negotiationPostureInputs,
  };
}

// ─── Internal helper: monthly payment estimator ─────────────────────────

function estimateMonthlyPayment(
  price: number,
  debtPct: number,
  ratePct: number,
  termYears: number
): number {
  const loanAmount  = price * (debtPct / 100);
  const monthlyRate = (ratePct / 100) / 12;
  const numPayments = termYears * 12;
  if (monthlyRate <= 0 || numPayments <= 0) return loanAmount / 120;
  return (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
         (Math.pow(1 + monthlyRate, numPayments) - 1);
}

// ─── Fallback Negotiation Posture (used if Claude API fails) ────────────

export function buildFallbackPosture(inputs: DecisionLayerResult["negotiation_posture_inputs"]): string {
  const { leverage, percentile, dscr_strength, risk_severity_mix } = inputs;

  if (leverage === "STRONG") {
    if (percentile <= 20) {
      return "Anchor below ask using comp dispersion. Force seller to justify premium with tax-return-verified earnings before validating any pricing range.";
    }
    return "Lead with price discipline. Use comparable transactions to anchor below median - do not let seller framing set the negotiation range.";
  }

  if (leverage === "MODERATE") {
    if (risk_severity_mix.high >= 1) {
      return "Counter at median fair value with structural protection - propose seller note or earn-out tied to risk validation. Do not pay full ask while material risks remain unresolved.";
    }
    return "Anchor near fair-value median. Use diligence findings to push for terms-based concessions if any earnings or operational risks materialize.";
  }

  // WEAK
  if (dscr_strength === "weak") {
    return "Restructure required before negotiation. Reduce leverage, extend term, or require seller financing to bring DSCR above lender threshold - do not proceed with current terms.";
  }
  return "Limited buyer leverage. Seek structural concessions - seller note, earn-out, or escrow holdback - rather than headline price reduction. Validate financials before any LOI.";
}
