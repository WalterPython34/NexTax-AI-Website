// lib/lenderReadiness.ts
// Lender Readiness — SBA-style prequal assessment based on real lender signals
// (Rob/Fidelity Bank + Kevin's general lender guidance).
//
// Export-ready structured output for future PDF generation.

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type LenderVerdict =
  | "likely_financeable"
  | "borderline"
  | "not_financeable"
  | "manual_review";

export type IndustryFit =
  | "preferred"
  | "standard"
  | "higher_scrutiny"
  | "sba_ineligible"
  | "requires_review";

export type DocState =
  | "complete"
  | "missing"
  | "unknown"
  | "not_applicable";

export interface DocItem {
  id:    string;
  label: string;
  state: DocState;
  note?: string;
}

export interface DocGroup {
  id:    "seller" | "buyer" | "affiliate" | "acquisition";
  title: string;
  items: DocItem[];
}

export interface LenderReadinessInput {
  asking_price:          number;
  usableSDE:             number;
  dscr:                  number;
  stressDscr15:          number;
  stressDscr25:          number;
  industry:              string;
  trustScore:            number;
  earningsSource:        "reported" | "blended" | "benchmark_implied";
  fair_value:            number;
  gap_pct:               number | null;
  valuation_multiple:    number;
  owner_operated?:       boolean | null;
  customer_concentration?: string | null;
  has_real_estate?:      boolean | null;
  buyer_owns_other_biz?: boolean | null;
}

export interface LenderMetric {
  label:  string;
  value:  string;
  status: "pass" | "warn" | "fail" | "info";
  note?:  string;
}

export interface WhyBullet {
  text:     string;
  severity: "positive" | "neutral" | "warning" | "critical";
}

export interface ImprovementAction {
  text:     string;
  priority: "critical" | "high" | "standard";
}

export interface LenderReadinessOutput {
  verdict:        LenderVerdict;
  verdictLabel:   string;
  verdictMessage: string;
  prequalOutlook: string;
  metrics:        LenderMetric[];
  whyBullets:     WhyBullet[];
  docGroups:      DocGroup[];
  industryFit:    { state: IndustryFit; label: string; note: string };
  improvements:   ImprovementAction[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDUSTRY FIT CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const INDUSTRY_FIT: Record<string, IndustryFit> = {
  // ── Preferred — lender-favored, predictable cash flow ──
  healthcare_clinical:   "preferred",
  med_spa:               "preferred",
  physical_therapy:      "preferred",
  veterinary:            "preferred",
  professional_services: "preferred",
  engineering:           "preferred",
  specialty_trade:       "preferred",     // HVAC / plumbing / electrical
  manufacturing:         "preferred",
  seniorcare:            "preferred",
  behavioral_health:     "preferred",
  propertymanage:        "preferred",     // recurring-revenue model
  saas:                  "preferred",     // high-margin recurring
  marketing:             "preferred",     // agency recurring revenue
  digital:               "preferred",

  // ── Standard / Financeable — normal underwriting, no red flags ──
  construction:          "standard",      // financeable for established contractors
  wholesale:             "standard",
  auto_services:         "standard",
  remodeling:            "standard",
  pestcontrol:           "standard",
  signmaking:            "standard",
  personal_services:     "standard",
  hairsalon:             "standard",
  retail:                "standard",
  clothing:              "standard",
  realestatebrok:        "standard",

  // ── Higher Scrutiny — financeable but closer lender review ──
  food_beverage:         "higher_scrutiny",   // thin margins, concept risk
  grocery:               "higher_scrutiny",   // very thin margins
  staffing:              "higher_scrutiny",   // customer concentration common
  field_services:        "higher_scrutiny",   // owner dependency common

  // ── SBA-ineligible or heavily restricted ──
  cannabis:              "sba_ineligible",
  gambling:              "sba_ineligible",
  adult_entertainment:   "sba_ineligible",
  passive_real_estate:   "sba_ineligible",
  investment_firm:       "sba_ineligible",
  non_profit:            "sba_ineligible",
  multi_level_marketing: "sba_ineligible",
  pyramid_sales:         "sba_ineligible",
};

export const INDUSTRY_FIT_LABEL: Record<IndustryFit, string> = {
  preferred:        "Preferred Industry",
  standard:         "Standard / Financeable",
  higher_scrutiny:  "Higher Scrutiny",
  sba_ineligible:   "Ineligible",
  requires_review:  "Requires Lender Review",
};

export const INDUSTRY_FIT_NOTE: Record<IndustryFit, string> = {
  preferred:
    "Lenders generally favor this industry for SBA 7(a) financing based on predictable cash flow and established underwriting precedent.",
  standard:
    "This industry is routinely financed under standard SBA 7(a) terms. Normal underwriting applies — no industry-specific red flags.",
  higher_scrutiny:
    "This industry is financeable but typically receives closer lender review on margins, customer concentration, or key-person risk.",
  sba_ineligible:
    "This industry is generally ineligible for SBA 7(a) financing. Alternative financing structures will be required.",
  requires_review:
    "Industry classification is unclear — individual lenders will need to confirm eligibility before prequal.",
};

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const VERDICT_CONFIG: Record<LenderVerdict, { label: string; message: (d: LenderReadinessInput) => string }> = {
  likely_financeable: {
    label: "Likely Financeable",
    message: () => "This deal appears supportable under standard SBA debt terms. Expect a straightforward prequal once documents are complete.",
  },
  borderline: {
    label: "Borderline",
    message: (d) => d.dscr < 1.30
      ? `Base DSCR of ${d.dscr.toFixed(2)}x meets minimums but leaves limited headroom. Expect lender scrutiny on earnings quality and stress scenarios.`
      : "Deal sits at the edge of lender thresholds. Structure adjustments or additional equity may be needed.",
  },
  not_financeable: {
    label: "Not Financeable",
    message: (d) => d.dscr < 1.0
      ? `Debt coverage falls below lender thresholds at current pricing. DSCR of ${d.dscr.toFixed(2)}x cannot service standard SBA debt.`
      : `Pricing or earnings quality prevent standard SBA financing at current terms.`,
  },
  manual_review: {
    label: "Needs Manual Review",
    message: () => "Reported earnings are too weak or unreliable to support automated lender confidence. Independent financial review recommended before prequal.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

function computeVerdict(d: LenderReadinessInput, fit: IndustryFit): LenderVerdict {
  if (fit === "sba_ineligible") return "not_financeable";
  if (d.trustScore < 45)        return "manual_review";
  if (d.earningsSource === "benchmark_implied" && d.trustScore < 60) return "manual_review";

  if (d.asking_price > 5_000_000)       return "not_financeable";
  if (d.dscr < 1.0)                     return "not_financeable";
  if (d.stressDscr15 < 1.0)             return "not_financeable";

  if (d.dscr < 1.25)                    return "borderline";
  if (d.stressDscr15 < 1.15)            return "borderline";
  if (d.trustScore < 70)                return "borderline";
  // Higher-scrutiny industries at thin DSCR → borderline (closer review expected)
  if (fit === "higher_scrutiny" && d.dscr < 1.40) return "borderline";

  return "likely_financeable";
}

function buildMetrics(d: LenderReadinessInput): LenderMetric[] {
  const earningsLabel =
    d.earningsSource === "benchmark_implied" ? "Benchmark-implied"
    : d.earningsSource === "blended"         ? "Adjusted (blended)"
    :                                          "Reported / Usable";

  return [
    {
      label: "Base DSCR",
      value: d.dscr.toFixed(2) + "x",
      status: d.dscr >= 1.25 ? "pass" : d.dscr >= 1.0 ? "warn" : "fail",
      note: d.dscr < 1.25 ? "Below SBA 1.25x minimum" : "Meets SBA minimum",
    },
    {
      label: "Stress DSCR (−15%)",
      value: d.stressDscr15.toFixed(2) + "x",
      status: d.stressDscr15 >= 1.15 ? "pass" : d.stressDscr15 >= 1.0 ? "warn" : "fail",
      note: d.stressDscr15 < 1.0 ? "Collapses under modest stress" : d.stressDscr15 < 1.15 ? "Thin under stress" : "Holds under moderate stress",
    },
    {
      label: "Stress DSCR (−25%)",
      value: d.stressDscr25.toFixed(2) + "x",
      status: d.stressDscr25 >= 1.0 ? "pass" : d.stressDscr25 >= 0.85 ? "warn" : "fail",
      note: d.stressDscr25 < 1.0 ? "Breaks under heavy stress" : "Survives heavy stress",
    },
    {
      label: "SBA 7(a) Eligibility",
      value: (d.dscr >= 1.25 && d.asking_price <= 5_000_000) ? "Yes" : "No",
      status: (d.dscr >= 1.25 && d.asking_price <= 5_000_000) ? "pass" : "fail",
      note: d.asking_price > 5_000_000 ? "Exceeds $5M 7(a) limit" : d.dscr < 1.25 ? "DSCR below threshold" : "Within 7(a) parameters",
    },
    {
      label: "Loan Size Fit",
      value: d.asking_price <= 5_000_000 ? "Pass" : "Fail",
      status: d.asking_price <= 5_000_000 ? "pass" : "fail",
      note: d.asking_price > 5_000_000 ? "$5M+ requires 7(a) + pari-passu or conventional" : `$${(d.asking_price / 1_000_000).toFixed(2)}M within 7(a) cap`,
    },
    {
      label: "Earnings Basis",
      value: earningsLabel,
      status: d.earningsSource === "reported" ? "pass" : d.earningsSource === "blended" ? "warn" : "fail",
      note: d.earningsSource === "benchmark_implied"
        ? "Reported financials set aside — lender will require verification"
        : d.earningsSource === "blended"
        ? "Conservative blend applied — some reported figures discounted"
        : "Reported earnings accepted",
    },
  ];
}

function buildWhyBullets(d: LenderReadinessInput, fit: IndustryFit, verdict: LenderVerdict): WhyBullet[] {
  const bullets: WhyBullet[] = [];

  if (fit === "sba_ineligible") {
    bullets.push({ text: "This industry is generally ineligible for SBA 7(a) financing.", severity: "critical" });
  }

  if (d.asking_price > 5_000_000) {
    bullets.push({ text: `Asking price of $${(d.asking_price / 1_000_000).toFixed(2)}M exceeds the $5M SBA 7(a) limit.`, severity: "critical" });
  }

  if (d.dscr < 1.0) {
    bullets.push({ text: `Base DSCR of ${d.dscr.toFixed(2)}x fails to service standard debt — deal cannot clear lender underwriting at current pricing.`, severity: "critical" });
  } else if (d.dscr < 1.25) {
    bullets.push({ text: `Base DSCR of ${d.dscr.toFixed(2)}x is below the 1.25x SBA minimum.`, severity: "warning" });
  } else if (d.dscr >= 1.50) {
    bullets.push({ text: `Base DSCR of ${d.dscr.toFixed(2)}x provides solid coverage above lender minimums.`, severity: "positive" });
  } else {
    bullets.push({ text: `Base DSCR of ${d.dscr.toFixed(2)}x meets SBA minimums but leaves limited headroom.`, severity: "neutral" });
  }

  if (d.stressDscr15 < 1.0) {
    bullets.push({ text: `Stress-tested coverage collapses below 1.0x at −15% revenue — lenders will flag downside fragility.`, severity: "critical" });
  } else if (d.stressDscr15 < 1.15) {
    bullets.push({ text: `Stressed DSCR of ${d.stressDscr15.toFixed(2)}x is thin under modest downside — expect lender pushback on earnings quality.`, severity: "warning" });
  }

  if (d.trustScore < 60) {
    bullets.push({ text: `Data confidence score of ${d.trustScore}/100 — reported financials appear unreliable and will require independent verification.`, severity: "critical" });
  } else if (d.trustScore < 80) {
    bullets.push({ text: `Data confidence score of ${d.trustScore}/100 — verified tax returns will be needed before any lender commits.`, severity: "warning" });
  }

  if (d.earningsSource === "benchmark_implied") {
    bullets.push({ text: "Underwriting uses benchmark-implied earnings because reported financials were set aside. Lender review required.", severity: "warning" });
  } else if (d.earningsSource === "blended") {
    bullets.push({ text: "Adjusted earnings are in use because reported financials appeared elevated versus industry norms.", severity: "neutral" });
  }

  if (d.gap_pct != null && d.gap_pct > 20) {
    bullets.push({ text: `Asking price is ${d.gap_pct}% above market fair value — pricing materially compresses lender coverage.`, severity: "warning" });
  }

  if (fit === "preferred") {
    bullets.push({ text: "Industry is typically preferred by SBA-active lenders.", severity: "positive" });
  } else if (fit === "standard") {
    bullets.push({ text: "Industry is routinely financed under standard SBA terms.", severity: "neutral" });
  } else if (fit === "higher_scrutiny" && verdict !== "not_financeable") {
    bullets.push({ text: "Industry typically receives closer lender review — expect questions on customer mix, margins, and key-person risk.", severity: "neutral" });
  }

  if (d.owner_operated) {
    bullets.push({ text: "Owner-operated structure — lenders will assess key-person risk and transition plan during prequal.", severity: "neutral" });
  }

  if (d.customer_concentration === "high") {
    bullets.push({ text: "High customer concentration — lenders typically require top-5 customer schedule and retention commentary.", severity: "warning" });
  }

  return bullets;
}

function buildDocGroups(d: LenderReadinessInput): DocGroup[] {
  const seller: DocGroup = {
    id: "seller",
    title: "Seller Package",
    items: [
      { id: "sp-01", label: "Interim financials (≤ 90 days) — balance sheet & income statement", state: "unknown", note: "Required by most SBA lenders" },
      { id: "sp-02", label: "3 years federal business tax returns", state: "unknown" },
      { id: "sp-03", label: "Confidential Information Memorandum (CIM)", state: "unknown" },
    ],
  };

  const buyer: DocGroup = {
    id: "buyer",
    title: "Buyer / Personal Package",
    items: [
      { id: "bp-01", label: "SBA Form 413 signed by all principals and spouses", state: "unknown", note: "Personal financial statement" },
      { id: "bp-02", label: "Evidence of equity injection source", state: "unknown", note: "10% minimum — may include seller note on full standby" },
      { id: "bp-03", label: "3 years personal tax returns", state: "unknown" },
      { id: "bp-04", label: "Personal credit report or recent screenshot", state: "unknown" },
      { id: "bp-05", label: "Buyer resume with relevant industry experience", state: "unknown" },
    ],
  };

  const affiliate: DocGroup = {
    id: "affiliate",
    title: "Affiliate Business Package",
    items: d.buyer_owns_other_biz === false
      ? [{ id: "af-na", label: "No affiliate businesses disclosed", state: "not_applicable" }]
      : [
          { id: "af-01", label: "Interim affiliate financials (≤ 90 days)", state: "unknown" },
          { id: "af-02", label: "Business debt schedule for each affiliate", state: "unknown" },
          { id: "af-03", label: "3 years affiliate tax returns including K-1s", state: "unknown" },
        ],
  };

  const acquisition: DocGroup = {
    id: "acquisition",
    title: "Acquisition Package",
    items: [
      { id: "ac-01", label: "Executed LOI or IOI", state: "unknown" },
      { id: "ac-02", label: "Rough purchase price allocation (goodwill / assets / non-compete)", state: "unknown", note: "Affects SBA goodwill caps" },
      { id: "ac-03", label: "Working capital breakdown and peg", state: "unknown" },
    ],
  };

  return [seller, buyer, affiliate, acquisition];
}

function buildImprovements(d: LenderReadinessInput, fit: IndustryFit, verdict: LenderVerdict): ImprovementAction[] {
  const actions: ImprovementAction[] = [];

  // Critical — these prevent financing entirely
  if (d.dscr < 1.25 && d.usableSDE > 0) {
    const requiredAnnualDS = d.usableSDE / 1.25;
    const currentAnnualDS  = d.usableSDE / Math.max(d.dscr, 0.01);
    const reductionFactor  = requiredAnnualDS / currentAnnualDS;
    const targetLoan       = d.asking_price * 0.90 * reductionFactor;
    const targetPrice      = targetLoan / 0.90;
    const reductionPct     = Math.round((1 - targetPrice / d.asking_price) * 100);
    if (reductionPct > 0 && reductionPct < 60) {
      actions.push({
        text: `Reduce price by approximately ${reductionPct}% (to ~$${(targetPrice / 1_000_000).toFixed(2)}M) to restore DSCR above 1.25x at current earnings.`,
        priority: "critical",
      });
    }
  }

  if (d.trustScore < 60) {
    actions.push({
      text: "Obtain CPA-reviewed or tax-return-verified financials before approaching lenders — reported SDE is unlikely to pass underwriting scrutiny as-is.",
      priority: "critical",
    });
  }

  if (d.asking_price > 5_000_000) {
    actions.push({
      text: "Consider pari-passu SBA + conventional structure or pure conventional financing — deal exceeds $5M SBA 7(a) cap.",
      priority: "critical",
    });
  }

  if (fit === "sba_ineligible") {
    actions.push({
      text: "Pursue conventional or specialty financing — industry is SBA-ineligible regardless of deal metrics.",
      priority: "critical",
    });
  }

  // High — materially improve lender confidence
  if (d.earningsSource !== "reported") {
    actions.push({
      text: "Use adjusted earnings (not broker-stated SDE) in all lender conversations — discrepancies surface during underwriting and erode credibility.",
      priority: "high",
    });
  }

  if (d.stressDscr15 < 1.15) {
    actions.push({
      text: "Prepare downside-scenario commentary (revenue concentration, seasonality, customer retention) — lenders will ask.",
      priority: "high",
    });
  }

  if (d.owner_operated) {
    actions.push({
      text: "Document transition plan and key-person mitigations — owner-dependent revenue is a common prequal blocker.",
      priority: "high",
    });
  }

  if (d.customer_concentration === "high") {
    actions.push({
      text: "Prepare top-5 customer schedule with relationship duration and contractual commitments.",
      priority: "high",
    });
  }

  // Standard — complete the package
  actions.push({
    text: "Confirm working capital requirements at close — most SBA loans include a working capital line or component.",
    priority: "standard",
  });

  actions.push({
    text: "Secure 30–90 day seller training commitment in the LOI — reduces transition risk in the lender's view.",
    priority: "standard",
  });

  // Sort by priority
  const order: Record<string, number> = { critical: 0, high: 1, standard: 2 };
  return actions.sort((a, b) => order[a.priority] - order[b.priority]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

function computePrequalOutlook(verdict: LenderVerdict, fit: IndustryFit): string {
  if (fit === "sba_ineligible") {
    return "SBA path is closed — alternative financing will be required before prequal can advance.";
  }
  if (verdict === "likely_financeable") {
    return fit === "preferred"
      ? "Strong candidate once seller and buyer document package is assembled."
      : "Financeability appears strong — next gating factor is documentation completeness.";
  }
  if (verdict === "borderline") {
    return "Coverage is thin — prequal will depend on earnings quality documentation and lender appetite.";
  }
  if (verdict === "manual_review") {
    return "Lender engagement should wait until earnings quality is verified via tax returns or CPA review.";
  }
  // not_financeable
  return "Current structure will not clear standard prequal — price, earnings, or deal size need to change before lender outreach.";
}

export function buildLenderReadiness(d: LenderReadinessInput): LenderReadinessOutput {
  const fit     = INDUSTRY_FIT[d.industry] ?? "requires_review";
  const verdict = computeVerdict(d, fit);
  const cfg     = VERDICT_CONFIG[verdict];

  return {
    verdict,
    verdictLabel:   cfg.label,
    verdictMessage: cfg.message(d),
    prequalOutlook: computePrequalOutlook(verdict, fit),
    metrics:        buildMetrics(d),
    whyBullets:     buildWhyBullets(d, fit, verdict),
    docGroups:      buildDocGroups(d),
    industryFit: {
      state: fit,
      label: INDUSTRY_FIT_LABEL[fit],
      note:  INDUSTRY_FIT_NOTE[fit],
    },
    improvements: buildImprovements(d, fit, verdict),
  };
}
