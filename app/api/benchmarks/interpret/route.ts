// app/api/benchmarks/interpret/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// AI Interpretation endpoint — STUB IMPLEMENTATION (interaction-layer aware)
//
// In Checkpoint 5 this will call Claude. For now we return a rule-based summary
// that consumes the interaction layer's outputs (tension indicator, sensitivity
// insight, interaction insights, score dependencies) so the interpretation
// reads as a real credit memo would.
//
// Contract:
//   POST /api/benchmarks/interpret
//   body: { analysis: BenchmarkAnalysis }
//   returns: { ok: true, interpretation: string[], generated_by: 'rule_based' | 'ai' }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

interface RiskFlag {
  severity: "high" | "medium" | "low" | "info";
  metric_key: string;
  message: string;
  rule: string;
}

interface InteractionInsight {
  severity: "high" | "medium" | "info";
  rule: string;
  message: string;
  metrics: string[];
}

interface SensitivityAnalysis {
  source_metric: string;
  reported_value: number;
  industry_median: number;
  normalized_sde: number;
  reported_sde: number;
  normalized_dscr: number | null;
  reported_dscr: number | null;
  insight: string;
}

interface MetricRow {
  metric_key: string;
  metric_label: string;
  outlier_kind: "strong" | "validation" | "risk" | null;
  display_percentile: number | null;
}

interface BenchmarkAnalysis {
  industry_name: string | null;
  tension_indicator: string | null;
  financial_position: MetricRow[];
  risk_flags: RiskFlag[];
  strengths: { metric_key: string; message: string }[];
  interaction_insights: InteractionInsight[];
  sensitivity?: SensitivityAnalysis;
  deal_structure?: { interpretation: string[]; flags: RiskFlag[] };
  financial_score: number | null;
  score_drivers: string[];
  score_risk_dependencies: string[];
}

function buildRuleBasedInterpretation(a: BenchmarkAnalysis): string[] {
  const lines: string[] = [];

  // 1. Tension indicator first (if present, it's the headline)
  if (a.tension_indicator) {
    lines.push(a.tension_indicator);
  } else if (a.financial_score !== null) {
    if (a.financial_score >= 75) {
      lines.push(`This deal scores ${a.financial_score}/100 — a strong financial profile relative to ${a.industry_name ?? "industry"} peers, supported by ${a.score_drivers.slice(0, 2).join(" and ").toLowerCase() || "broad-based performance"}.`);
    } else if (a.financial_score >= 55) {
      lines.push(`This deal scores ${a.financial_score}/100 — a credible profile with specific areas a lender will probe in diligence.`);
    } else {
      lines.push(`This deal scores ${a.financial_score}/100 — material financial concerns that will likely complicate financing without restructuring.`);
    }
  }

  // 2. Sensitivity insight (high priority — affects credibility)
  if (a.sensitivity) {
    lines.push(a.sensitivity.insight);
  }

  // 3. Highest-severity interaction insight
  const highInsights = a.interaction_insights.filter(i => i.severity === "high");
  if (highInsights.length > 0) {
    lines.push(highInsights[0].message);
  }

  // 4. Top deterministic flag (if not redundant with sensitivity)
  const highFlags = a.risk_flags.filter(f => f.severity === "high");
  if (highFlags.length > 0) {
    const isSdeRelated = highFlags[0].metric_key === "sde_margin_pct";
    if (!a.sensitivity || !isSdeRelated) {
      lines.push(`Primary risk: ${highFlags[0].message.toLowerCase().replace(/\.$/, "")} — focus diligence here first.`);
    }
  }

  // 5. Strong-outlier strength callout (only when not dominated by validation outliers)
  const strongOutliers = a.financial_position.filter(r => r.outlier_kind === "strong");
  const validationOutliers = a.financial_position.filter(r => r.outlier_kind === "validation");
  if (strongOutliers.length > 0 && validationOutliers.length === 0 && a.risk_flags.length <= 1) {
    const labels = strongOutliers.map(r => r.metric_label).join(" and ");
    lines.push(`${labels} ${strongOutliers.length === 1 ? "is" : "are"} a genuine strength relative to peers.`);
  }

  // 6. Score risk dependencies
  if (a.score_risk_dependencies.length === 1) {
    lines.push(`Score caveat: ${a.score_risk_dependencies[0].toLowerCase()}.`);
  } else if (a.score_risk_dependencies.length >= 2) {
    lines.push(`Score caveats: the financial score is sensitive to ${a.score_risk_dependencies.length} dependencies that should be validated before closing.`);
  }

  // 7. Bottom line
  const hasMaterialRisk =
    a.tension_indicator !== null ||
    validationOutliers.length > 0 ||
    highFlags.length > 0 ||
    a.score_risk_dependencies.length >= 2;

  if (hasMaterialRisk) {
    lines.push("Bottom line: pursue the deal but treat the flagged metrics and dependencies as the diligence checklist — confirm them before the LOI, not after.");
  } else if (a.financial_score !== null && a.financial_score >= 70) {
    lines.push("Bottom line: the deal stands up to peer comparison cleanly; focus shifts from financial validation to commercial diligence.");
  }

  return lines.slice(0, 6);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.analysis) {
      return NextResponse.json(
        { ok: false, error: "request body must include analysis" },
        { status: 400 },
      );
    }
    const a = body.analysis as BenchmarkAnalysis;
    const interpretation = buildRuleBasedInterpretation(a);

    return NextResponse.json({
      ok: true,
      interpretation,
      generated_by: "rule_based",
    });
  } catch (err: any) {
    console.error("[interpret] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "internal error" },
      { status: 500 },
    );
  }
}
