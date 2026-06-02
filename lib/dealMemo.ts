// lib/dealMemo.ts
// Deal Memo data layer — generates red flags and diligence questions
// from live deal signals. Pure functions, deterministic, export-ready.
//
// V2.1: Added investigation-required flag for circuit breaker cases,
//        positive signals, neutral diligence items, industry-specific flags.

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
  priority: boolean;
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
    flags.push({ level: "high", text: `Stress DSCR at -15% revenue drops below 1.0x — deal breaks under modest downside.` });
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
    flags.push({ level: "medium", text: `Stressed DSCR of ${d.stressDscr15.toFixed(2)}x at -15% revenue leaves minimal headroom above the 1.0x floor.` });
  }
  if (d.gap_pct != null && d.gap_pct > 15 && d.gap_pct <= 50) {
    flags.push({ level: "medium", text: `Asking price is ${d.gap_pct}% above NexTax fair value — meaningful negotiation margin exists.` });
  }
  if (d.earningsSource === "benchmark_implied") {
    flags.push({ level: "medium", text: `SDE used for scoring was derived from benchmark-implied margins, not reported SDE. Reported SDE may be understated or requires validation.` });
  }
  if (d.industryFit === "higher_scrutiny") {
    flags.push({ level: "medium", text: `Industry attracts higher scrutiny from SBA lenders — prepare additional narrative and documentation.` });
  }
  if (d.owner_operated === true) {
    flags.push({ level: "medium", text: `Owner-operated — business value is heavily tied to the current owner. Transition plan and non-compete are critical.` });
  }
  if (d.customer_concentration === "high") {
    flags.push({ level: "medium", text: `Customer concentration flagged as high — loss of a single customer could materially impact revenue.` });
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

  // ── INVESTIGATION REQUIRED (circuit breaker) ──────────────────────────────
  if (d.manual_review_required && d.trustScore < 40 && d.usableSDE >= d.reportedSDE * 0.95) {
    flags.push({
      level: "high",
      text: `Reported SDE margin materially exceeds industry benchmarks. Earnings verification is required before relying on reported figures. This may reflect a legitimate owner-operated model, aggressive add-backs, or industry misclassification. Obtain 3 years of tax returns and a detailed add-back schedule before advancing.`,
    });
  }

  // ── POSITIVE SIGNALS (green) — fire when deal is clean ────────────────────
  if (d.dscr >= 1.5) {
    const headroom = Math.round(((d.dscr - 1.25) / 1.25) * 100);
    flags.push({
      level: "low",
      text: `DSCR of ${d.dscr.toFixed(2)}x provides ${headroom}% headroom above the 1.25x lender minimum — debt service coverage is strong.`,
    });
  }

  if (d.trustScore >= 85) {
    flags.push({
      level: "low",
      text: `Data confidence score of ${d.trustScore}/100 — reported financials appear credible and internally consistent.`,
    });
  }

  if (d.stressDscr15 >= 1.25) {
    flags.push({
      level: "low",
      text: `Deal survives -15% revenue stress test with DSCR still at ${d.stressDscr15.toFixed(2)}x — resilient under moderate downside.`,
    });
  }

  if (d.gap_pct !== null && d.gap_pct <= -10) {
    flags.push({
      level: "low",
      text: `Asking price is ${Math.abs(d.gap_pct)}% below modeled fair value — favorable entry point if earnings are verified.`,
    });
  }

  if (d.earningsSource === "reported" && d.trustScore >= 80) {
    flags.push({
      level: "low",
      text: `Reported SDE used as underwriting basis without adjustment — no material normalization flags triggered.`,
    });
  }

  // ── NEUTRAL DILIGENCE ITEMS — always surface regardless of deal quality ──
  flags.push({
    level: "medium",
    text: `Verify owner compensation is at or below market replacement cost for this role. Above-market owner comp inflates SDE and will be adjusted by lenders.`,
  });

  flags.push({
    level: "medium",
    text: `Confirm lease term extends at least 3 years beyond acquisition close. Short remaining lease terms create refinancing and relocation risk.`,
  });

  flags.push({
    level: "medium",
    text: `Request customer concentration breakdown — top 5 customers as percentage of revenue. Concentration above 20% in any single customer attracts lender scrutiny.`,
  });

  flags.push({
    level: "medium",
    text: `Validate that reported SDE excludes one-time or non-recurring items (PPP loans, insurance settlements, asset sales).`,
  });

  flags.push({
    level: "medium",
    text: `Confirm no pending litigation, environmental liabilities, or regulatory actions that could impair post-close cash flow.`,
  });

  flags.push({
    level: "medium",
    text: `Request aged accounts receivable report. AR beyond 90 days signals collection risk and may require a working capital adjustment at close.`,
  });

  // ── INDUSTRY-SPECIFIC CONTEXT — fires based on industry key ──────────────
  const industryFlags: Record<string, string> = {
    dental:          "Verify provider retention plan — patient base typically follows the dentist, not the practice. Transition period and non-compete are critical.",
    hvac:            "Confirm all trade licenses transfer with the acquisition. HVAC licensing is state-specific and may require the buyer to be independently licensed.",
    plumbing:        "Confirm all trade licenses transfer with the acquisition. Plumbing licensing is state-specific and may require the buyer to be independently licensed.",
    electrical:      "Confirm all trade licenses transfer with the acquisition. Electrical licensing is state-specific and may require the buyer to be independently licensed.",
    restaurant:      "Verify liquor license transferability and lease assignment for the premises. Both are deal-breakers if non-transferable.",
    daycare:         "Confirm licensing capacity and staff-to-child ratios meet current state requirements. Licensing lapses can shut down operations.",
    insurance:       "Verify book of business retention rates and confirm carrier appointments transfer to the buyer entity.",
    pharmacy:        "Confirm DEA registration and state pharmacy license transfer. Controlled substance handling adds regulatory complexity.",
    medspa:          "Verify medical director agreement transfers or can be renegotiated. Med spas require physician oversight in most states.",
    physicaltherapy: "Confirm provider credentialing with insurance panels transfers. Re-credentialing delays can create a 90-180 day revenue gap.",
    veterinary:      "Verify veterinary license requirements for the acquiring entity. Some states require the practice owner to hold a DVM.",
    seniorcare:      "Confirm state licensing and Medicare/Medicaid certification transfers. Recertification timelines can exceed 6 months.",
    healthcare:      "Verify all provider credentialing, Medicare enrollment, and state licensing transfers with the acquisition.",
    landscaping:     "Confirm pesticide application licenses and any municipal contracts transfer. Seasonal revenue patterns require working capital planning.",
    pestcontrol:     "Confirm all pesticide applicator licenses and regulatory certifications transfer with the acquisition.",
    construction:    "Verify general contractor license transfers and confirm bonding capacity carries over to the new entity.",
    remodeling:      "Verify contractor licensing transfers. Home improvement contractor licensing varies by state and municipality.",
    roofing:         "Confirm contractor license and manufacturer certifications (GAF, Owens Corning, etc.) transfer to the acquiring entity.",
    staffing:        "Verify workers' compensation experience modification rate (EMR). High EMR indicates claims history that affects insurance costs post-close.",
    accounting:      "Confirm client engagement letters are assignable. Accounting practices with non-transferable client relationships lose value rapidly.",
    realestatebrok:  "Verify broker license requirements for the acquiring entity and confirm agent independent contractor agreements are assignable.",
    propertymanage:  "Confirm all property management agreements are assignable without owner consent. Non-assignable contracts reduce transferable value.",
    gym:             "Verify membership contract terms — month-to-month vs annual commitments. High monthly churn rates (>8%) signal retention risk.",
    autorepair:      "Confirm any OEM certifications (ASE, manufacturer-specific) transfer and verify environmental compliance for waste disposal.",
    carwash:         "Verify water reclamation compliance and confirm equipment maintenance history. Car wash equipment replacement is capital-intensive.",
    laundromat:      "Confirm equipment age and replacement schedule. Washer/dryer lifecycle is 7-10 years — equipment nearing end-of-life reduces value.",
    storage:         "Verify occupancy rates over trailing 12 months. Self-storage is highly seasonal — use annualized occupancy, not peak-month figures.",
    cleaning:        "Confirm contract vs recurring revenue split. Cleaning businesses with >60% contract revenue have more defensible cash flows.",
    petcare:         "Verify any required animal handling permits and confirm grooming/boarding facility meets local zoning requirements.",
    ecommerce:       "Verify platform account standing (Amazon, Shopify, etc.) and confirm all IP, trademarks, and supplier agreements transfer.",
    saas:            "Confirm customer churn rate and contract terms. MRR with annual contracts is more defensible than month-to-month subscriptions.",
    printing:        "Verify equipment age and technology relevance. Digital printing equipment depreciates quickly as technology advances.",
    signmaking:      "Verify equipment condition and confirm any municipal sign permit relationships transfer with the business.",
    marketing:       "Verify client contract terms and key employee retention. Agency value is heavily tied to client relationships and creative talent.",
    engineering:     "Confirm professional engineering (PE) license requirements and verify any government contract set-aside eligibility transfers.",
    grocery:         "Verify supplier agreements and confirm any exclusive distribution rights. Grocery operates on thin margins — supplier terms are critical.",
    transportation:  "Verify DOT compliance, CDL driver retention, and confirm all operating authority transfers to the acquiring entity.",
    security:        "Confirm all security guard licenses and alarm installer certifications transfer. State licensing requirements vary significantly.",
    painting:        "Verify contractor licensing and confirm any lead paint abatement certifications if servicing pre-1978 properties.",
    hairsalon:       "Verify booth rental vs employee model. Booth rental salons have lower margins but less payroll risk. Confirm stylist retention plan.",
    clothing:        "Verify inventory valuation methodology and confirm supplier/brand authorization agreements transfer.",
  };

  const industryFlag = industryFlags[d.industry];
  if (industryFlag) {
    flags.push({
      level: "medium",
      text: industryFlag,
    });
  }

  return flags;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DILIGENCE QUESTIONS — 5 categories, deal-signal-aware priority
// ═══════════════════════════════════════════════════════════════════════════════

export function buildDiligenceQuestions(d: DealMemoInput): QuestionGroup[] {
  const lowTrust    = d.trustScore < 70 || d.earningsSource !== "reported";
  const thinDscr    = d.dscr < 1.25 || d.stressDscr15 < 1.15;
  const pricingGap  = (d.gap_pct ?? 0) > 15;
  const ownerRisk   = d.owner_operated === true;
  const custRisk    = d.customer_concentration === "high" || d.customer_concentration === "moderate";

  return [
    {
      category: "financials",
      title:    "Financial Verification",
      items: [
        { text: "Can you provide 3 years of tax returns (business and personal)?", priority: true },
        { text: "What is the detailed add-back schedule? Specifically: owner salary, personal expenses, one-time costs, and discretionary items.", priority: lowTrust },
        { text: "What were the actual cash distributions to the owner in the last 3 years?", priority: true },
        { text: "Are there any outstanding debts, liens, or guarantees not on the balance sheet?", priority: false },
        { text: "What is the current AR aging schedule? Any balances over 90 days?", priority: false },
      ],
    },
    {
      category: "customers",
      title:    "Customer & Revenue Quality",
      items: [
        { text: "What percentage of revenue comes from the top 5 customers?", priority: true },
        { text: "Are customer relationships contractual or month-to-month?", priority: custRisk },
        { text: "Has any customer representing more than 10% of revenue been lost in the past 24 months?", priority: custRisk },
        { text: "What is the customer acquisition cost and typical lifetime value?", priority: false },
        { text: "Is revenue seasonal? What does the monthly P&L look like?", priority: false },
      ],
    },
    {
      category: "operations",
      title:    "Operational & Staffing",
      items: [
        { text: "How many hours per week does the owner work? What are their primary responsibilities?", priority: ownerRisk },
        { text: "Which employees are critical to operations, and are there retention agreements in place?", priority: true },
        { text: "What systems, tools, or software does the business rely on? Are all licenses transferable?", priority: false },
        { text: "Are there any upcoming capital expenditure needs (equipment, vehicles, technology)?", priority: false },
        { text: "What is the current employee turnover rate?", priority: false },
      ],
    },
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

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION TRIGGERS — proceed / reevaluate / walk-away criteria
// ═══════════════════════════════════════════════════════════════════════════════

export interface DecisionTriggers {
  proceedIf:    string[];
  reevaluateIf: string[];
  walkAwayIf:   string[];
}

export function buildDecisionTriggers(d: DealMemoInput): DecisionTriggers {
  const lowTrust    = d.trustScore < 70 || d.earningsSource !== "reported";
  const thinDscr    = d.dscr < 1.25 || d.stressDscr15 < 1.15;
  const pricingGap  = (d.gap_pct ?? 0) > 15;
  const ownerRisk   = d.owner_operated === true;
  const custRisk    = d.customer_concentration === "high" || d.customer_concentration === "moderate";
  const industryRisk = d.industryFit === "higher_scrutiny" || d.industryFit === "sba_ineligible";

  const proceedIf: string[] = [
    "3 years of tax returns validate reported SDE within 5%",
    "No single customer represents more than 25% of revenue",
    "Lease is assignable with no adverse change in terms",
  ];
  if (lowTrust) {
    proceedIf.push("Add-backs are supported by itemized documentation or CPA review");
  }
  if (ownerRisk) {
    proceedIf.push("Seller commits to a 60-90 day transition and customer introductions");
  }

  const reevaluateIf: string[] = [
    "Add-backs are not supported by source documentation",
    "Revenue declines more than 10% in the trailing 12 months",
    "A key employee signals departure risk during diligence",
  ];
  if (pricingGap) {
    reevaluateIf.push("Seller is unwilling to negotiate closer to NexTax fair value");
  }
  if (thinDscr) {
    reevaluateIf.push("Lender prequal requires larger equity injection or additional collateral");
  }
  if (industryRisk) {
    reevaluateIf.push("SBA lender declines the industry or applies restrictive overlays");
  }

  const walkAwayIf: string[] = [
    "Earnings quality materially deteriorates — tax returns contradict stated SDE",
    "Legal, regulatory, or liability issues are uncovered in diligence",
    "Seller is unwilling to support transition or any deal structure flexibility",
  ];
  if (custRisk) {
    walkAwayIf.push("Top customers indicate they will not continue post-sale");
  }
  if (d.dscr < 1.0) {
    walkAwayIf.push("Seller refuses pricing adjustment needed to restore debt coverage");
  }

  return { proceedIf, reevaluateIf, walkAwayIf };
}
