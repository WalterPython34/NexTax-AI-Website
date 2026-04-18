// lib/dealClassifier.ts
// Production-ready classification system for NexTax deal platform.
//
// ADDITIVE — does not modify scoringEngine, industryMappings, or benchmarks API.
// Plugs into the pipeline via applyDealClassification() called after deal insert.
//
// Confidence scale:
//   95 = exact NAICS match in industry_classifications
//   92 = NAICS match + keyword override applied
//   85 = broad NAICS prefix match (4-digit)
//   75 = keyword-only match (no NAICS)
//   60 = fallback (no match found)

import { createClient } from "@supabase/supabase-js";

// Use service role for server-side classification runs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClassificationInput {
  deal_name?:          string;
  industry_label?:     string;  // nextax key or free-text label
  detected_naics_code?: string; // 6-digit, if known
  short_description?:  string;
}

export interface ClassificationResult {
  model_type:               string;
  sub_model:                string[];
  rma_naics_code:           string | null;
  rma_title:                string | null;
  benchmark_family:         string | null;
  classification_confidence: number;
  classification_reasoning:  string;
  override_keyword?:        string;  // set if a keyword override was applied
}

// DB row shapes
interface IndustryClassificationRow {
  naics_code:      string;
  naics_title:     string;
  model_type:      string;
  sub_model:       string[];
  rma_naics_code:  string | null;
  rma_title:       string | null;
  benchmark_family: string;
  notes:           string | null;
}

interface KeywordOverrideRow {
  keyword:                  string;
  priority:                 number;
  override_model_type:      string | null;
  override_sub_model:       string[] | null;
  override_rma_naics_code:  string | null;
  override_rma_title:       string | null;
  benchmark_family:         string | null;
  applies_if_naics_prefix:  string[] | null;
}

// ── Proxy benchmark families ────────────────────────────────────────────────────
// When a benchmark_family uses a different industry's RMA data as a proxy,
// margin comparisons should use nuanced language rather than blunt fraud flags.
// Add any future proxy families here — checked by getBenchmarkIsProxy().

const PROXY_BENCHMARK_FAMILIES = new Set([
  "med_spa",           // RMA proxy = 621111 physician office
  "behavioral_health", // RMA proxy = 621330 when direct data unavailable
  "manufacturing",     // RMA proxy = 323111 commercial printing
  "retail",            // RMA proxy = 454110 ecommerce (no direct retail RMA)
  "wholesale",         // RMA proxy = 445110 grocery (closest distribution proxy)
]);

/**
 * Returns true when the benchmark family uses a proxy RMA source.
 * UI components use this to show "Proxy Benchmark" wording instead of "Industry Benchmark".
 */
export function getBenchmarkIsProxy(benchmarkFamily: string | null | undefined): boolean {
  return PROXY_BENCHMARK_FAMILIES.has(benchmarkFamily ?? "");
}

// ── Mixed business signals ───────────────────────────────────────────────────
// When a deal shows signals from multiple distinct business categories,
// confidence is penalized by 15 points and reasoning notes the ambiguity.
// This prevents overconfident classification of blended revenue models.

const MIXED_BUSINESS_SIGNAL_GROUPS: string[][] = [
  ["restaurant", "dining", "food service"],          // food
  ["gym", "fitness", "workout"],                     // fitness
  ["retail", "merchandise", "merch", "store"],       // retail
  ["smoothie", "juice bar", "cafe", "coffee"],       // beverage
  ["salon", "spa", "beauty"],                        // beauty/personal
  ["software", "saas", "platform", "tech"],          // digital
];

function detectMixedBusiness(texts: string[]): boolean {
  const combined = texts.join(" ");
  let groupsMatched = 0;
  for (const group of MIXED_BUSINESS_SIGNAL_GROUPS) {
    if (group.some(signal => combined.includes(signal))) groupsMatched++;
    if (groupsMatched >= 2) return true;
  }
  return false;
}

// ── Fallback classification ───────────────────────────────────────────────────
// Used when nothing in Supabase matches. Never returns null.

const FALLBACK: ClassificationResult = {
  model_type:               "service",
  sub_model:                [],
  rma_naics_code:           null,
  rma_title:                null,
  benchmark_family:         null,
  classification_confidence: 60,
  classification_reasoning:  "No NAICS or keyword match found — using generic service fallback.",
};

// ── Helper: normalize text for keyword matching ───────────────────────────────

function normalize(s: string | undefined | null): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function textContainsKeyword(texts: string[], keyword: string): boolean {
  const kw = normalize(keyword);
  return texts.some(t => normalize(t).includes(kw));
}

// ── Core classification function ──────────────────────────────────────────────

/**
 * Classifies a deal into model_type, benchmark_family, RMA mapping, etc.
 *
 * Resolution order:
 * 1. Exact NAICS lookup in industry_classifications
 * 2. Keyword scan against industry_keyword_overrides (lowest priority wins)
 * 3. Broad NAICS prefix match (4-digit) in industry_classifications
 * 4. Fallback
 *
 * @example
 * const result = await classifyDealIndustry({
 *   deal_name: "Tampa Med Spa - Established Aesthetics Practice",
 *   detected_naics_code: "621111",
 * });
 * // → { model_type: "service", benchmark_family: "healthcare_clinical",
 * //     classification_confidence: 92, override_keyword: "med spa" }
 */
export async function classifyDealIndustry(
  input: ClassificationInput,
): Promise<ClassificationResult> {

  const {
    deal_name         = "",
    industry_label    = "",
    detected_naics_code = "",
    short_description = "",
  } = input;

  const searchTexts = [deal_name, industry_label, short_description];

  // ── Step 1: Load base classification from exact NAICS ────────────────────
  let baseRow: IndustryClassificationRow | null = null;

  if (detected_naics_code) {
    const { data } = await supabase
      .from("industry_classifications")
      .select("naics_code,naics_title,model_type,sub_model,rma_naics_code,rma_title,benchmark_family,notes")
      .eq("naics_code", detected_naics_code)
      .eq("is_active", true)
      .single();
    baseRow = data ?? null;
  }

  // ── Step 2: Keyword scan against overrides ───────────────────────────────
  // Fetch all active overrides (small table — full load is fine)
  const { data: overrides } = await supabase
    .from("industry_keyword_overrides")
    .select("keyword,priority,override_model_type,override_sub_model,override_rma_naics_code,override_rma_title,benchmark_family,applies_if_naics_prefix")
    .eq("is_active", true)
    .order("priority", { ascending: true }); // lowest priority = strongest

  let matchedOverride: KeywordOverrideRow | null = null;

  if (overrides && overrides.length > 0) {
    for (const override of overrides) {
      // Check NAICS prefix restriction if set.
      // Empty array = no restriction (fires for any or unknown NAICS).
      // Non-empty array = only fires when detected_naics_code starts with one of the prefixes.
      const prefixes = override.applies_if_naics_prefix ?? [];
      if (prefixes.length > 0) {
        const naicsToCheck = detected_naics_code || "";
        const prefixMatches = prefixes.some(prefix => naicsToCheck.startsWith(prefix));
        // Has a restriction AND the detected NAICS doesn't match → skip
        if (!prefixMatches) continue;
      }
      // prefixes.length === 0 → no restriction, fall through to keyword check
      if (textContainsKeyword(searchTexts, override.keyword)) {
        matchedOverride = override;
        break; // already ordered by priority — first match is the strongest
      }
    }
  }

  // ── Step 3: Broad NAICS prefix match (4-digit) ───────────────────────────
  let broadRow: IndustryClassificationRow | null = null;

  if (!baseRow && detected_naics_code && detected_naics_code.length >= 4) {
    const prefix = detected_naics_code.slice(0, 4);
    const { data: broadResults } = await supabase
      .from("industry_classifications")
      .select("naics_code,naics_title,model_type,sub_model,rma_naics_code,rma_title,benchmark_family,notes")
      .like("naics_code", `${prefix}%`)
      .eq("is_active", true)
      .limit(1);
    broadRow = broadResults?.[0] ?? null;
  }

  // ── Step 4: Build result ─────────────────────────────────────────────────

  // Case A: Exact NAICS + keyword override → confidence 92
  if (baseRow && matchedOverride) {
    const isMixed_a = detectMixedBusiness(searchTexts);
    return {
      model_type:                matchedOverride.override_model_type   ?? baseRow.model_type,
      sub_model:                 matchedOverride.override_sub_model    ?? baseRow.sub_model,
      rma_naics_code:            matchedOverride.override_rma_naics_code ?? baseRow.rma_naics_code,
      rma_title:                 matchedOverride.override_rma_title    ?? baseRow.rma_title,
      benchmark_family:          matchedOverride.benchmark_family      ?? baseRow.benchmark_family,
      classification_confidence: isMixed_a ? 77 : 92,
      classification_reasoning:  (() => {
        const proxyNote = matchedOverride.override_rma_naics_code && matchedOverride.override_rma_naics_code !== detected_naics_code
          ? ` RMA proxy: ${matchedOverride.override_rma_naics_code} (${matchedOverride.override_rma_title ?? "proxy source"}).`
          : "";
        const mixedNote_a = isMixed_a ? " Mixed business signals detected — confidence reduced." : "";
        return `Incoming NAICS: ${detected_naics_code} (${baseRow.naics_title}). Keyword override: "${matchedOverride.keyword}". Final benchmark family: ${matchedOverride.benchmark_family ?? baseRow.benchmark_family}.${proxyNote}${mixedNote_a}`;
      })(),
      override_keyword:          matchedOverride.keyword,
    };
  }

  // Case B: Exact NAICS only → confidence 95
  if (baseRow) {
    const isMixed_b = detectMixedBusiness(searchTexts);
    return {
      model_type:                baseRow.model_type,
      sub_model:                 baseRow.sub_model,
      rma_naics_code:            baseRow.rma_naics_code,
      rma_title:                 baseRow.rma_title,
      benchmark_family:          baseRow.benchmark_family,
      classification_confidence: isMixed_b ? 80 : 95,
      classification_reasoning:  `Incoming NAICS: ${detected_naics_code} (${baseRow.naics_title}). Direct NAICS match. Benchmark family: ${baseRow.benchmark_family}. RMA source: ${baseRow.rma_naics_code ?? "same"}.${isMixed_b ? " Mixed business signals detected — confidence reduced." : ""}`,
    };
  }

  // Case C: Keyword override only (no NAICS match) → confidence 75
  if (matchedOverride) {
    return {
      model_type:                matchedOverride.override_model_type   ?? FALLBACK.model_type,
      sub_model:                 matchedOverride.override_sub_model    ?? [],
      rma_naics_code:            matchedOverride.override_rma_naics_code ?? null,
      rma_title:                 matchedOverride.override_rma_title    ?? null,
      benchmark_family:          matchedOverride.benchmark_family      ?? null,
      classification_confidence: 75,
      classification_reasoning:  (() => {
        const proxyNote = matchedOverride.override_rma_naics_code
          ? ` RMA proxy: ${matchedOverride.override_rma_naics_code} (${matchedOverride.override_rma_title ?? "proxy source"}).`
          : "";
        return `Incoming NAICS: ${detected_naics_code || "none"}. No base NAICS match. Keyword "${matchedOverride.keyword}" matched deal text. Final benchmark family: ${matchedOverride.benchmark_family ?? "unclassified"}.${proxyNote}`;
      })(),
      override_keyword:          matchedOverride.keyword,
    };
  }

  // Case D: Broad 4-digit NAICS prefix → confidence 85
  if (broadRow) {
    return {
      model_type:                broadRow.model_type,
      sub_model:                 broadRow.sub_model,
      rma_naics_code:            broadRow.rma_naics_code,
      rma_title:                 broadRow.rma_title,
      benchmark_family:          broadRow.benchmark_family,
      classification_confidence: 85,
      classification_reasoning:  `Broad NAICS prefix match (${detected_naics_code.slice(0,4)}xx → ${broadRow.naics_code}).`,
    };
  }

  // Case E: Fallback → confidence 60
  return {
    ...FALLBACK,
    classification_reasoning: detected_naics_code
      ? `NAICS ${detected_naics_code} not found in classifications. No keyword match. Using fallback.`
      : `No NAICS code and no keyword match found. Using fallback.`,
  };
}

// ── Apply classification to a saved deal ─────────────────────────────────────

/**
 * Fetches a deal, classifies it, updates deal_runs, and writes an audit log.
 * Safe to call multiple times — each call appends a new log row but only
 * the latest classification fields are stored on deal_runs.
 *
 * @example
 * await applyDealClassification("uuid-of-deal");
 */
export async function applyDealClassification(dealId: string): Promise<ClassificationResult> {
  // Fetch the deal
  const { data: deal, error: fetchError } = await supabase
    .from("deal_runs")
    .select("id, industry, tool_used, model_type, sub_model, rma_naics_code")
    .eq("id", dealId)
    .single();

  if (fetchError || !deal) {
    throw new Error(`applyDealClassification: deal ${dealId} not found — ${fetchError?.message}`);
  }

  // Build classification input from deal fields
  // industry = nextax key (e.g. "landscaping") — use as industry_label
  // We don't have a raw deal title here; that would come from raw_data if stored
  const input: ClassificationInput = {
    industry_label:     deal.industry ?? "",
    detected_naics_code: "", // deal_runs doesn't store NAICS — classifier uses label + keyword
  };

  const result = await classifyDealIndustry(input);

  // Store initial state for audit log before overwriting
  const initial_model_type     = deal.model_type    ?? null;
  const initial_sub_model      = deal.sub_model     ?? null;
  const initial_rma_naics_code = deal.rma_naics_code ?? null;

  // Update deal_runs with classification result
  await supabase
    .from("deal_runs")
    .update({
      model_type:                result.model_type,
      sub_model:                 result.sub_model,
      benchmark_family:          result.benchmark_family,
      rma_naics_code:            result.rma_naics_code,
      rma_title:                 result.rma_title,
      classification_confidence: result.classification_confidence,
      classification_reasoning:  result.classification_reasoning,
    })
    .eq("id", dealId);

  // Append audit log
  await supabase
    .from("deal_classification_logs")
    .insert({
      deal_id:               dealId,
      detected_naics_code:   input.detected_naics_code || null,
      initial_model_type,
      final_model_type:      result.model_type,
      initial_sub_model,
      final_sub_model:       result.sub_model,
      initial_rma_naics_code,
      final_rma_naics_code:  result.rma_naics_code,
      override_keyword:      result.override_keyword ?? null,
      confidence_score:      result.classification_confidence,
      reasoning:             result.classification_reasoning,
    });

  return result;
}

// ── UI helper ─────────────────────────────────────────────────────────────────

/**
 * Returns a human-friendly benchmark label for display in the UI.
 * Safe — never throws, always returns a string.
 *
 * @example
 * getBenchmarkLabelForUI("service", "field_services")
 * // → "Local Service Benchmark"
 */
export function getBenchmarkLabelForUI(
  model_type:      string | null | undefined,
  benchmark_family: string | null | undefined,
): string {
  // Family-first — more specific than model_type alone
  const familyLabels: Record<string, string> = {
    field_services:        "Local Service Benchmark",
    specialty_trade:       "Trades Benchmark",
    auto_services:         "Auto Services Benchmark",
    food_beverage:         "Restaurant & Food Benchmark",
    healthcare_clinical:   "Healthcare Benchmark",
    behavioral_health:     "Behavioral Health Benchmark",
    med_spa:               "Med Spa Benchmark",
    personal_services:     "Personal Services Benchmark",
    professional_services: "Professional Services Benchmark",
    asset_services:        "Asset-Based Business Benchmark",
    saas:                  "SaaS / Recurring Software Benchmark",
    digital:               "Digital Business Benchmark",
    manufacturing:         "Manufacturing Benchmark",
    retail:                "Retail Business Benchmark",
    wholesale:             "Wholesale / Distribution Benchmark",
  };

  if (benchmark_family && familyLabels[benchmark_family]) {
    return familyLabels[benchmark_family];
  }

  // Fallback to model_type label
  const modelLabels: Record<string, string> = {
    service:   "Service Business Benchmark",
    product:   "Product Business Benchmark",
    asset:     "Asset-Heavy Benchmark",
    recurring: "Recurring Revenue Benchmark",
    mixed:     "Mixed Model Benchmark",
  };

  if (model_type && modelLabels[model_type]) {
    return modelLabels[model_type];
  }

  return "Industry Benchmark";
}
