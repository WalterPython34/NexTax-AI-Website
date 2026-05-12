// lib/intelligence/axes/compose-evidence.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Evidence Quality Composer
//
// CP-5 Module: Computes evidence_quality AxisScore.
//
// The evidence_quality axis answers: "How trustworthy are the inputs?"
//
// What this composer reads (and what it MUST NOT read):
//
//   PERMITTED INPUTS (EvidenceComposerInputs):
//     - SourceConcern records — extracted from RuleFiring.source_concern
//       where the firing produced one. These are the engine's structured
//       observations about evidence weakness.
//     - deal_source_type — the deal-level source declaration
//     - FingerprintResolution — for diagnostic context only (this composer
//       does NOT use fingerprint-relative normalization; source strength
//       is a global benchmark)
//
//   FORBIDDEN INPUTS (type-enforced via EvidenceComposerInputs):
//     - Finding records → those feed financial_score / durability_score
//     - PatternDetection records → those feed durability_score / fragility
//     - ScenarioOutput records → those feed financial / durability / fragility
//     - UncertaintyDelta records → those feed underwriting_uncertainty
//     - AssumptionFragilityGraph → that feeds assumption_fragility
//
// The narrowest input contract of the five composers. Source strength
// is a global benchmark (tax_returns means the same thing regardless
// of operating model), so per-component normalization is uniformly
// global_benchmark for source-strength components. Source-deficit
// concerns may also use global_benchmark, since the "expected minimum
// source" was declared by upstream rules without fingerprint awareness.
//
// Components produced:
//
//   1. deal_source_strength — positive or negative based on declared source
//   2. source_concerns_aggregate — aggregated negative signal from
//      SourceConcern records
//   3. source_upgrade_opportunities — informational positive signal when
//      strong sources exist alongside the weak ones (mixed evidence)
//   4. fallback_fingerprint_evidence_drag — small negative when fallback
//      fingerprint means evidence quality of fingerprint metadata itself
//      is weak (fingerprint signal IS evidence quality from a methodology
//      perspective)
//
// Existential component:
//   - verbal_assertion_only — fires when deal_source_type is
//     "verbal_assertion" AND no per-metric sources upgrade the evidence
//     base. This is the genuine existential case for evidence quality.
//
// Baseline: EVIDENCE_BASELINE = 55 (most SMB deals begin with incomplete
// or seller-controlled information; starting slightly above neutral
// avoids assuming fraud while still requiring evidence upgrades to
// reach "strong").
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisComponent,
  AxisScore,
  EvidenceComposerInputs,
} from "./types";
import { EVIDENCE_BASELINE } from "./types";
import {
  assembleAxisScore,
  buildComponent,
  buildComponentId,
  sourceFromFingerprintSignal,
  sourceFromSourceConcern,
} from "./components";
import { resolveSourceStrength } from "../source-types";
import type { SourceTypeKey } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE STRENGTH MAPPING
// ─────────────────────────────────────────────────────────────────────────────
// Translate the declared deal-level source into a contribution toward
// evidence_quality. Global benchmark — tax_returns is tax_returns
// regardless of operating model.
//
// The contribution scale is symmetric: strong sources contribute
// positively, weak sources contribute negatively. Magnitudes scale to
// stay within the soft cap unless the case is existential (verbal_assertion).

const SOURCE_CONTRIBUTION_TABLE: Record<SourceTypeKey, number> = {
  // Verified band: strongly positive contributions
  tax_returns: 12,
  bank_statements: 8,
  payroll_filings: 6,
  // Documented band: small positive contributions
  pos_exports: 4,
  // Seller-prepared band: small negative contributions
  internal_pnl: -2,
  seller_spreadsheet: -8,
  // Asserted-only band: large negative (verbal_assertion is existential)
  verbal_assertion: -25,
};

/** Plain-language framing for each source type, used in component explanations. */
const SOURCE_DESCRIPTION_TABLE: Record<SourceTypeKey, string> = {
  tax_returns: "tax returns (verified band — independently filed evidence)",
  bank_statements: "bank statements (verified band — independent transaction record)",
  payroll_filings: "payroll filings (verified band — third-party-filed evidence)",
  pos_exports: "POS exports (documented band)",
  internal_pnl: "internal P&L (seller-prepared)",
  seller_spreadsheet: "seller-prepared spreadsheet (seller-controlled, unverified)",
  verbal_assertion: "verbal assertion (no documentation; structurally unverifiable)",
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY COMPOSER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compose the evidence_quality AxisScore.
 *
 * Pure function: same inputs always produce the same output.
 *
 * Process:
 *   1. Build deal-source strength component (positive or negative)
 *   2. Aggregate SourceConcern records into a single negative component
 *      (or omit if no concerns)
 *   3. Add fallback fingerprint component if applicable (small negative)
 *   4. Add verbal_assertion existential component if applicable
 *   5. Assemble final AxisScore with EVIDENCE_BASELINE
 */
export function composeEvidenceQuality(
  inputs: EvidenceComposerInputs,
): AxisScore {
  const components: AxisComponent[] = [];

  // ── Component 1: Deal-source strength ──
  const sourceComp = buildDealSourceStrengthComponent(inputs);
  if (sourceComp) components.push(sourceComp);

  // ── Component 2: Source concerns aggregate ──
  const concernsComp = buildSourceConcernsComponent(inputs);
  if (concernsComp) components.push(concernsComp);

  // ── Component 3: Fallback fingerprint methodology drag ──
  const fallbackComp = buildFallbackFingerprintComponent(inputs);
  if (fallbackComp) components.push(fallbackComp);

  // ── Existential: verbal_assertion-only deal ──
  const verbalAssertionComp = buildVerbalAssertionExistentialComponent(inputs);
  if (verbalAssertionComp) components.push(verbalAssertionComp);

  return assembleAxisScore({
    axis: "evidence_quality",
    baseline: EVIDENCE_BASELINE,
    components,
    band_strategy: "standard",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deal-source strength — the headline evidence component.
 * Positive when deal_source_type is verified-band (audited / tax_returns
 * / bank_statements); negative when seller-controlled.
 *
 * Skips when verbal_assertion (the existential component handles that
 * case explicitly to avoid double-counting). Treats unknown as a moderate
 * negative through the standard contribution table.
 */
function buildDealSourceStrengthComponent(
  inputs: EvidenceComposerInputs,
): AxisComponent | null {
  const source = inputs.deal_source_type;

  // verbal_assertion handled by the existential component
  if (source === "verbal_assertion") return null;

  // No source declared → produce a defensive "unknown source" component
  if (source === null || source === undefined) {
    return buildComponent({
      component_id: buildComponentId("evidence_quality", "deal_source_unknown"),
      axis: "evidence_quality",
      name: "Deal source not declared",
      raw_contribution: -10,
      contribution_explanation:
        `No deal-level source type was declared. The engine cannot assess whether the underlying ` +
        `financials rest on verified-band evidence (tax returns, bank statements) or seller-prepared ` +
        `materials. Treating as weak evidence pending source declaration.`,
      reference_population: "global_benchmark",
      existential_component: false,
      sources: [
        sourceFromFingerprintSignal({
          fingerprint_key: inputs.fingerprint_resolution.fingerprint.key,
          signal_description: "Deal-level source: not declared",
          signal_id: "deal_source.undeclared",
        }),
      ],
      depends_on_assumptions: [],
    });
  }

  // Check whether the declared source matches a known SourceTypeKey
  const knownKeys: ReadonlyArray<SourceTypeKey> = [
    "tax_returns",
    "bank_statements",
    "payroll_filings",
    "pos_exports",
    "internal_pnl",
    "seller_spreadsheet",
    "verbal_assertion",
  ];
  const isKnown = (knownKeys as ReadonlyArray<string>).includes(source);

  // Unrecognized source type → defensive moderate negative
  if (!isKnown) {
    return buildComponent({
      component_id: buildComponentId("evidence_quality", "deal_source_unrecognized"),
      axis: "evidence_quality",
      name: "Deal source (unrecognized type)",
      raw_contribution: -5,
      contribution_explanation:
        `Deal-level source declared as "${source}" but the engine does not recognize this source type. ` +
        `Treating as weak evidence pending source classification.`,
      reference_population: "global_benchmark",
      existential_component: false,
      sources: [
        sourceFromFingerprintSignal({
          fingerprint_key: inputs.fingerprint_resolution.fingerprint.key,
          signal_description: `Deal-level source: ${source}`,
        }),
      ],
      depends_on_assumptions: [],
    });
  }

  // Known source type → look up contribution from the table
  const sourceKey = source as SourceTypeKey;
  const contribution = SOURCE_CONTRIBUTION_TABLE[sourceKey];
  const description = SOURCE_DESCRIPTION_TABLE[sourceKey];
  const strength = resolveSourceStrength(sourceKey);

  return buildComponent({
    component_id: buildComponentId("evidence_quality", "deal_source_strength"),
    axis: "evidence_quality",
    name: `Deal source: ${sourceKey}`,
    raw_contribution: contribution,
    contribution_explanation:
      `Deal-level source declared as ${description}. ` +
      `Underlying source strength is ${strength}/100 on the global source-type ladder. ` +
      `${contribution >= 0 ? "Contributes positively to evidence quality." : "Contributes negatively until source upgrade."}`,
    reference_population: "global_benchmark",
    existential_component: false,
    sources: [
      sourceFromFingerprintSignal({
        fingerprint_key: inputs.fingerprint_resolution.fingerprint.key,
        signal_description: `Deal-level source: ${sourceKey} (strength ${strength}/100)`,
      }),
    ],
    depends_on_assumptions: [],
  });
}

/**
 * Source concerns aggregate component — sums up all SourceConcern records
 * into a single negative component. Each concern carries its own
 * evidence_quality_reduction_points from the upstream rule; we use
 * those directly as the negative contribution.
 *
 * Cap behavior: the aggregated reduction can be substantial (multiple
 * concerns on a deal). Soft cap (-15) protects against one rule-firing
 * cluster dominating the axis. If the aggregate exceeds the cap, the
 * cap diagnostic surfaces "wanted to contribute X but was capped at -15."
 */
function buildSourceConcernsComponent(
  inputs: EvidenceComposerInputs,
): AxisComponent | null {
  if (inputs.source_concerns.length === 0) return null;

  // Sum the reduction points from each concern, then convert to a
  // contribution (negative because concerns reduce evidence quality).
  const totalReduction = inputs.source_concerns.reduce(
    (acc, c) => acc + c.evidence_quality_reduction_points,
    0,
  );
  if (totalReduction === 0) return null;

  const rawContribution = -totalReduction;

  // Build a concise human-readable summary of the concerns.
  const affectedInputs = Array.from(
    new Set(inputs.source_concerns.map((c) => c.affected_input)),
  );
  const concernsSummary =
    affectedInputs.length <= 3
      ? affectedInputs.join(", ")
      : `${affectedInputs.slice(0, 3).join(", ")}, +${affectedInputs.length - 3} more`;

  return buildComponent({
    component_id: buildComponentId("evidence_quality", "source_concerns_aggregate"),
    axis: "evidence_quality",
    name: "Source concerns aggregate",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${inputs.source_concerns.length} source concern${inputs.source_concerns.length === 1 ? "" : "s"} ` +
      `affecting: ${concernsSummary}. ` +
      `Aggregated reduction points: ${totalReduction} (each source concern carries its own ` +
      `evidence_quality_reduction_points from the originating rule). ` +
      `Each concern represents an input where the actual source falls below the rule's expected minimum.`,
    reference_population: "global_benchmark",
    existential_component: false,
    sources: inputs.source_concerns.map((c) => sourceFromSourceConcern(c)),
    depends_on_assumptions: [],
  });
}

/**
 * Fallback fingerprint methodology drag — small negative when the
 * fingerprint resolution returned a fallback, because the engine's
 * methodology itself is weakened: there's no industry-specific evidence
 * grounding the operating-model classification.
 *
 * This is small (-3 to -5) because evidence quality is primarily about
 * deal-level source, not about methodology. The bigger methodology
 * impact appears in underwriting_uncertainty (model_uncertainty sub-axis).
 *
 * Skipped when not a fallback.
 */
function buildFallbackFingerprintComponent(
  inputs: EvidenceComposerInputs,
): AxisComponent | null {
  if (!inputs.fingerprint_resolution.is_fallback) return null;

  return buildComponent({
    component_id: buildComponentId("evidence_quality", "fallback_methodology_drag"),
    axis: "evidence_quality",
    name: "Fallback fingerprint methodology drag",
    raw_contribution: -4,
    contribution_explanation:
      `Fingerprint resolution returned the fallback model (${inputs.fingerprint_resolution.fallback_reason ?? "industry not in registry"}). ` +
      `The methodology layer of the analysis rests on generic service-model defaults rather than industry-specific evidence. ` +
      `This contributes a small evidence-quality drag; the larger methodology impact appears in underwriting_uncertainty.model_uncertainty.`,
    reference_population: "global_benchmark",
    existential_component: false,
    sources: [
      sourceFromFingerprintSignal({
        fingerprint_key: inputs.fingerprint_resolution.fingerprint.key,
        signal_description: "Fallback fingerprint used (no industry-specific evidence)",
        signal_id: "fingerprint.fallback_used",
      }),
    ],
    depends_on_assumptions: [],
  });
}

/**
 * Verbal-assertion existential component — fires when the deal-level
 * source is "verbal_assertion" AND there's no indication of stronger
 * per-metric sources upgrading the evidence base.
 *
 * This is genuinely existential for evidence quality because the engine
 * has no documentary basis for any conclusion. The component is flagged
 * existential to allow it to exceed the soft cap.
 */
function buildVerbalAssertionExistentialComponent(
  inputs: EvidenceComposerInputs,
): AxisComponent | null {
  if (inputs.deal_source_type !== "verbal_assertion") return null;

  return buildComponent({
    component_id: buildComponentId("evidence_quality", "verbal_assertion_only"),
    axis: "evidence_quality",
    name: "Verbal-assertion evidence (existential)",
    raw_contribution: -30, // existential cap allows -35
    contribution_explanation:
      `The deal's entire evidence base is verbal assertion — no tax returns, no bank statements, ` +
      `no accounting export, not even a seller-prepared spreadsheet. The engine has no documentary ` +
      `basis for any conclusion about this deal. ` +
      `This component is flagged existential because verbal-only evidence cannot support institutional ` +
      `underwriting at any axis. Source upgrade is the only path forward; no diligence work can substitute ` +
      `for the absent documentary base.`,
    reference_population: "global_benchmark",
    existential_component: true,
    sources: [
      sourceFromFingerprintSignal({
        fingerprint_key: inputs.fingerprint_resolution.fingerprint.key,
        signal_description: "Deal-level source: verbal_assertion (no documentary base)",
        signal_id: "deal_source.verbal_assertion",
      }),
    ],
    depends_on_assumptions: [],
  });
}
