// app/acquiflow-intel/_lib/committeeNarrative.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow — Committee Narrative Generator (PRESENTATION LAYER ONLY)
//
// Synthesizes institutional committee-memo prose FROM:
//   - CP's categorical reasoning (readiness, contributing factors, impact items)
//   - raw market facts (closed-comp position, listing gap, days-on-market)
//   - deal facts (industry, revenue, sde, asking)
//
// CONSTITUTIONAL POSITION:
//   This is a PRESENTATION-LAYER transformation. It READS CP's output to write
//   prose; its output is NEVER written back to evaluation_snapshots and is NEVER
//   fed into CP. CP remains frozen and prose-free. The narrative is generated
//   fresh for display and is fully regenerable.
//
// HARD PROHIBITIONS (enforced in the prompt AND a post-generation guard):
//   - no numeric scores, ratings, grades, or "X/10" framing
//   - no verdicts ("good deal", "pass", "buy", "avoid")
//   - no "overpriced" / "undervalued" / "cheap" / "expensive" conclusions
//   - no recommendations ("you should", "we advise", "offer X")
//   - no licensed source names (DealStats / RMA / BizBuySell / IBISWorld) —
//     refer to "proprietary closed-transaction benchmarks" / "NexTax Intelligence"
//   - MEASUREMENT-BASIS CAUTION: report the deal's position vs closed comps
//     FACTUALLY; do NOT editorialize an above-distribution position as
//     "overpriced" (industry multiple bases differ; e.g. dental practices often
//     trade on collections / real estate / patient base, not raw SDE multiples)
//
// Model is behind ONE constant so a rename/deprecation is a one-line change.
// ─────────────────────────────────────────────────────────────────────────────

const COMMITTEE_NARRATIVE_MODEL =
  (typeof process !== "undefined" && process.env?.COMMITTEE_NARRATIVE_MODEL) ||
  "claude-sonnet-4-6";

const ANTHROPIC_API_KEY =
  (typeof process !== "undefined" && process.env?.ANTHROPIC_API_KEY) || "";

export interface CommitteeNarrative {
  posture: string;        // the binding question, in committee voice
  market_context: string; // factual placement vs closed comps + listings + DOM
  verification?: string;  // [E4 P3] verification posture + evidence gaps (v2.0 rows only)
  evidence: string;       // what the read rests on; the diligence path framing
  model: string;          // which model produced it (provenance)
}

// [E4 P3] Deterministic verification inputs — supplied by the committee route
// ONLY for v2.0 rows with an observed divergence. When null, no verification
// section is requested and the output shape is unchanged.
export interface VerificationInputs {
  confidence_grade: string | null;
  divergence_band: string;
  closed_lens_band: string | null;
  reference_source_quality: string | null;
  reference_n: number | null;
  priority_one_items: { item_key: string; trigger: string; template_version: string; priority: 1 | 2 | 3; text: string }[];
}

// Position phrasing — factual, never a verdict.
function positionPhrase(pos: string | null): string {
  switch (pos) {
    case "below_p25": return "below the 25th percentile of comparable closed transactions";
    case "between_p25_median": return "between the 25th percentile and the median of comparable closed transactions";
    case "between_median_p75": return "between the median and the 75th percentile of comparable closed transactions";
    case "above_p75": return "above the 75th percentile of comparable closed transactions";
    default: return "not positionable against closed comparables at sufficient depth";
  }
}

// Build a compact, factual brief for the model — ONLY grounded inputs.
function buildFactBrief(cp: any, mf: any, deal: any): string {
  const r = cp?.readiness ?? {};
  const ir = cp?.impact_ranking ?? {};
  const factors = (r.contributing_factors ?? [])
    .map((f: any) => `${f.axis_or_dimension} (${f.state}${f.band ? ", " + f.band + " band" : ""})`)
    .join("; ");
  const topItems = (ir.ranked_items ?? [])
    .slice(0, 5)
    .map((i: any) => `${i.impact_classification}: ${i.item_label || i.item_id}${i.impact_dimensions?.affects_binding_constraint ? " [on binding constraint]" : ""}`)
    .join("; ");

  const lines: string[] = [];
  lines.push(`INDUSTRY: ${deal?.industry ?? "unknown"}`);
  lines.push(`DEAL FACTS: revenue ${money(deal?.revenue)}, SDE ${money(deal?.sde)}, asking ${money(deal?.asking_price)}.`);
  lines.push("");
  lines.push("CP ENGINE REASONING (categorical — do not restate as a score):");
  lines.push(`- Readiness classification: ${r.classification ?? "n/a"}`);
  lines.push(`- Contributing factors (in priority order): ${factors || "none recorded"}`);
  lines.push(`- Capital-structure posture: ${r.interested_personality_count ?? 0} would engage, ${r.cautious_personality_count ?? 0} cautious, ${r.declined_personality_count ?? 0} would decline`);
  lines.push(`- Blocking structural concerns: ${r.blocking_structural_concern_count ?? 0}; evidence gaps: ${r.missing_evidence_count ?? 0}`);
  lines.push(`- Top impact-ranked items: ${topItems || "none"}`);
  lines.push("");
  lines.push("MARKET FACTS (raw, factual context — proprietary closed-transaction benchmarks):");
  if (mf) {
    lines.push(`- Deal asking multiple: ${fmt(mf.deal_multiple)}x (asking / SDE)`);
    if (mf.closed_comp_median != null) {
      lines.push(`- Closed comparable transactions: P25 ${fmt(mf.closed_comp_p25)}x, median ${fmt(mf.closed_comp_median)}x, P75 ${fmt(mf.closed_comp_p75)}x, across ${mf.closed_comp_sample_size} transactions`);
      lines.push(`- The deal multiple sits ${positionPhrase(mf.deal_vs_closed_position)}`);
    } else {
      lines.push(`- Closed comparable transactions: insufficient depth to position this industry/size band`);
    }
    if (mf.listing_multiple != null) {
      lines.push(`- Current listing (asking) multiple in the market: ${fmt(mf.listing_multiple)}x` +
        (mf.listing_vs_closed_gap_pct != null ? `; current listings sit ${fmt(mf.listing_vs_closed_gap_pct)}% relative to closed-deal levels` : ""));
    }
    if (mf.median_days_on_market != null) {
      lines.push(`- Typical time to sell in this industry: ~${mf.median_days_on_market} days on market`);
    }
    lines.push(`- Evidence depth: ${mf.evidence_depth?.closed_comp_sample_size ?? 0} closed comps, ${mf.evidence_depth?.listing_sample_size ?? 0} active listings behind these figures`);
  } else {
    lines.push("- Market facts unavailable for this deal.");
  }
  return lines.join("\n");
}

// [E4 P3] Verification brief — deterministic fields only, no derived figures.
function buildVerificationBrief(v: VerificationInputs): string {
  const lines: string[] = [];
  lines.push("");
  lines.push("VERIFICATION POSTURE (deterministic v2.0 observation — narrate, do not reinterpret):");
  lines.push(`- Confidence grade: ${v.confidence_grade ?? "not recorded"}`);
  lines.push(`- Divergence band: ${v.divergence_band}; closed-lens band: ${v.closed_lens_band ?? "not recorded"}`);
  lines.push(`- Reference source quality: ${v.reference_source_quality ?? "not recorded"}; peer reference count: ${v.reference_n ?? "not recorded"}`);
  if (v.priority_one_items.length > 0) {
    lines.push("- Highest-priority evidence gaps:");
    v.priority_one_items.forEach((it, i) => lines.push(`  ${i + 1}. ${it.text}`));
  } else {
    lines.push("- Highest-priority evidence gaps: none recorded");
  }
  return lines.join("\n");
}

function money(n: any): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "n/a";
  return "$" + (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : (n / 1e3).toFixed(0) + "K");
}
function fmt(n: any): string {
  return typeof n === "number" && Number.isFinite(n) ? String(+n.toFixed(2)) : "n/a";
}

const SYSTEM_PROMPT = `You are drafting a pre-LOI underwriting memo for an investment committee reviewing a small-business acquisition. Your voice is that of a measured, experienced underwriting team — institutional, precise, never promotional.

You are given two INDEPENDENT inputs: (1) a deterministic reasoning engine's CATEGORICAL findings, and (2) raw FACTUAL market benchmark context. Your job is to translate these into committee-memo prose. You synthesize; you do not judge.

ABSOLUTE RULES — violating any of these invalidates the output:
1. NO scores, ratings, grades, percentages-as-quality, or "X out of Y" framing of the deal's quality. The engine does not score and neither do you.
2. NO verdicts. Never say a deal is good, bad, strong, weak, a pass, a buy, worth it, or a ripoff.
3. NO "overpriced", "undervalued", "cheap", "expensive", or "fair price" conclusions. You may state factual POSITION (e.g. "sits above the 75th percentile of closed comparables") but you must NOT characterize that position as good or bad pricing.
4. MEASUREMENT-BASIS CAUTION: a multiple sitting above or below the closed-comparable distribution is a FACTUAL position, not evidence of mispricing. Different industries trade on different bases (some on collections, real estate, or recurring revenue rather than raw earnings multiples). When a deal sits outside the distribution, present it as "a position the committee would examine" and note it warrants understanding the basis — never as overpricing.
5. NO recommendations. Never tell the reader what to do, what to offer, or whether to proceed.
6. NO data-vendor names. Refer to benchmark data only as "proprietary closed-transaction benchmarks", "closed comparable transactions", or "proprietary market intelligence". Never name any data provider.
7. Every claim must be grounded in the provided inputs. Invent nothing — no concerns, no figures, no context not given.
8. Keep the engine's reasoning and the market facts as DISTINCT lenses. The engine reasons about deal structure and durability; the market facts describe transaction positioning. Do not merge them into a single judgment.

OUTPUT FORMAT — return ONLY valid JSON, no preamble, no markdown:
{
  "posture": "2-3 sentences: the committee's binding question, grounded in the engine's readiness classification and binding contributing factor. Institutional voice.",
  "market_context": "2-4 sentences: where the asking multiple factually sits relative to closed comparable transactions (with the sample depth), and the listing-vs-closed context and time-on-market if available. Strictly factual placement. Apply the measurement-basis caution.",
  "evidence": "2-3 sentences: what the read rests on — the capital-structure posture spread and the evidence the engine flags as needing strengthening, framed as what a committee would examine before commitment. No recommendations."
}`;

// [E4 P3] Appended to the system prompt ONLY when verification inputs are
// provided. The middle paragraph is the design-locked instruction, verbatim.
const VERIFICATION_PROMPT_ADDENDUM = `

VERIFICATION SECTION — the inputs include a VERIFICATION POSTURE block. Add a fourth key to the JSON output, between "market_context" and "evidence":
  "verification": "2-4 sentences narrating the verification posture and the highest-priority evidence gaps."

Narrate the verification posture and the listed evidence gaps in committee language. You may not add, remove, reword the substance of, or re-prioritize any item. State the confidence grade and, where the grade is UNVERIFIED, render it as Earnings Verification Required. Do not use the words implied, corrected, adjusted, or lender. Do not present the industry reference as an earnings conclusion.`;

/**
 * Generate the committee narrative. Best-effort: returns null on any failure
 * (missing key, API error, malformed output, or guard rejection) so the
 * committee route degrades gracefully to structured-data-only.
 */
export async function generateCommitteeNarrative(
  cp: any,
  marketFacts: any,
  dealFacts: any,
  verification: VerificationInputs | null = null,
): Promise<CommitteeNarrative | null> {
  if (!ANTHROPIC_API_KEY) return null;
  if (!cp?.readiness) return null;

  const brief = buildFactBrief(cp, marketFacts, dealFacts)
    + (verification ? "\n" + buildVerificationBrief(verification) : "");
  const systemPrompt = SYSTEM_PROMPT + (verification ? VERIFICATION_PROMPT_ADDENDUM : "");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: COMMITTEE_NARRATIVE_MODEL,
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: `Draft the committee memo sections from these inputs:\n\n${brief}` }],
      }),
    });

    if (!res.ok) {
      console.warn(`[committee-narrative] API ${res.status}`);
      return null;
    }
    const data = await res.json();
    const text = (data?.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();
    if (!text) return null;

    // Parse JSON (strip any stray code fences just in case).
    const cleaned = text.replace(/```json|```/g, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn("[committee-narrative] non-JSON output");
      return null;
    }
    if (!parsed.posture || !parsed.market_context || !parsed.evidence) return null;

    // [E4 P3] Verification section — only honored when it was requested.
    // Best-effort: if the model omitted it, the memo renders without the
    // section (same graceful-degradation posture as the narrative itself).
    let verificationText: string | null =
      verification && parsed.verification ? String(parsed.verification).trim() : null;

    const combined = `${parsed.posture}\n${parsed.market_context}\n${verificationText ?? ""}\n${parsed.evidence}`;

    // ── POST-GENERATION GUARD — reject prohibited language ──
    if (violatesProhibitions(combined)) {
      console.warn("[committee-narrative] guard rejected output (prohibited language)");
      return null;
    }

    // [E4 P3] Copy-constraint guard, verification section only: these words are
    // banned in verification prose but may legitimately appear elsewhere in the
    // memo, so a violation drops the section, not the whole narrative.
    if (verificationText && /\b(implied|corrected|adjusted|lender)\b/i.test(verificationText)) {
      console.warn("[committee-narrative] verification section rejected (banned verification language)");
      verificationText = null;
    }

    return {
      posture: String(parsed.posture).trim(),
      market_context: String(parsed.market_context).trim(),
      ...(verificationText ? { verification: verificationText } : {}),
      evidence: String(parsed.evidence).trim(),
      model: COMMITTEE_NARRATIVE_MODEL,
    };
  } catch (e) {
    console.warn("[committee-narrative] threw:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

// Reject if the narrative contains verdict/score/recommendation/vendor language.
function violatesProhibitions(text: string): boolean {
  const t = text.toLowerCase();
  const banned = [
    // verdicts / pricing conclusions
    "overpriced", "underpriced", "undervalued", "overvalued",
    "fairly priced", "a good deal", "a bad deal", "great deal", "poor deal",
    "you should", "we recommend", "we advise", "i recommend",
    "worth buying", "worth pursuing", "avoid this", "pass on this",
    // scores
    "out of 10", "out of 100", "/10", "/100", "score of",
    // vendor names
    "dealstats", "bizbuysell", "ibisworld", "rma ",
  ];
  return banned.some((b) => t.includes(b));
}
