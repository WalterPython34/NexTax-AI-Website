// lib/loiBuilder.ts
// LOI Builder — converts underwriting outputs into disciplined offer guidance.
// Pure functions, deterministic, export-ready structured output.

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type StructureStance = "aggressive" | "balanced" | "conservative" | "protective";

export interface StructureItem {
  id:          string;
  label:       string;          // e.g. "Seller Note"
  value:       string;          // e.g. "10–15%"
  explanation: string;          // one short line
  priority:    "critical" | "standard";
}

export interface ProtectionItem {
  label: string;
  why:   string;
}

export interface ChecklistItem {
  id:       string;
  label:    string;
  value:    string | null;      // prefilled value or null for "Define before sending"
}

export interface LoiBuilderInput {
  asking_price:         number;
  fair_value:           number;
  usableSDE:            number;
  gap_pct:              number | null;
  dscr:                 number;
  stressDscr15:         number;
  stressDscr25:         number;
  trustScore:           number;
  earningsSource:       "reported" | "blended" | "benchmark_implied";
  industryFit:          "preferred" | "standard" | "higher_scrutiny" | "sba_ineligible" | "requires_review";
  sbaEligible:          boolean;
  owner_operated?:      boolean | null;
  customer_concentration?: string | null;
  years_in_business?:   number | null;
}

export interface LoiBuilderOutput {
  stance:           StructureStance;
  stanceLabel:      string;
  stanceMessage:    string;
  anchorOffer:      number;
  targetRangeLow:   number;
  targetRangeHigh:  number;
  walkAwayPrice:    number;
  // % of fair value for display
  anchorPctOfFv:    number;
  targetLowPctOfFv: number;
  targetHighPctOfFv:number;
  walkAwayPctOfFv:  number;
  structureItems:   StructureItem[];
  fitBullets:       string[];
  protections:      ProtectionItem[];
  checklistItems:   ChecklistItem[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANCE LOGIC — choose posture based on deal signals
// ═══════════════════════════════════════════════════════════════════════════════

function computeStance(d: LoiBuilderInput): StructureStance {
  // Protective — financing cannot clear at current structure
  if (d.dscr < 1.0)                        return "protective";
  if (d.industryFit === "sba_ineligible")  return "protective";
  if (d.trustScore < 45)                   return "protective";
  if (d.stressDscr15 < 1.0)                return "protective";

  // Conservative — financeable but fragile signals
  if (d.dscr < 1.25)                       return "conservative";
  if (d.stressDscr15 < 1.15)               return "conservative";
  if (d.trustScore < 60)                   return "conservative";
  if (d.earningsSource === "benchmark_implied") return "conservative";
  if ((d.gap_pct ?? 0) > 25)               return "conservative";

  // Aggressive — underpriced with strong coverage
  if ((d.gap_pct ?? 0) < -15 && d.dscr >= 1.5 && d.trustScore >= 80) {
    return "aggressive";
  }

  // Balanced — default for financeable, in-range deals
  return "balanced";
}

const STANCE_META: Record<StructureStance, { label: string; message: string }> = {
  aggressive: {
    label: "Aggressive — Move Decisively",
    message: "Deal is underpriced with strong coverage. You can offer confidently — but still preserve negotiation room to avoid overpaying.",
  },
  balanced: {
    label: "Balanced — Disciplined Offer",
    message: "Deal is financeable and priced within reasonable range. Standard structure applies — negotiate price first, terms second.",
  },
  conservative: {
    label: "Conservative — Structure Protects Capital",
    message: "Coverage is thin or earnings quality needs validation. Shift risk to the seller through carry, earnout, and extended diligence.",
  },
  protective: {
    label: "Protective — Major Structural Changes Required",
    message: "Deal does not support financing at current pricing. Only advance with material repricing and heavy seller support.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING — anchor / range / ceiling
// ═══════════════════════════════════════════════════════════════════════════════

function computePricing(d: LoiBuilderInput, stance: StructureStance) {
  // Base fair-value anchors from fair_value, but protective/conservative deals
  // anchor lower than fair value to force the negotiation
  const fv = d.fair_value > 0 ? d.fair_value : d.asking_price * 0.85;

  // Stance-based percentages of fair value
  const pcts = {
    aggressive:   { anchor: 0.90, targetLow: 0.94, targetHigh: 0.98, walkAway: 1.02 },
    balanced:     { anchor: 0.85, targetLow: 0.90, targetHigh: 0.95, walkAway: 1.00 },
    conservative: { anchor: 0.75, targetLow: 0.82, targetHigh: 0.90, walkAway: 0.95 },
    protective:   { anchor: 0.65, targetLow: 0.70, targetHigh: 0.80, walkAway: 0.88 },
  }[stance];

  // Trust score adjustment — pull anchor down further if confidence is low
  // Each 10-point drop below 70 reduces anchor by 2%
  const trustPenalty = d.trustScore < 70 ? Math.min(0.08, (70 - d.trustScore) / 500) : 0;

  const anchor    = Math.round(fv * (pcts.anchor    - trustPenalty));
  const targetLow = Math.round(fv * (pcts.targetLow - trustPenalty / 2));
  const targetHigh= Math.round(fv * pcts.targetHigh);
  const walkAway  = Math.round(fv * pcts.walkAway);

  return {
    anchor, targetLow, targetHigh, walkAway,
    anchorPctOfFv:    Math.round((anchor    / fv) * 100),
    targetLowPctOfFv: Math.round((targetLow / fv) * 100),
    targetHighPctOfFv:Math.round((targetHigh/ fv) * 100),
    walkAwayPctOfFv:  Math.round((walkAway  / fv) * 100),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURE ITEMS — cash / seller note / earnout / timing
// ═══════════════════════════════════════════════════════════════════════════════

function buildStructureItems(d: LoiBuilderInput, stance: StructureStance): StructureItem[] {
  const items: StructureItem[] = [];

  // ── Cash at Close ──────────────────────────────────────────────────────────
  const cashAtClose =
    stance === "aggressive"   ? "90–100%" :
    stance === "balanced"     ? "85–90%"  :
    stance === "conservative" ? "75–85%"  :
                                "60–75%";
  items.push({
    id: "cash", label: "Cash at Close", value: cashAtClose,
    explanation:
      stance === "aggressive"   ? "Clean cash structure — financing covers the balance, deal mechanics stay simple."
      : stance === "balanced"   ? "Standard SBA-compatible cash close with light seller support."
      : stance === "conservative"? "Reduced cash exposure — risk-shifts portion of purchase price into seller paper."
      :                           "Substantial seller paper required — too much credit risk to place at close.",
    priority: "critical",
  });

  // ── Seller Note ────────────────────────────────────────────────────────────
  const sellerNote =
    stance === "aggressive"   ? "0–10%"   :
    stance === "balanced"     ? "10–15%"  :
    stance === "conservative" ? "15–20%"  :
                                "20–30%";
  items.push({
    id: "sellerNote", label: "Seller Note", value: sellerNote,
    explanation:
      stance === "protective"
        ? "Large seller note required — preferably on standby to satisfy SBA lender overlay."
        : stance === "conservative"
        ? "Meaningful seller carry aligns seller incentives and cushions lender underwriting risk."
        : "Light seller note preserves deal goodwill and simplifies SBA approval.",
    priority: stance === "protective" || stance === "conservative" ? "critical" : "standard",
  });

  // ── Earnout ────────────────────────────────────────────────────────────────
  const hasEarningsRisk   = d.trustScore < 70 || d.earningsSource !== "reported";
  const hasCustomerRisk   = d.customer_concentration === "high" || d.customer_concentration === "moderate";
  const hasOwnerRisk      = d.owner_operated === true;

  let earnoutPct = "0%";
  if (stance === "protective")           earnoutPct = "15–25%";
  else if (stance === "conservative")    earnoutPct = "10–15%";
  else if (hasEarningsRisk || hasCustomerRisk || hasOwnerRisk) earnoutPct = "5–10%";

  if (earnoutPct !== "0%") {
    items.push({
      id: "earnout", label: "Earnout", value: earnoutPct,
      explanation: hasEarningsRisk
        ? "Tie to Year 1 revenue or retained SDE — aligns seller with earnings durability claims."
        : hasCustomerRisk
        ? "Tie to top-customer retention — protects against concentration falloff post-close."
        : "Modest earnout on revenue hurdle preserves upside while capping downside risk.",
      priority: hasEarningsRisk || stance === "protective" ? "critical" : "standard",
    });
  } else {
    items.push({
      id: "earnout", label: "Earnout", value: "Not required",
      explanation: "Strong earnings quality and low concentration — no need to defer purchase price.",
      priority: "standard",
    });
  }

  // ── Working Capital Peg ────────────────────────────────────────────────────
  items.push({
    id: "workingCapital", label: "Working Capital Peg", value: "Define explicitly",
    explanation: "Target should reflect normalized 12-month average. Escrow 5–10% pending post-close true-up.",
    priority: "critical",
  });

  // ── Diligence Period ──────────────────────────────────────────────────────
  const diligence =
    stance === "aggressive"   ? "30 days" :
    stance === "balanced"     ? "45 days" :
    stance === "conservative" ? "60 days" :
                                "75–90 days";
  items.push({
    id: "diligence", label: "Diligence Period", value: diligence,
    explanation: stance === "protective" || stance === "conservative"
      ? "Extended diligence needed for independent financial review and customer/contract validation."
      : "Standard diligence window — tax return validation, lease review, contract transferability.",
    priority: "standard",
  });

  // ── Exclusivity ────────────────────────────────────────────────────────────
  items.push({
    id: "exclusivity", label: "Exclusivity Window", value: "Tie to diligence period",
    explanation: "Request no-shop provision covering the diligence period — typical for SBA-financed transactions.",
    priority: "standard",
  });

  // ── Training / Transition ─────────────────────────────────────────────────
  const training =
    hasOwnerRisk              ? "90 days (paid)" :
    stance === "aggressive"   ? "30–45 days" :
    stance === "balanced"     ? "45–60 days" :
                                "60–90 days";
  items.push({
    id: "training", label: "Training & Transition", value: training,
    explanation: hasOwnerRisk
      ? "Seller is operationally central — extended paid transition and customer introductions are non-negotiable."
      : "Training period covers systems, key relationships, and routine handoff to new ownership.",
    priority: hasOwnerRisk ? "critical" : "standard",
  });

  // ── Financing Contingency ─────────────────────────────────────────────────
  items.push({
    id: "financingContingency", label: "Financing Contingency", value: "Mandatory",
    explanation: stance === "protective"
      ? "Absolutely required — deal is not financeable at current structure without major changes."
      : "Standard contingency — voids the LOI if SBA or conventional financing cannot be secured at reasonable terms.",
    priority: "critical",
  });

  // ── Asset vs Stock ────────────────────────────────────────────────────────
  items.push({
    id: "dealType", label: "Deal Type", value: "Asset purchase preferred",
    explanation: "Step-up basis on assets, avoids assumption of unknown liabilities. Confirm tax implications with CPA.",
    priority: "standard",
  });

  return items;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIT BULLETS — explain why this structure
// ═══════════════════════════════════════════════════════════════════════════════

function buildFitBullets(d: LoiBuilderInput, stance: StructureStance): string[] {
  const bullets: string[] = [];

  // Pricing rationale
  if ((d.gap_pct ?? 0) > 15) {
    bullets.push(`Asking price is ${d.gap_pct}% above fair value — anchor must reset seller expectations while preserving negotiation room.`);
  } else if ((d.gap_pct ?? 0) < -15) {
    bullets.push(`Asking is ${Math.abs(d.gap_pct!)}% below fair value — offer can move confidently while still leaving upside on the table.`);
  } else {
    bullets.push("Pricing is broadly aligned with market — structure can focus on terms and contingencies rather than repricing.");
  }

  // Coverage rationale
  if (d.dscr >= 1.5) {
    bullets.push(`DSCR of ${d.dscr.toFixed(2)}x supports standard SBA structure — light seller support and standard diligence suffice.`);
  } else if (d.dscr >= 1.25) {
    bullets.push(`DSCR of ${d.dscr.toFixed(2)}x meets SBA minimums but leaves limited headroom — seller note cushions lender underwriting.`);
  } else {
    bullets.push(`DSCR of ${d.dscr.toFixed(2)}x is below SBA minimum — heavy seller paper and reduced cash at close are required to bridge the gap.`);
  }

  // Trust rationale
  if (d.trustScore < 60 || d.earningsSource !== "reported") {
    bullets.push("Earnings quality is uncertain — earnout and extended diligence shift verification burden onto the seller.");
  } else if (d.trustScore >= 85) {
    bullets.push("Earnings data is strong — no need for earnout structures, standard verification is sufficient.");
  }

  // Stress rationale
  if (d.stressDscr15 < 1.15) {
    bullets.push(`Stressed DSCR at −15% earnings is ${d.stressDscr15.toFixed(2)}x — structure must protect against downside scenarios.`);
  }

  // Customer / owner rationale
  if (d.customer_concentration === "high" || d.customer_concentration === "moderate") {
    bullets.push("Customer concentration is material — tie earnout to top-customer retention or revenue hurdle.");
  }
  if (d.owner_operated) {
    bullets.push("Owner-operated structure — extended paid transition and customer introductions protect revenue durability.");
  }

  // Industry rationale
  if (d.industryFit === "higher_scrutiny") {
    bullets.push("Industry receives higher lender scrutiny — include strong seller reps on financial statements and customer list.");
  } else if (d.industryFit === "sba_ineligible") {
    bullets.push("Industry is SBA-ineligible — financing contingency must reference conventional or specialty lender approval.");
  }

  // Working capital — always mention
  bullets.push("Working capital peg should be explicit in the LOI — undefined peg creates post-close friction and valuation disputes.");

  return bullets.slice(0, 6);  // cap at 6
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUYER PROTECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function buildProtections(d: LoiBuilderInput, stance: StructureStance): ProtectionItem[] {
  const p: ProtectionItem[] = [];

  p.push({
    label: "Financing Contingency",
    why: "Voids LOI if SBA or conventional financing cannot be secured — single most important protection for leveraged buyers.",
  });

  p.push({
    label: "Quality of Earnings Review Condition",
    why: "Reserves the right to walk or reprice if independent review of add-backs or earnings materially contradicts seller disclosures.",
  });

  if (d.customer_concentration === "high" || d.customer_concentration === "moderate") {
    p.push({
      label: "Customer Concentration Review",
      why: "Access to top-customer list, contracts, and relationship history — high-risk when top 5 customers exceed 40% of revenue.",
    });
  }

  p.push({
    label: "Working Capital Peg & Escrow",
    why: "Defined target working capital with 5–10% escrow covering a post-close true-up period — prevents seller from draining cash reserves pre-close.",
  });

  p.push({
    label: "Transferability of Contracts & Licenses",
    why: "All material customer contracts, vendor agreements, licenses, and permits confirmed transferable to buyer entity.",
  });

  if (d.owner_operated) {
    p.push({
      label: "Training & Transition Covenant",
      why: "Seller commits to defined transition hours and customer introductions — protects against relationship-driven revenue erosion.",
    });
  }

  p.push({
    label: "No Material Adverse Change",
    why: "Right to terminate if business suffers material adverse change between LOI signing and close — revenue drop, key customer loss, litigation.",
  });

  p.push({
    label: "Seller Non-Compete & Non-Solicitation",
    why: "Geographic and temporal restrictions on seller starting competing business or soliciting customers/employees post-close.",
  });

  if (d.trustScore < 70 || d.earningsSource !== "reported") {
    p.push({
      label: "Indemnification for Pre-Close Liabilities",
      why: "Seller indemnifies for undisclosed tax, legal, or financial liabilities originating before close — elevated relevance when earnings quality is uncertain.",
    });
  }

  return p;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKLIST — terms to confirm before sending
// ═══════════════════════════════════════════════════════════════════════════════

function buildChecklist(
  d: LoiBuilderInput,
  pricing: ReturnType<typeof computePricing>,
  items: StructureItem[],
): ChecklistItem[] {
  const byId = (id: string) => items.find(s => s.id === id)?.value ?? null;
  const fmt$ = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return [
    { id: "price",        label: "Offer price",                    value: fmt$(pricing.anchor) + " (anchor)" },
    { id: "range",        label: "Acceptable range",               value: `${fmt$(pricing.targetLow)} – ${fmt$(pricing.targetHigh)}` },
    { id: "walkaway",     label: "Walk-away ceiling",              value: fmt$(pricing.walkAway) },
    { id: "cashClose",    label: "Cash at close",                  value: byId("cash") },
    { id: "sellerNote",   label: "Seller note (% and terms)",      value: byId("sellerNote") + " — define interest rate, term, and standby terms" },
    { id: "earnout",      label: "Earnout triggers & calculation", value: byId("earnout") },
    { id: "diligence",    label: "Diligence period",               value: byId("diligence") },
    { id: "exclusivity",  label: "Exclusivity window",             value: byId("exclusivity") },
    { id: "training",     label: "Training & transition",          value: byId("training") },
    { id: "workingCap",   label: "Working capital target",         value: "Define before sending — normalized 12-month average" },
    { id: "excluded",     label: "Excluded assets / liabilities",  value: "Define before sending — specify any assets or obligations not transferring" },
    { id: "closeTime",    label: "Target close date",              value: "Define before sending — typically 75–120 days after LOI" },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function buildLoiRecommendation(d: LoiBuilderInput): LoiBuilderOutput {
  const stance  = computeStance(d);
  const pricing = computePricing(d, stance);
  const items   = buildStructureItems(d, stance);
  const meta    = STANCE_META[stance];

  return {
    stance,
    stanceLabel:       meta.label,
    stanceMessage:     meta.message,
    anchorOffer:       pricing.anchor,
    targetRangeLow:    pricing.targetLow,
    targetRangeHigh:   pricing.targetHigh,
    walkAwayPrice:     pricing.walkAway,
    anchorPctOfFv:     pricing.anchorPctOfFv,
    targetLowPctOfFv:  pricing.targetLowPctOfFv,
    targetHighPctOfFv: pricing.targetHighPctOfFv,
    walkAwayPctOfFv:   pricing.walkAwayPctOfFv,
    structureItems:    items,
    fitBullets:        buildFitBullets(d, stance),
    protections:       buildProtections(d, stance),
    checklistItems:    buildChecklist(d, pricing, items),
  };
}
