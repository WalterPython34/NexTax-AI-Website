// lib/tooltipContent.ts
//
// Centralized tooltip copy for all financial / deal metrics.
// One source of truth — edit here, changes everywhere.
//
// Structure per term:
//   title       — the metric name (shown bold in the tooltip header)
//   description — plain English, 1–2 lines (what it is)
//   insight     — 1 line (why it matters for this deal)
//   good        — optional, what "good" looks like
//   bad         — optional, what "bad" looks like
//   learnMore   — optional, link to deeper content (future)

export interface TooltipEntry {
  title:       string;
  description: string;
  insight:     string;
  good?:       string;
  bad?:        string;
  learnMore?:  string;
}

export const TOOLTIP_CONTENT: Record<string, TooltipEntry> = {
  // ── 1. FINANCIAL METRICS ──────────────────────────────────────────────────
  revenue: {
    title:       "Revenue",
    description: "Total annual sales the business generates.",
    insight:     "Growth matters more than size — flat or declining revenue is a risk signal.",
  },
  sde: {
    title:       "SDE (Seller's Discretionary Earnings)",
    description: "Cash flow available to a single working owner before debt service.",
    insight:     "Your starting point for what you might earn as the new owner.",
  },
  ebitda: {
    title:       "EBITDA",
    description: "Profit before interest, taxes, depreciation, and amortization.",
    insight:     "Used for larger deals — less relevant for owner-operator SMBs.",
  },
  adjustedSDE: {
    title:       "Adjusted SDE",
    description: "SDE after normalizing expenses and removing one-time items.",
    insight:     "This is the number buyers should rely on — not the seller's stated SDE.",
  },
  usableSDE: {
    title:       "Usable SDE",
    description: "SDE adjusted for data quality, benchmark reasonableness, and add-back risk.",
    insight:     "Our most defensible earnings figure — what lenders would underwrite.",
  },
  freeCashFlow: {
    title:       "Free Cash Flow (Post-Debt)",
    description: "Cash left after annual loan payments and required reinvestment.",
    insight:     "This is your actual take-home — the number that matters for living.",
    good:        "Strong FCF means headroom for reinvestment, downside, or owner draws.",
    bad:         "Thin FCF leaves no margin for unexpected slowdowns.",
  },

  // ── 2. MULTIPLES & VALUATION ──────────────────────────────────────────────
  askingMultiple: {
    title:       "Asking Multiple",
    description: "Asking price divided by SDE or EBITDA.",
    insight:     "Higher multiple = more expensive deal relative to earnings.",
  },
  valuationMultiple: {
    title:       "Valuation Multiple",
    description: "Asking price ÷ SDE. The fundamental pricing ratio.",
    insight:     "Compare to the industry benchmark range — outliers require justification.",
    good:        "Within or below the industry median band.",
    bad:         "Significantly above benchmark without a clear quality reason.",
  },
  impliedMultiple: {
    title:       "Implied Multiple (Adjusted)",
    description: "Asking price relative to ADJUSTED earnings.",
    insight:     "Often reveals the deal is more expensive than the stated multiple suggests.",
  },
  marketMultiple: {
    title:       "Market Multiple",
    description: "Typical valuation multiple for similar businesses in this industry.",
    insight:     "Your primary benchmark — deals inside this range are market-consistent.",
  },
  valuationGap: {
    title:       "Valuation Gap",
    description: "Percent difference between asking price and our fair value estimate.",
    insight:     "Large positive gap = overpriced; large negative gap = potential opportunity.",
    good:        "Gap within ±10% — pricing aligned with fundamentals.",
    bad:         "Gap above +25% — negotiation or walk-away territory.",
  },
  fairValue: {
    title:       "NexTax Fair Value",
    description: "Our estimate of what this deal should be priced at, given SDE and industry benchmarks.",
    insight:     "Use as your anchor — deviations from this need justification.",
  },
  percentile: {
    title:       "Percentile Positioning",
    description: "Where this deal's multiple sits relative to actual closed transactions.",
    insight:     "Tells you if the price is 'in-market' or an outlier from closed-deal reality.",
    good:        "Below 50th percentile — priced better than half of comparable closed deals.",
    bad:         "Above 85th percentile — priced richer than nearly all comparable deals.",
  },

  // ── 3. FINANCING & RISK ───────────────────────────────────────────────────
  debtService: {
    title:       "Debt Service",
    description: "Annual loan payments (principal + interest).",
    insight:     "Your largest fixed cost post-close — must be comfortably covered by SDE.",
  },
  dscr: {
    title:       "DSCR (Debt Service Coverage Ratio)",
    description: "Cash flow ÷ annual debt payments.",
    insight:     "Lenders require at least 1.25x. Above 1.50x is comfortable.",
    good:        "1.50x+ — solid headroom, financing straightforward.",
    bad:         "Below 1.25x — SBA and most banks will decline.",
  },
  stressDscr: {
    title:       "Stressed DSCR",
    description: "DSCR recalculated under a revenue decline scenario.",
    insight:     "Tests whether the deal survives a downturn — most businesses don't grow in a straight line.",
    good:        "Holds above 1.25x even at −15% revenue.",
    bad:         "Falls below 1.0x under stress — deal is fragile.",
  },
  downPayment: {
    title:       "Down Payment",
    description: "Your upfront cash investment at closing.",
    insight:     "Lower = higher leverage and faster equity recovery, but thinner safety margin.",
  },
  leverageRatio: {
    title:       "Leverage Ratio",
    description: "Total debt compared to annual earnings.",
    insight:     "Higher leverage amplifies both returns and risk.",
    good:        "Debt-to-SDE under 3.0x — manageable burden.",
    bad:         "Debt-to-SDE above 4.5x — very limited error budget.",
  },
  sbaLoan: {
    title:       "SBA 7(a) Loan",
    description: "Government-backed loan covering up to 90% of business acquisitions under $5M.",
    insight:     "The default financing path for SMB buyers. Requires 1.25x DSCR minimum.",
  },
  equityRecovery: {
    title:       "Equity Recovery Period",
    description: "How long it takes to recover your down payment from free cash flow.",
    insight:     "Shorter = faster compounding. 3–5 years is typical for a good SMB deal.",
    good:        "Under 4 years — capital returns quickly.",
    bad:         "Over 7 years — equity is tied up a long time.",
  },
  cashOnCash: {
    title:       "Cash-on-Cash Return (Year 1)",
    description: "First-year free cash flow divided by your down payment.",
    insight:     "Your real return rate on invested capital — not just the headline multiple.",
    good:        "Above 25% — strong entry economics.",
    bad:         "Below 10% — better alternatives probably exist.",
  },

  // ── 4. TRAJECTORY / PERFORMANCE ───────────────────────────────────────────
  trajectory: {
    title:       "Deal Trajectory",
    description: "The direction this deal is heading based on listing history and fundamentals.",
    insight:     "Improving trajectory = stronger deal. Declining trajectory = rising risk.",
    good:        "Stable or improving across price, earnings, and coverage.",
    bad:         "Price drops combined with deteriorating fundamentals.",
  },
  revenueTrend: {
    title:       "Revenue Trend",
    description: "How sales have changed over recent periods.",
    insight:     "Consistent growth is a strong positive signal. Flat is neutral. Declining is red.",
  },
  marginTrend: {
    title:       "Margin Trend",
    description: "How profitability as a % of revenue has changed over time.",
    insight:     "Shrinking margins often signal rising costs, pricing pressure, or hidden issues.",
  },
  daysOnMarket: {
    title:       "Days on Market",
    description: "How long this listing has been available.",
    insight:     "Stale listings signal either overpricing or undisclosed issues — negotiation leverage.",
  },

  // ── 5. RISK FLAGS ─────────────────────────────────────────────────────────
  trustScore: {
    title:       "Normalization Trust Score",
    description: "How reliable the reported financials appear after data-quality checks.",
    insight:     "Low trust = earnings may be overstated. Validate before relying on the deal math.",
    good:        "85+ — data is consistent with benchmarks.",
    bad:         "Below 60 — material red flags in reported numbers.",
  },
  addBackRisk: {
    title:       "Add-Back Risk",
    description: "Expenses the seller claims should be 'added back' to SDE.",
    insight:     "Reasonable add-backs are normal. Too many = inflated earnings.",
  },
  customerConcentration: {
    title:       "Customer Concentration",
    description: "Percentage of revenue from the top few customers.",
    insight:     "High concentration = fragile business. Losing one customer can tank it.",
    good:        "No single customer above 10% of revenue.",
    bad:         "Top customer above 25% — significant continuity risk.",
  },
  ownerDependence: {
    title:       "Owner Dependence",
    description: "How much the business relies on the current owner's personal involvement.",
    insight:     "Highly dependent businesses are harder to transition — factor into valuation.",
  },
  industryFit: {
    title:       "Industry Fit (Lender View)",
    description: "How favorably SBA lenders view this industry.",
    insight:     "Preferred industries finance easily. Scrutinized industries add friction and cost.",
  },

  // ── 6. DECISION LAYER ─────────────────────────────────────────────────────
  verdict: {
    title:       "Deal Verdict",
    description: "Our overall signal based on pricing, coverage, earnings quality, and industry fit.",
    insight:     "Your screening anchor — tells you whether this deal deserves deeper analysis.",
  },
  overallScore: {
    title:       "Overall Deal Score",
    description: "Composite score (0–100) across all underwriting dimensions.",
    insight:     "80+ deals are rare and worth pursuing. Below 50 usually means pass.",
  },
  riskLevel: {
    title:       "Risk Level",
    description: "Combined operational + financial risk assessment.",
    insight:     "Higher risk doesn't mean don't buy — it means structure for it.",
  },
  dealQuality: {
    title:       "Deal Quality",
    description: "The strength of the underlying business — separate from price.",
    insight:     "A great business at a fair price beats a mediocre business at a bargain.",
  },
  buySignal: {
    title:       "Buy Signal",
    description: "Our recommendation: Proceed / Investigate / Pass.",
    insight:     "Synthesis of every other metric. Use as a starting point, not a final answer.",
  },
  lenderVerdict: {
    title:       "Lender Readiness Verdict",
    description: "Whether this deal is likely financeable under standard SBA guidelines.",
    insight:     "If this is 'Not Financeable,' no lender will touch it at current pricing.",
  },
};

// Helper — safe lookup with fallback
export function getTooltip(key: string): TooltipEntry | null {
  return TOOLTIP_CONTENT[key] ?? null;
}
