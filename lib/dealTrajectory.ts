// lib/dealTrajectory.ts
//
// Deal Trajectory — binary/directional signal for the UW panel (hook layer)
// plus structured breakdown for the deal detail page (explanation layer).
//
// Data sources (in priority order):
//   1. deal_snapshots — historical asking price / listing status (populated via cron)
//   2. Derived signals from existing deal fields (margin trend, DSCR, earnings_source)
//   3. Graceful "tracking since" state when no historical data yet
//
// The public API returns both the compact signal (TrajectoryLabel) and the
// expanded breakdown (TrajectoryBreakdown). Consumers pick what to render.

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TrajectoryLabel =
  | "improving"       // positive drivers dominate
  | "flat"            // stable / mixed
  | "declining"       // negative drivers dominate
  | "new_listing"     // <14 days tracked, no trajectory yet
  | "insufficient";   // not enough data to judge

export type ConfidenceLevel = "high" | "medium" | "low";

export interface TrajectoryDriver {
  label:     string;      // e.g. "Margin compression"
  detail:    string;      // e.g. "−4% YoY"
  direction: "positive" | "negative" | "neutral";
  weight:    number;      // 1-3, how strongly it influences the trajectory
}

export interface TrajectorySnapshot {
  snapshot_date:  string;   // ISO date
  asking_price:   number;
  listing_status: "active" | "pending" | "delisted" | "relisted";
}

export interface TrajectoryInput {
  // Required — basic deal fields
  deal_created_at?:     string | null;       // when NexTax first saw the deal
  first_seen_at?:       string | null;       // marketplace first-seen timestamp
  asking_price:         number;
  usableSDE:            number;
  reportedSDE:          number;
  dscr:                 number;
  stressDscr15:         number;
  gap_pct:              number | null;
  trustScore:           number;
  earningsSource:       "reported" | "blended" | "benchmark_implied";

  // Optional — richer signals
  revenue_yoy_pct?:     number | null;        // percent change YoY
  margin_yoy_pct?:      number | null;        // percent change in SDE margin YoY
  dscr_prior?:          number | null;        // DSCR from prior period if tracked

  // Optional — snapshot history from deal_snapshots table
  snapshots?:           TrajectorySnapshot[] | null;
}

export interface TrajectoryBreakdown {
  label:              TrajectoryLabel;
  labelText:          string;                 // "Improving" / "Flat" / "Declining" / "New Listing" / "Insufficient Data"
  headline:           string;                 // One-sentence summary
  confidence:         ConfidenceLevel;
  confidenceNote:     string;                 // "based on 2 snapshots + earnings quality" etc.
  drivers:            TrajectoryDriver[];     // ranked, highest weight first
  daysTracked:        number | null;          // null if deal_created_at is missing
  priceMovementPct:   number | null;          // current vs first snapshot
  snapshots:          TrajectorySnapshot[];   // forwarded for timeline rendering
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRIVER EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

function extractDrivers(d: TrajectoryInput, snapshots: TrajectorySnapshot[]): TrajectoryDriver[] {
  const drivers: TrajectoryDriver[] = [];

  // ── Price trajectory (if snapshots available) ─────────────────────────────
  if (snapshots.length >= 2) {
    const firstPrice = snapshots[0].asking_price;
    const latestPrice = snapshots[snapshots.length - 1].asking_price;
    const movement = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

    if (movement <= -5) {
      drivers.push({
        label:     "Price reductions",
        detail:    `${Math.abs(Math.round(movement))}% drop since listing`,
        direction: "positive",
        weight:    3,
      });
    } else if (movement >= 5) {
      drivers.push({
        label:     "Price increases",
        detail:    `+${Math.round(movement)}% since listing`,
        direction: "negative",
        weight:    2,
      });
    } else {
      // Check days-on-market for stale signal
      const firstDate = new Date(snapshots[0].snapshot_date);
      const lastDate  = new Date(snapshots[snapshots.length - 1].snapshot_date);
      const daysFlat  = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysFlat >= 90) {
        drivers.push({
          label:     "Stale listing",
          detail:    `${daysFlat} days on market, no price movement`,
          direction: "positive",    // stale = good for buyer negotiation
          weight:    2,
        });
      }
    }
  }

  // ── Revenue trajectory ─────────────────────────────────────────────────────
  if (d.revenue_yoy_pct != null) {
    if (d.revenue_yoy_pct <= -10) {
      drivers.push({
        label:     "Revenue declining",
        detail:    `${Math.round(d.revenue_yoy_pct)}% YoY`,
        direction: "negative",
        weight:    3,
      });
    } else if (d.revenue_yoy_pct >= 10) {
      drivers.push({
        label:     "Revenue growing",
        detail:    `+${Math.round(d.revenue_yoy_pct)}% YoY`,
        direction: "positive",
        weight:    2,
      });
    } else if (d.revenue_yoy_pct <= -3) {
      drivers.push({
        label:     "Revenue softening",
        detail:    `${Math.round(d.revenue_yoy_pct)}% YoY`,
        direction: "negative",
        weight:    2,
      });
    }
  }

  // ── Margin trajectory ─────────────────────────────────────────────────────
  if (d.margin_yoy_pct != null) {
    if (d.margin_yoy_pct <= -3) {
      drivers.push({
        label:     "Margin compression",
        detail:    `${d.margin_yoy_pct > -10 ? d.margin_yoy_pct.toFixed(1) : Math.round(d.margin_yoy_pct)}% YoY`,
        direction: "negative",
        weight:    3,
      });
    } else if (d.margin_yoy_pct >= 2) {
      drivers.push({
        label:     "Margin expansion",
        detail:    `+${d.margin_yoy_pct.toFixed(1)}% YoY`,
        direction: "positive",
        weight:    2,
      });
    }
  }

  // ── DSCR trajectory ────────────────────────────────────────────────────────
  if (d.dscr_prior != null) {
    const dscrDelta = d.dscr - d.dscr_prior;
    if (dscrDelta <= -0.15) {
      drivers.push({
        label:     "Debt coverage deteriorating",
        detail:    `${d.dscr_prior.toFixed(2)}x → ${d.dscr.toFixed(2)}x`,
        direction: "negative",
        weight:    2,
      });
    } else if (dscrDelta >= 0.15) {
      drivers.push({
        label:     "Debt coverage improving",
        detail:    `${d.dscr_prior.toFixed(2)}x → ${d.dscr.toFixed(2)}x`,
        direction: "positive",
        weight:    2,
      });
    }
  }

  // ── Stress resilience ─────────────────────────────────────────────────────
  if (d.stressDscr15 < 1.0) {
    drivers.push({
      label:     "Fragile to downside",
      detail:    `Stress DSCR ${d.stressDscr15.toFixed(2)}x at −15%`,
      direction: "negative",
      weight:    2,
    });
  } else if (d.stressDscr15 >= 1.5) {
    drivers.push({
      label:     "Stress resilient",
      detail:    `Holds ${d.stressDscr15.toFixed(2)}x at −15%`,
      direction: "positive",
      weight:    1,
    });
  }

  // ── Earnings quality ──────────────────────────────────────────────────────
  if (d.trustScore < 60 || d.earningsSource === "benchmark_implied") {
    drivers.push({
      label:     "Earnings reliability concern",
      detail:    d.earningsSource === "benchmark_implied"
                  ? "Using benchmark-implied SDE"
                  : `Trust score ${d.trustScore}/100`,
      direction: "negative",
      weight:    2,
    });
  } else if (d.trustScore >= 85) {
    drivers.push({
      label:     "Earnings quality strong",
      detail:    `Trust score ${d.trustScore}/100`,
      direction: "positive",
      weight:    1,
    });
  }

  // Sort by weight descending, then by negative-first within same weight
  return drivers.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    const dirOrder = { negative: 0, neutral: 1, positive: 2 };
    return dirOrder[a.direction] - dirOrder[b.direction];
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LABEL DECISION — weight-based aggregation
// ═══════════════════════════════════════════════════════════════════════════════

function computeLabel(
  drivers: TrajectoryDriver[],
  daysTracked: number | null,
): TrajectoryLabel {
  // Very new deal → show "new_listing" even if we have driver data
  if (daysTracked != null && daysTracked < 14 && drivers.length < 2) {
    return "new_listing";
  }
  if (drivers.length === 0) return "insufficient";

  const posWeight = drivers.filter(d => d.direction === "positive").reduce((a, d) => a + d.weight, 0);
  const negWeight = drivers.filter(d => d.direction === "negative").reduce((a, d) => a + d.weight, 0);

  if (posWeight - negWeight >= 2) return "improving";
  if (negWeight - posWeight >= 2) return "declining";
  return "flat";
}

function labelToText(label: TrajectoryLabel): string {
  switch (label) {
    case "improving":    return "Improving";
    case "flat":         return "Flat";
    case "declining":    return "Declining";
    case "new_listing":  return "New Listing";
    case "insufficient": return "Insufficient Data";
  }
}

function buildHeadline(label: TrajectoryLabel, drivers: TrajectoryDriver[]): string {
  if (label === "new_listing") return "Recently listed — not enough history to detect a trend yet.";
  if (label === "insufficient") return "Not enough data to establish a trajectory.";

  const topDriver = drivers[0];
  if (!topDriver) return "Mixed signals across the deal's underlying metrics.";

  switch (label) {
    case "improving":
      return `Positive trajectory — ${topDriver.label.toLowerCase()} is the primary driver.`;
    case "declining":
      return `Negative trajectory — ${topDriver.label.toLowerCase()} is the primary concern.`;
    case "flat":
      return `Stable trajectory — mixed signals with ${topDriver.label.toLowerCase()} the most notable.`;
  }
  return "";
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE — based on how many signals we actually have
// ═══════════════════════════════════════════════════════════════════════════════

function computeConfidence(
  drivers: TrajectoryDriver[],
  snapshots: TrajectorySnapshot[],
  hasRevenueYoy: boolean,
  hasMarginYoy: boolean,
): { level: ConfidenceLevel; note: string } {
  const signalCount = drivers.length;
  const snapshotCount = snapshots.length;
  const hasHistoricals = hasRevenueYoy || hasMarginYoy;

  // High: 3+ drivers AND (snapshots OR historicals)
  if (signalCount >= 3 && (snapshotCount >= 2 || hasHistoricals)) {
    const parts: string[] = [];
    if (snapshotCount >= 2) parts.push(`${snapshotCount} listing snapshots`);
    if (hasHistoricals) parts.push("YoY financials");
    parts.push("current metrics");
    return { level: "high", note: `Based on ${parts.join(", ")}.` };
  }

  // Medium: 2+ drivers OR some historical data
  if (signalCount >= 2 || hasHistoricals) {
    const parts: string[] = [];
    if (snapshotCount >= 2) parts.push(`${snapshotCount} snapshots`);
    if (hasHistoricals) parts.push("partial YoY data");
    if (parts.length === 0) parts.push("current metrics only");
    return { level: "medium", note: `Based on ${parts.join(" and ")}.` };
  }

  return { level: "low", note: "Limited historical signals — confidence grows as we track the deal." };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function buildTrajectory(d: TrajectoryInput): TrajectoryBreakdown {
  const snapshots = d.snapshots ?? [];
  const drivers   = extractDrivers(d, snapshots);

  // Days tracked
  const startDate = d.first_seen_at ?? d.deal_created_at;
  const daysTracked = startDate
    ? Math.max(0, Math.round((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const label = computeLabel(drivers, daysTracked);
  const conf  = computeConfidence(
    drivers,
    snapshots,
    d.revenue_yoy_pct != null,
    d.margin_yoy_pct  != null,
  );

  // Price movement pct (if snapshots available)
  let priceMovementPct: number | null = null;
  if (snapshots.length >= 2) {
    const first = snapshots[0].asking_price;
    const last  = snapshots[snapshots.length - 1].asking_price;
    if (first > 0) priceMovementPct = +(((last - first) / first) * 100).toFixed(1);
  }

  return {
    label,
    labelText:        labelToText(label),
    headline:         buildHeadline(label, drivers),
    confidence:       conf.level,
    confidenceNote:   conf.note,
    drivers,
    daysTracked,
    priceMovementPct,
    snapshots,
  };
}
