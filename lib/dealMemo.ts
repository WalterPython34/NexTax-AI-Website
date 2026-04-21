// lib/dealMemo.ts
// Deal Memo data layer — generates red flags and diligence questions
// from live deal signals. Pure functions, deterministic, export-ready.

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RiskLevel = "high" | "medium" | "low";

export interface RiskFlag {
  level: RiskLevel;
  text:  string;
}

export type QuestionCategory =
  | "financials"
  | "customers"
  | "operations"
  | "legal"
  | "transition";

export interface DiligenceQuestion {
  text:     string;
  priority: boolean;   // true if flagged as high-priority by deal signals
}

export interface QuestionGroup {
  category: QuestionCategory;
  title:    string;
  items:    DiligenceQuestion[];
}

export interface DealMemoInput {
  asking_price:           number;
  usableSDE:              number;
  reportedSDE:            number;
  dscr:                   number;
  stressDscr15:           number;
  stressDscr25:           number;
  industry:               string;
  industryFit:            "preferred" | "standard" | "higher_scrutiny" | "sba_ineligible" | "requires_review";
  trustScore:             number;
  earningsSource:         "reported" | "blended" | "benchmark_implied";
  gap_pct:                number | null;
  valuation_multiple:     number;
  owner_operated?:        boolean | null;
  customer_concentration?: string | null;
  has_real_estate?:       boolean | null;
  years_in_business?:     number | null;
  manual_review_required?: boolean | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RED FLAGS — dynamic by deal signal
// ═══════════════════════════════════════════════════════════════════════════════

export function buildRiskFlags(d: DealMemoInput): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // ── HIGH RISK ──────────────────────────────────────────────────────────────
  if (d.dscr < 1.0) {
    flags.push({ level: "high", text: `DSCR of ${d.dscr.toFixed(2)}x cannot service standard debt — financing is not viable at current terms.` });
  }
  if (d.stressDscr15 < 1.0) {
    flags.push({ level: "high", text: `Stress DSCR at −15% revenue drops below 1.0x — deal breaks under modest downside.` });
  }
  if (d.asking_price > 5_000_000) {
    flags.push({ level: "high", text: `Asking price exceeds $5M SBA 7(a) cap — standard SBA financing is closed.` });
  }
  if (d.industryFit === "sba_ineligible") {
    flags.push({ level: "high", text: `Industry is generally ineligible for SBA 7(a) financing.` });
  }
  if (d.trustScore < 45 || d.manual_review_required) {
    flags.push({ level: "high", text: `Data confidence of ${d.trustScore}/100 — reported financials require independent verification before any offer.` });
  }
  if (d.gap_pct != null && d.gap_pct > 50) {
    flags.push({ level: "high", text: `Asking price is ${d.gap_pct}% above NexTax fair value — pricing disconnect from market reality.` });
  }

  // ── MEDIUM RISK ────────────────────────────────────────────────────────────
  if (d.dscr >= 1.0 && d.dscr < 1.25) {
    flags.push({ level: "medium", text: `DSCR of ${d.dscr.toFixed(2)}x sits below the 1.25x SBA minimum — financing is at risk without equity injection.` });
  }
  if (d.stressDscr15 >= 1.0 && d.stressDscr15 < 1.15) {
    flags.push({ level: "medium", text: `Stressed DSCR of ${d.stressDscr15.toFixed(2)}x is thin under modest downside — margin for error is low.` });
  }
  if (d.earningsSource === "benchmark_implied") {
    flags.push({ level: "medium", text: `Underwriting uses benchmark-implied earnings — reported SDE was unreliable.` });
  } else if (d.earningsSource === "blended") {
    flags.push({ level: "medium", text: `Adjusted earnings in use — reported SDE appeared elevated vs industry norms.` });
  }
  if (d.trustScore >= 45 && d.trustScore < 70) {
    flags.push({ level: "medium", text: `Data confidence of ${d.trustScore}/100 — tax return verification needed before LOI.` });
  }
  if (d.gap_pct != null && d.gap_pct > 15 && d.gap_pct <= 50) {
    flags.push({ level: "medium", text: `Asking price is ${d.gap_pct}% above fair value — expect meaningful price negotiation.` });
  }
  if (d.customer_concentration === "high") {
    flags.push({ level: "medium", text: `High customer concentration — revenue may not transfer cleanly to a new owner.` });
  }
  if (d.owner_operated) {
    flags.push({ level: "medium", text: `Owner-operated — revenue may depend on personal relationships and seller's daily involvement.` });
  }
  if (d.industryFit === "higher_scrutiny") {
    flags.push({ level: "medium", text: `Industry receives closer lender review — margins, concentration, or key-person risk will be probed.` });
  }

  // ── LOW RISK ───────────────────────────────────────────────────────────────
  if (d.dscr >= 1.25 && d.dscr < 1.50) {
    flags.push({ level: "low", text: `DSCR of ${d.dscr.toFixed(2)}x meets minimums but leaves limited headroom above lender thresholds.` });
  }
  if (d.customer_concentration === "moderate") {
    flags.push({ level: "low", text: `Moderate customer concentration — worth understanding top-5 customer mix.` });
  }
  if (d.years_in_business != null && d.years_in_business < 5) {
    flags.push({ level: "low", text: `Business has operated fewer than 5 years — limited history for lender underwriting.` });
  }
  if (d.has_real_estate) {
    flags.push({ level: "low", text: `Real estate included — Phase I environmental and title review will extend timeline.` });
  }
  if (d.trustScore >= 70 && d.trustScore < 85) {
    flags.push({ level: "low", text: `Data confidence of ${d.trustScore}/100 — standard verification procedures apply.` });
  }

  return flags;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DILIGENCE QUESTIONS — 5 categories, deal-signal-aware priority
// ═══════════════════════════════════════════════════════════════════════════════

export function buildDiligenceQuestions(d: DealMemoInput): QuestionGroup[] {
  // Deal signals that raise priority on specific questions
  const lowTrust    = d.trustScore < 70 || d.earningsSource !== "reported";
  const thinDscr    = d.dscr < 1.25 || d.stressDscr15 < 1.15;
  const pricingGap  = (d.gap_pct ?? 0) > 15;
  const ownerRisk   = d.owner_operated === true;
  const custRisk    = d.customer_concentration === "high" || d.customer_concentration === "moderate";

  return [
    // ── 1. FINANCIALS ─────────────────────────────────────────────────────────
    {
      category: "financials",
      title:    "Financials",
      items: [
        { text: "Can you provide 3 years of federal business tax returns and matching P&L statements?", priority: lowTrust },
        { text: "What does the itemized add-back schedule look like, and is there documentation for each adjustment?", priority: lowTrust },
        { text: "What owner compensation and benefits are included in the add-backs?", priority: true },
        { text: "How do last-twelve-months results compare to the same period a year ago?", priority: false },
        { text: "Have there been any one-time revenue events or non-recurring costs in the trailing financials?", priority: lowTrust },
      ],
    },

    // ── 2. CUSTOMERS & REVENUE ────────────────────────────────────────────────
    {
      category: "customers",
      title:    "Customers & Revenue",
      items: [
        { text: "What percentage of revenue comes from the top 5 customers, and how long have those relationships existed?", priority: custRisk },
        { text: "Are customer contracts in place, and are they transferable to a new owner?", priority: custRisk },
        { text: "What is the customer retention rate over the past 3 years?", priority: false },
        { text: "How are new customers acquired, and what role does the owner play in sales?", priority: ownerRisk },
        { text: "Have any major customers left in the past 12 months, and why?", priority: false },
      ],
    },

    // ── 3. OPERATIONS ─────────────────────────────────────────────────────────
    {
      category: "operations",
      title:    "Operations",
      items: [
        { text: "Which employees are critical to operations, and what is their tenure?", priority: ownerRisk },
        { text: "What does a typical week look like for the current owner?", priority: ownerRisk },
        { text: "Are there documented SOPs, training materials, or operating manuals?", priority: ownerRisk },
        { text: "What software systems run the business, and are any licenses tied to the current owner?", priority: false },
        { text: "What capital expenditures are expected in the next 12–24 months?", priority: false },
      ],
    },

    // ── 4. LEGAL & RISK ───────────────────────────────────────────────────────
    {
      category: "legal",
      title:    "Legal & Risk",
      items: [
        { text: "Is the current lease assignable, and has the landlord been approached about transfer?", priority: true },
        { text: "Are there any pending lawsuits, regulatory actions, or customer complaints on file?", priority: false },
        { text: "What is the scope of the seller non-compete (geography, duration, activities)?", priority: false },
        { text: "Are all business licenses, permits, and certifications current and transferable?", priority: false },
        { text: "Are there any UCC liens, tax liens, or judgments against the business?", priority: false },
      ],
    },

    // ── 5. TRANSITION ─────────────────────────────────────────────────────────
    {
      category: "transition",
      title:    "Transition",
      items: [
        { text: "How long are you willing to stay on for training and transition?", priority: true },
        { text: "Would you consider a seller note, earnout, or other deferred compensation?", priority: pricingGap },
        { text: "Are you willing to introduce me to the top customers personally during transition?", priority: custRisk },
        { text: "What is your timeline for closing, and are there other parties already in diligence?", priority: false },
        { text: "What non-compete and non-solicitation terms are you prepared to sign at close?", priority: false },
      ],
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY — aggregate counts for dashboard display
// ═══════════════════════════════════════════════════════════════════════════════

export function summarizeRiskFlags(flags: RiskFlag[]): { high: number; medium: number; low: number } {
  return {
    high:   flags.filter(f => f.level === "high").length,
    medium: flags.filter(f => f.level === "medium").length,
    low:    flags.filter(f => f.level === "low").length,
  };
}
