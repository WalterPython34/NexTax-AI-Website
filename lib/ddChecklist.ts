// lib/ddChecklist.ts
// Due diligence checklist generator — deal-aware, priority-ranked.

export interface ChecklistItem {
  id:       string;
  section:  "financial" | "legal" | "operational";
  priority: "critical" | "high" | "standard";
  item:     string;
  why?:     string;  // one-line rationale shown in UI
}

export interface DdChecklistInput {
  industry:               string;
  revenue:                number;
  sde:                    number;
  asking_price:           number;
  dscr:                   number;
  normalization_trust_score?: number | null;
  normalization_flags_json?:  any[] | null;
  manual_review_required?:    boolean | null;
  owner_operated?:            boolean | null;
  customer_concentration?:    string | null;
  has_real_estate?:           boolean | null;
  years_in_business?:         number | null;
  valuation_multiple?:        number | null;
}

export function generateDdChecklist(deal: DdChecklistInput): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const trust   = deal.normalization_trust_score ?? 100;
  const flags   = (deal.normalization_flags_json ?? []) as any[];
  const hasCrit = flags.some((f: any) => f.severity === "critical");
  const gp      = deal.asking_price > 0 && deal.sde > 0
    ? ((deal.asking_price - deal.sde * 2.75) / (deal.sde * 2.75)) * 100
    : 0;

  // ── FINANCIAL ──────────────────────────────────────────────────────────────
  items.push({
    id: "fin-01", section: "financial", priority: "critical",
    item: "Request 3 years of federal tax returns (business + personal if pass-through)",
    why: "Tax returns are the only externally verified earnings record. Prioritize over P&Ls.",
  });

  items.push({
    id: "fin-02", section: "financial", priority: "critical",
    item: "Obtain itemized add-back schedule with documentation for each adjustment",
    why: "Add-backs are the primary lever for overstating SDE. Every line needs a receipt or explanation.",
  });

  items.push({
    id: "fin-03", section: "financial", priority: "high",
    item: "Request 3 years of P&L statements in QuickBooks/accounting software format",
    why: "Compare to tax returns — material discrepancies are a red flag.",
  });

  if (trust < 80 || hasCrit) {
    items.push({
      id: "fin-04", section: "financial", priority: "critical",
      item: "Engage CPA for independent financial review before LOI",
      why: `Data confidence score of ${trust}/100 — reported financials require independent verification.`,
    });
  }

  items.push({
    id: "fin-05", section: "financial", priority: "high",
    item: "Verify owner compensation and benefits included in add-backs",
    why: "Owner salary, health insurance, personal vehicles, and family payroll are common inflators.",
  });

  if (deal.dscr < 1.25) {
    items.push({
      id: "fin-06", section: "financial", priority: "critical",
      item: `Stress-test DSCR at −15% revenue — current ${deal.dscr.toFixed(2)}x is below lender minimum`,
      why: "Deal does not meet standard 1.25x SBA DSCR threshold at current terms.",
    });
  }

  if (gp > 15) {
    items.push({
      id: "fin-07", section: "financial", priority: "high",
      item: "Request seller justification for pricing above market fair value estimate",
      why: `Asking price is approximately ${Math.round(gp)}% above NexTax market estimate. Validate the premium.`,
    });
  }

  items.push({
    id: "fin-08", section: "financial", priority: "standard",
    item: "Confirm accounts receivable aging schedule and collectability",
  });

  items.push({
    id: "fin-09", section: "financial", priority: "standard",
    item: "Review trailing 12-month bank statements for revenue verification",
    why: "Bank deposits are the ground-truth check against reported revenue.",
  });

  // ── LEGAL ──────────────────────────────────────────────────────────────────
  items.push({
    id: "leg-01", section: "legal", priority: "critical",
    item: "Confirm lease assignment clause — landlord consent required",
    why: "A non-assignable lease can kill a deal post-LOI. Confirm before advancing.",
  });

  items.push({
    id: "leg-02", section: "legal", priority: "critical",
    item: "Request all customer contracts and confirm transferability",
    why: "Revenue concentration in non-transferable contracts overstates business value.",
  });

  items.push({
    id: "leg-03", section: "legal", priority: "high",
    item: "Run UCC lien search and confirm all liens can be cleared at close",
  });

  items.push({
    id: "leg-04", section: "legal", priority: "high",
    item: "Confirm no pending litigation, claims, or regulatory actions",
  });

  items.push({
    id: "leg-05", section: "legal", priority: "high",
    item: "Review seller non-compete scope — geographic area, duration, covered activities",
    why: "A weak non-compete lets the seller immediately rebuild a competing business.",
  });

  if (deal.has_real_estate) {
    items.push({
      id: "leg-06", section: "legal", priority: "high",
      item: "Order Phase I environmental assessment for real property",
    });
  }

  items.push({
    id: "leg-07", section: "legal", priority: "standard",
    item: "Verify all required business licenses and permits are current and transferable",
  });

  // ── OPERATIONAL ────────────────────────────────────────────────────────────
  if (deal.customer_concentration === "high" || deal.customer_concentration === "moderate") {
    items.push({
      id: "ops-01", section: "operational", priority: "critical",
      item: "Identify top-5 customers by revenue — confirm relationships transfer with business",
      why: "High customer concentration is the leading cause of post-acquisition revenue loss.",
    });
  } else {
    items.push({
      id: "ops-01", section: "operational", priority: "high",
      item: "Review customer list — verify revenue distribution and retention history",
    });
  }

  if (deal.owner_operated) {
    items.push({
      id: "ops-02", section: "operational", priority: "critical",
      item: "Assess key-person risk — document which revenue relationships depend on the seller",
      why: "Owner-operated businesses often have revenue concentrated in the seller's personal relationships.",
    });
  }

  items.push({
    id: "ops-03", section: "operational", priority: "high",
    item: "Interview 2–3 key employees — assess retention risk and role coverage",
  });

  items.push({
    id: "ops-04", section: "operational", priority: "high",
    item: `Request ${Math.min(90, 30 + (deal.years_in_business ?? 0) > 5 ? 60 : 30)}-day seller training commitment in LOI`,
    why: "Standard is 30–90 days. Longer training reduces transition risk.",
  });

  items.push({
    id: "ops-05", section: "operational", priority: "standard",
    item: "Review all vendor contracts — pricing, exclusivity, and assignment terms",
  });

  items.push({
    id: "ops-06", section: "operational", priority: "standard",
    item: "Assess equipment condition and maintenance records — identify near-term capex needs",
  });

  items.push({
    id: "ops-07", section: "operational", priority: "standard",
    item: "Review current working capital — establish normalized working capital peg for LOI",
  });

  // Sort: critical → high → standard, within each section
  const order: Record<string, number> = { critical: 0, high: 1, standard: 2 };
  const secOrder: Record<string, number> = { financial: 0, legal: 1, operational: 2 };
  return items.sort((a, b) =>
    secOrder[a.section] - secOrder[b.section] ||
    order[a.priority] - order[b.priority]
  );
}

/** Export checklist as plain text — suitable for download or PDF prep. */
export function checklistToText(items: ChecklistItem[], dealLabel?: string): string {
  const sections = ["financial", "legal", "operational"] as const;
  const sectionNames = { financial: "FINANCIAL", legal: "LEGAL", operational: "OPERATIONAL" };

  const lines: string[] = [
    `NexTax AI — Due Diligence Checklist`,
    dealLabel ? `Deal: ${dealLabel}` : "",
    `Generated: ${new Date().toLocaleDateString()}`,
    "",
  ];

  for (const sec of sections) {
    const secItems = items.filter(i => i.section === sec);
    if (secItems.length === 0) continue;
    lines.push(`── ${sectionNames[sec]} ──────────────────────────────────`);
    for (const item of secItems) {
      const flag = item.priority === "critical" ? "⚠ " : item.priority === "high" ? "→ " : "  ";
      lines.push(`${flag}${item.item}`);
      if (item.why) lines.push(`   ${item.why}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
