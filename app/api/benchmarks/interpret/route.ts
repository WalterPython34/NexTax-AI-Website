// app/api/benchmarks/interpret/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// AI Interpretation endpoint — STUB IMPLEMENTATION
//
// In Checkpoint 5 this will call Claude to generate plain-English interpretation
// based on the deterministic BenchmarkAnalysis output. For now we return a
// rule-based summary so the UI's "Generate Interpretation" button works
// end-to-end without consuming API credits.
//
// Contract:
//   POST /api/benchmarks/interpret
//   body: { analysis: BenchmarkAnalysis }
//   returns: { ok: true, interpretation: string[], generated_by: 'rule_based' | 'ai' }
//
// The stub mirrors what Claude will eventually produce: 3-5 sentences derived
// from the actual flags, strengths, and metrics — never inventing facts.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

interface RiskFlag {
  severity: "high" | "medium" | "low" | "info";
  metric_key: string;
  message: string;
  rule: string;
}

interface MetricRow {
  metric_key: string;
  metric_label: string;
  outlier_kind: "strong" | "validation" | "risk" | null;
  display_percentile: number | null;
}

interface BenchmarkAnalysis {
  industry_name: string | null;
  financial_position: MetricRow[];
  risk_flags: RiskFlag[];
  strengths: { metric_key: string; message: string }[];
  deal_structure?: { interpretation: string[]; flags: RiskFlag[] };
  financial_score: number | null;
  score_drivers: string[];
}

function buildRuleBasedInterpretation(a: BenchmarkAnalysis): string[] {
  const lines: string[] = [];

  // Headline based on score
  if (a.financial_score !== null) {
    if (a.financial_score >= 75) {
      lines.push(`This deal scores ${a.financial_score}/100 — a strong financial profile relative to ${a.industry_name ?? "industry"} peers, supported by ${a.score_drivers.slice(0, 2).join(" and ").toLowerCase() || "broad-based performance"}.`);
    } else if (a.financial_score >= 55) {
      lines.push(`This deal scores ${a.financial_score}/100 — a credible profile with specific areas a lender will probe in diligence.`);
    } else {
      lines.push(`This deal scores ${a.financial_score}/100 — material financial concerns that will likely complicate financing without restructuring.`);
    }
  }

  // Validation outlier callout (most important — affects credibility of every other number)
  const validationOutliers = a.financial_position.filter(r => r.outlier_kind === "validation");
  if (validationOutliers.length > 0) {
    const labels = validationOutliers.map(r => r.metric_label).join(" and ");
    lines.push(`${labels} ${validationOutliers.length === 1 ? "is" : "are"} unusually elevated versus industry — recommend confirming the underlying earnings quality before relying on the reported numbers.`);
  }

  // Top high-severity flag (deterministic, not AI-invented)
  const highFlags = a.risk_flags.filter(f => f.severity === "high");
  if (highFlags.length > 0) {
    lines.push(`Primary risk: ${highFlags[0].message.toLowerCase().replace(/\.$/, "")} — this should be the first focus of buyer diligence.`);
  }

  // Strong outlier strength
  const strongOutliers = a.financial_position.filter(r => r.outlier_kind === "strong");
  if (strongOutliers.length > 0 && a.risk_flags.length === 0) {
    const labels = strongOutliers.map(r => r.metric_label).join(" and ");
    lines.push(`${labels} ${strongOutliers.length === 1 ? "is" : "are"} a genuine strength relative to peers and supports the case for this acquisition.`);
  }

  // Deal structure callout
  if (a.deal_structure && a.deal_structure.flags.length > 0) {
    const high = a.deal_structure.flags.find(f => f.severity === "high");
    if (high) {
      lines.push(`On the acquisition structure side: ${high.message.toLowerCase().replace(/\.$/, "")}.`);
    }
  } else if (a.deal_structure && a.deal_structure.interpretation.length > 0) {
    lines.push(a.deal_structure.interpretation[0]);
  }

  // Bottom line — what to do next
  if (highFlags.length > 0 || validationOutliers.length > 0) {
    lines.push("Bottom line: pursue the deal but treat the flagged metrics as the diligence checklist — confirm them before the LOI, not after.");
  } else if (a.financial_score !== null && a.financial_score >= 70) {
    lines.push("Bottom line: the deal stands up to peer comparison cleanly; the focus shifts from financial validation to commercial diligence.");
  }

  return lines.slice(0, 5);
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
      // When Checkpoint 5 ships, generated_by becomes 'ai' for Pro users.
    });
  } catch (err: any) {
    console.error("[interpret] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "internal error" },
      { status: 500 },
    );
  }
}
