// app/api/benchmarks/interpret/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// AI Interpretation endpoint — Claude Haiku 4.5 with deterministic fallback.
//
//   POST /api/benchmarks/interpret
//   body: { analysis: BenchmarkAnalysis }
//   returns: { ok: true, interpretation: string[], generated_by: 'ai' | 'rule_based' }
//
// Architecture:
//   1. Try Claude Haiku 4.5 with the analysis JSON as input.
//   2. Validate the response — every number in Claude's output must appear in
//      the source analysis. If validation fails, fall back to rule-based stub.
//   3. If anything else goes wrong (missing API key, network error, malformed
//      response, etc.) fall back to rule-based stub.
//
// Source-of-truth rule:
//   The deterministic benchmark engine is authoritative. Claude is a writer/
//   synthesizer, NOT an analyst. It may rephrase, weave, and add tone — but
//   it must NEVER invent metrics, percentages, dollar amounts, or claims that
//   aren't already present in the analysis JSON. The validator enforces this.
//
// User-facing behavior:
//   The user never sees fallback details. They always get a clean response
//   labeled `generated_by` (which the UI can use later if desired but doesn't
//   need to show). Server logs capture the fallback reason for observability.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

// ── Types (mirror the engine output shape) ──────────────────────────────────

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
  deal_value: number | null;
  industry_median: number | null;
  benchmark_source: "rma" | "dealstats" | null;
}

interface BenchmarkAnalysis {
  industry_name: string | null;
  tension_indicator: string | null;
  financial_position: MetricRow[];
  risk_flags: RiskFlag[];
  strengths: { metric_key: string; message: string }[];
  interaction_insights: InteractionInsight[];
  sensitivity?: SensitivityAnalysis;
  deal_structure?: {
    interpretation: string[];
    flags: RiskFlag[];
    metrics: { key: string; label: string; value: number | null; display: string; status: string }[];
    sources_uses: { balanced: boolean; total_uses: number; total_sources: number };
  };
  financial_score: number | null;
  score_drivers: string[];
  score_risk_dependencies: string[];
}

const CLAUDE_MODEL  = "claude-haiku-4-5-20251001";
const CLAUDE_API    = "https://api.anthropic.com/v1/messages";
const CLAUDE_TIMEOUT_MS = 12_000;   // Plenty for Haiku's typical 1–2s latency
const MAX_OUTPUT_TOKENS = 600;       // Caps cost — Haiku is at $5/MTok output

// ── System prompt: strict, defensive, factual ────────────────────────────────

const SYSTEM_PROMPT = `You are an institutional credit-memo writer for a SMB acquisition diligence platform. Your role is to synthesize a deterministic financial analysis into a clean, lender-grade interpretation.

CRITICAL RULES — these are non-negotiable:
1. The analysis JSON is the ONLY source of truth. You may rephrase and weave together what's there, but you must NOT invent any numbers, percentages, dollar amounts, ratios, or claims about the deal.
2. Every numeric value in your output MUST appear (in the same form) somewhere in the analysis JSON. No "approximately" hedging that introduces new numbers.
3. Do not invent risks, opportunities, or recommendations not supported by the analysis. The deterministic engine has already identified what matters.
4. Do not contradict the analysis. If tension_indicator says "mixed signals," your output should reflect that tension.
5. Do not name the data sources (RMA, DealStats, etc.). Use the user-facing terms: "industry data," "observed transactions," "financial-statement data," "market data."
6. No marketing language. Write like a senior credit analyst would in a committee memo: direct, neutral, professional.

OUTPUT FORMAT:
Return EXACTLY a JSON object with one field: { "sentences": ["...", "..."] }
- 4 to 6 sentences total
- Each sentence stands alone (the UI renders them as bullet points)
- Lead with the tension indicator if one exists, otherwise lead with the score
- Include the sensitivity insight verbatim or close to verbatim if present
- End with a "Bottom line" sentence that gives clear diligence guidance

Do not include any text outside the JSON. No code fences. No commentary.`;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pull a compact, prompt-safe representation of the analysis. We strip
 * fields the model doesn't need (deal_id, generated_at, naics_code) and
 * keep what matters for narrative: tension, sensitivity, flags, scores.
 */
function buildAnalysisPrompt(a: BenchmarkAnalysis): string {
  const compact = {
    industry_name: a.industry_name,
    financial_score: a.financial_score,
    score_drivers: a.score_drivers,
    score_risk_dependencies: a.score_risk_dependencies,
    tension_indicator: a.tension_indicator,
    sensitivity: a.sensitivity ?? null,
    risk_flags: a.risk_flags.map(f => ({ severity: f.severity, message: f.message })),
    interaction_insights: a.interaction_insights.map(i => ({ severity: i.severity, message: i.message })),
    strengths: a.strengths.map(s => s.message),
    metrics_summary: a.financial_position
      .filter(r => !r.deal_value === null || r.outlier_kind !== null)
      .map(r => ({
        label: r.metric_label,
        deal_value: r.deal_value,
        industry_median: r.industry_median,
        percentile: r.display_percentile,
        outlier_kind: r.outlier_kind,
      })),
    deal_structure: a.deal_structure
      ? {
          metrics: a.deal_structure.metrics.map(m => ({
            label: m.label, value: m.value, display: m.display, status: m.status,
          })),
          sources_uses_balanced: a.deal_structure.sources_uses.balanced,
          interpretation: a.deal_structure.interpretation,
          flags: a.deal_structure.flags.map(f => ({ severity: f.severity, message: f.message })),
        }
      : null,
  };
  return `Here is the deterministic analysis. Synthesize it into 4-6 sentences per the rules:

${JSON.stringify(compact, null, 2)}`;
}

/**
 * Extract every number-shaped token from a string. Catches:
 *   - integers (1, 100, 1000)
 *   - decimals (1.30, 17.8)
 *   - percentages (8.4%, 17.8%)
 *   - ratios (2.06x, 1.30x)
 *   - dollar amounts ($320K, $1.2M, $151,200)
 *   - scores (91/100)
 *
 * Returns a Set of the numeric core (e.g. "1.30" from "1.30x", "17.8" from "17.8%").
 * We compare cores so "8.4%" matches "8.4" or "8.40" depending on source format.
 */
function extractNumericCores(text: string): Set<string> {
  const out = new Set<string>();

  // Match patterns and pull the numeric core
  // Order matters: dollar/abbrev formats before bare numbers, so $1.2M doesn't double-match
  const moneyAbbrevRe = /\$([\d,]+\.?\d*)\s*([KMB])/gi;
  const moneyRe = /\$([\d,]+\.?\d*)/g;
  const pctRe = /([\d,]+\.?\d*)\s*%/g;
  const ratioRe = /([\d,]+\.?\d*)\s*x\b/gi;
  const scoreRe = /(\d+)\s*\/\s*100\b/g;
  const bareRe = /\b([\d,]+\.?\d+|\d+)\b/g;

  const stripCommas = (s: string) => s.replace(/,/g, "");
  const normalize = (s: string) => {
    const n = parseFloat(stripCommas(s));
    return Number.isFinite(n) ? String(+n.toFixed(4)).replace(/\.?0+$/, "") || "0" : null;
  };
  const add = (raw: string) => {
    const n = normalize(raw);
    if (n !== null) out.add(n);
  };

  let m: RegExpExecArray | null;
  const consumed = new Set<number>();

  // First pass: $1.2M / $320K — record the abbreviation-expanded value
  while ((m = moneyAbbrevRe.exec(text)) !== null) {
    const base = parseFloat(stripCommas(m[1]));
    if (!Number.isFinite(base)) continue;
    const mult = m[2].toUpperCase() === "K" ? 1_000 : m[2].toUpperCase() === "M" ? 1_000_000 : 1_000_000_000;
    add(String(base * mult));
    add(String(base));
    for (let i = m.index; i < m.index + m[0].length; i++) consumed.add(i);
  }

  // Second pass: bare $ amounts not already consumed
  while ((m = moneyRe.exec(text)) !== null) {
    if (consumed.has(m.index)) continue;
    add(m[1]);
    for (let i = m.index; i < m.index + m[0].length; i++) consumed.add(i);
  }

  // Percentages
  while ((m = pctRe.exec(text)) !== null) {
    if (consumed.has(m.index)) continue;
    add(m[1]);
    for (let i = m.index; i < m.index + m[0].length; i++) consumed.add(i);
  }

  // Ratios e.g. 2.06x
  while ((m = ratioRe.exec(text)) !== null) {
    if (consumed.has(m.index)) continue;
    add(m[1]);
    for (let i = m.index; i < m.index + m[0].length; i++) consumed.add(i);
  }

  // Score / 100
  while ((m = scoreRe.exec(text)) !== null) {
    if (consumed.has(m.index)) continue;
    add(m[1]);
    add("100");
    for (let i = m.index; i < m.index + m[0].length; i++) consumed.add(i);
  }

  // Bare numbers — anything left
  while ((m = bareRe.exec(text)) !== null) {
    if (consumed.has(m.index)) continue;
    add(m[1]);
  }

  return out;
}

/**
 * Validate that every numeric core in the AI output exists in the source.
 *
 * Tolerance rules (to avoid false positives on legitimate rewording):
 *   - Numbers like "2", "3", "5" (single digit, no decimal) are ignored —
 *     these often appear as counts ("3 dependencies") that are correct
 *     even if not literally in the source.
 *   - Common counts derived from arrays in the source (e.g. risk_flags.length)
 *     are pre-seeded into the source set.
 *   - 1.30 and 1.50 (DSCR thresholds) are always allowed because they're
 *     hardcoded reference values that may not appear verbatim in every
 *     analysis but are universally understood lender thresholds.
 */
function validateNoFabrication(
  output: string,
  source: BenchmarkAnalysis,
): { ok: true } | { ok: false; reason: string } {
  const sourceText = JSON.stringify(source);
  const sourceCores = extractNumericCores(sourceText);

  // Pre-seed common derived/threshold values
  sourceCores.add("1.30");        // DSCR financing threshold
  sourceCores.add("1.50");        // DSCR strong threshold
  sourceCores.add("1.5");         // outlier threshold
  sourceCores.add("100");         // for "X / 100" score formatting
  if (source.financial_score !== null) {
    sourceCores.add(String(source.financial_score));
  }
  // Counts users might cite: "3 risk flags", "2 dependencies"
  sourceCores.add(String(source.risk_flags.length));
  sourceCores.add(String(source.interaction_insights.length));
  sourceCores.add(String(source.strengths.length));
  sourceCores.add(String(source.score_risk_dependencies.length));
  sourceCores.add(String(source.score_drivers.length));

  const outputCores = extractNumericCores(output);

  for (const v of outputCores) {
    // Skip trivial small integers (counts, ordinals)
    const n = parseFloat(v);
    if (Number.isInteger(n) && n >= 0 && n <= 10) continue;

    if (!sourceCores.has(v)) {
      // Last-chance match: try with rounded variants (e.g. 8.4 vs 8.40)
      const variants = [
        String(+n.toFixed(2)).replace(/\.?0+$/, "") || "0",
        String(+n.toFixed(1)).replace(/\.?0+$/, "") || "0",
        String(Math.round(n)),
      ];
      const ok = variants.some(vv => sourceCores.has(vv));
      if (!ok) {
        return { ok: false, reason: `output contains number "${v}" not present in source analysis` };
      }
    }
  }

  return { ok: true };
}

// ── Claude API call ──────────────────────────────────────────────────────────

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const res = await fetch(CLAUDE_API, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Claude API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.content?.[0]?.text;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Empty response from Claude");
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse Claude's JSON response. Resilient to occasional code-fence wrappers
 * even though the system prompt says no fences.
 */
function parseSentences(raw: string): string[] {
  let text = raw.trim();

  // Strip markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.sentences)) {
    throw new Error("Response missing 'sentences' array");
  }
  const arr: string[] = parsed.sentences
    .filter((s: unknown) => typeof s === "string")
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  if (arr.length === 0) throw new Error("Empty sentences array");
  if (arr.length > 8) return arr.slice(0, 8);   // soft cap
  return arr;
}

// ── Rule-based fallback (interaction-layer aware) ────────────────────────────
// Identical to the previous stub. Kept inside this file so a single endpoint
// always returns useful output, regardless of AI availability.

function buildRuleBasedInterpretation(a: BenchmarkAnalysis): string[] {
  const lines: string[] = [];

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

  if (a.sensitivity) {
    lines.push(a.sensitivity.insight);
  }

  const highInsights = a.interaction_insights.filter(i => i.severity === "high");
  if (highInsights.length > 0) {
    lines.push(highInsights[0].message);
  }

  const highFlags = a.risk_flags.filter(f => f.severity === "high");
  if (highFlags.length > 0) {
    const isSdeRelated = highFlags[0].metric_key === "sde_margin_pct";
    if (!a.sensitivity || !isSdeRelated) {
      lines.push(`Primary risk: ${highFlags[0].message.toLowerCase().replace(/\.$/, "")} — focus diligence here first.`);
    }
  }

  const strongOutliers = a.financial_position.filter(r => r.outlier_kind === "strong");
  const validationOutliers = a.financial_position.filter(r => r.outlier_kind === "validation");
  if (strongOutliers.length > 0 && validationOutliers.length === 0 && a.risk_flags.length <= 1) {
    const labels = strongOutliers.map(r => r.metric_label).join(" and ");
    lines.push(`${labels} ${strongOutliers.length === 1 ? "is" : "are"} a genuine strength relative to peers.`);
  }

  if (a.score_risk_dependencies.length === 1) {
    lines.push(`Score caveat: ${a.score_risk_dependencies[0].toLowerCase()}.`);
  } else if (a.score_risk_dependencies.length >= 2) {
    lines.push(`Score caveats: the financial score is sensitive to ${a.score_risk_dependencies.length} dependencies that should be validated before closing.`);
  }

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

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const fallback = (a: BenchmarkAnalysis, reason: string) => {
    // Server-side log only — the user never sees fallback details.
    console.warn(`[interpret] fallback to rule_based: ${reason}`);
    return NextResponse.json({
      ok: true,
      interpretation: buildRuleBasedInterpretation(a),
      generated_by: "rule_based",
    });
  };

  let analysis: BenchmarkAnalysis;
  try {
    const body = await req.json().catch(() => null);
    if (!body?.analysis) {
      return NextResponse.json(
        { ok: false, error: "request body must include analysis" },
        { status: 400 },
      );
    }
    analysis = body.analysis as BenchmarkAnalysis;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "invalid request" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallback(analysis, "ANTHROPIC_API_KEY not set");
  }

  // Try Claude
  let raw: string;
  try {
    const prompt = buildAnalysisPrompt(analysis);
    raw = await callClaude(prompt, apiKey);
  } catch (err: any) {
    return fallback(analysis, `Claude API error: ${err?.message ?? "unknown"}`);
  }

  // Parse JSON response
  let sentences: string[];
  try {
    sentences = parseSentences(raw);
  } catch (err: any) {
    return fallback(analysis, `Parse failure: ${err?.message ?? "unknown"} | raw=${raw.slice(0, 200)}`);
  }

  // Validate no fabrication — this is the safety net
  const joined = sentences.join(" ");
  const validation = validateNoFabrication(joined, analysis);
  if (!validation.ok) {
    return fallback(analysis, `Fabrication detected: ${validation.reason}`);
  }

  return NextResponse.json({
    ok: true,
    interpretation: sentences,
    generated_by: "ai",
  });
}
