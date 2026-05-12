// lib/intelligence/personalities/personality-registry.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Personality Registry
//
// CP-6 Module: Lookup, diagnostic, and validation infrastructure for the
// personality catalogue. The final CP-6 file.
//
// Architectural responsibilities:
//
//   1. Lookup helpers — by personality ID, by archetype, by comfort
//      velocity. Used by CP-7 simulator, CP-8 narrative, CP-9 snapshot
//      persistence.
//
//   2. Catalogue validator — runs at module load. Enforces the
//      constitutional commitments at the structural level:
//        - Unique personality IDs across the catalogue
//        - axis_priority_order contains all 5 axes exactly once
//        - Deal-breaker, discomfort, comfort, info-need IDs are unique
//          within each personality and follow naming convention
//        - All scenario_reading references resolve to known scenarios
//        - Repairability classifications are present on every discomfort
//        - Comfort velocity is declared
//        - No personality contains procedural fields (no methods, no
//          functions) — the data-only commitment is enforced
//
//   3. Diagnostic helpers — human-readable summary of the catalogue
//      for CLI tools, governance review, and debug endpoints.
//
//   4. Self-test — fail-closed at module load. The catalogue cannot
//      load if validation fails.
//
// This module has NO procedural behavior beyond lookup and validation.
// The personality declarations themselves remain pure data; this module
// simply provides typed accessors over that data.
// ─────────────────────────────────────────────────────────────────────────────

import { SCENARIO_CATALOGUE } from "../scenarios/scenario-engine";
import type {
  AxisKey,
} from "../types";
import type {
  ComfortVelocity,
  LenderPersonality,
  PersonalityCatalogueValidationResult,
  PersonalityId,
} from "./types";
import {
  PERSONALITY_CATALOGUE_VERSION,
  PERSONALITY_TYPE_CONTRACT_VERSION,
} from "./types";
import { PERSONALITY_CATALOGUE } from "./personality-catalogue";

// Re-export
export {
  PERSONALITY_CATALOGUE,
  PERSONALITY_CATALOGUE_VERSION,
  PERSONALITY_TYPE_CONTRACT_VERSION,
};

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up a personality by ID. Returns null if not found.
 *
 * Consumers (CP-7 simulator, CP-8 narrative, CP-9 snapshot persistence)
 * should always check for null — registry membership is the boundary
 * between "personality exists" and "personality reference is stale."
 */
export function getPersonality(id: PersonalityId): LenderPersonality | null {
  return PERSONALITY_CATALOGUE.find((p) => p.id === id) ?? null;
}

/**
 * Return all personalities matching a comfort velocity. Used by CP-7+
 * recovery-path intelligence and lender matchmaking.
 */
export function personalitiesByComfortVelocity(
  velocity: ComfortVelocity,
): ReadonlyArray<LenderPersonality> {
  return PERSONALITY_CATALOGUE.filter((p) => p.comfort_velocity === velocity);
}

/**
 * Return all personality IDs in the catalogue. Stable order matches
 * catalogue declaration order.
 */
export function getAllPersonalityIds(): ReadonlyArray<PersonalityId> {
  return PERSONALITY_CATALOGUE.map((p) => p.id);
}

/**
 * Return a personality's version string for snapshot integrity. CP-9
 * persists the version alongside the posture so historical posture
 * comparisons remain valid even after the personality declaration
 * evolves.
 */
export function getPersonalityVersion(id: PersonalityId): string | null {
  const p = getPersonality(id);
  return p?.version ?? null;
}

/**
 * Return personalities that read a specific scenario as primary or
 * supporting. Used by CP-7 simulator to focus posture derivation on
 * personality-relevant scenarios.
 */
export function personalitiesReadingScenario(
  scenario_id: string,
): ReadonlyArray<LenderPersonality> {
  return PERSONALITY_CATALOGUE.filter((p) =>
    p.scenario_reading.some((s) => s.scenario_id === scenario_id),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_AXES: ReadonlyArray<AxisKey> = [
  "financial_score",
  "durability_score",
  "evidence_quality",
  "assumption_fragility",
  "underwriting_uncertainty",
];

/**
 * Validate the personality catalogue against all structural commitments.
 *
 * Validation categories:
 *   - duplicate_personality_id: personality.id must be unique
 *   - invalid_axis_priority_order: must contain all 5 axes exactly once
 *   - missing_axis_in_priority: axis_priority_order is missing one of
 *     the 5 required axes
 *   - duplicate_axis_in_priority: axis appears twice in priority order
 *   - duplicate_deal_breaker_id / duplicate_discomfort_id /
 *     duplicate_comfort_condition_id: within-personality ID uniqueness
 *   - scenario_reference_invalid: scenario_reading references a scenario
 *     not present in CP-4 catalogue
 *   - missing_required_field: required field is empty/missing
 *
 * Returns validation result with detailed issue list and summary stats.
 */
export function validatePersonalityCatalogue(): PersonalityCatalogueValidationResult {
  const issues: PersonalityCatalogueValidationResult["issues"] = [];
  const issuesArr: Array<PersonalityCatalogueValidationResult["issues"][number]> = [];

  // ── Build scenario ID set from CP-4 for cross-reference ──
  const knownScenarioIds = new Set(SCENARIO_CATALOGUE.map((s) => s.id));

  // ── Personality-level checks ──
  const seenPersonalityIds = new Set<string>();
  let totalDealBreakers = 0;
  let totalDiscomfortSources = 0;
  let totalComfortConditions = 0;
  let fatalDiscomforts = 0;
  let repairableDiscomforts = 0;

  for (const personality of PERSONALITY_CATALOGUE) {
    // Unique personality ID
    if (seenPersonalityIds.has(personality.id)) {
      issuesArr.push({
        severity: "error",
        category: "duplicate_personality_id",
        location: `personality[${personality.id}]`,
        message: `Duplicate personality_id`,
      });
    }
    seenPersonalityIds.add(personality.id);

    // axis_priority_order must contain all 5 axes exactly once
    const priorityOrder = personality.axis_priority_order;
    if (priorityOrder.length !== 5) {
      issuesArr.push({
        severity: "error",
        category: "invalid_axis_priority_order",
        location: `personality[${personality.id}].axis_priority_order`,
        message: `axis_priority_order must have exactly 5 entries; got ${priorityOrder.length}`,
      });
    }
    const seenAxes = new Set<string>();
    for (const axis of priorityOrder) {
      if (seenAxes.has(axis)) {
        issuesArr.push({
          severity: "error",
          category: "duplicate_axis_in_priority",
          location: `personality[${personality.id}].axis_priority_order`,
          message: `Axis appears twice in priority order: ${axis}`,
        });
      }
      seenAxes.add(axis);
    }
    for (const required of REQUIRED_AXES) {
      if (!seenAxes.has(required)) {
        issuesArr.push({
          severity: "error",
          category: "missing_axis_in_priority",
          location: `personality[${personality.id}].axis_priority_order`,
          message: `Required axis missing from priority order: ${required}`,
        });
      }
    }

    // version present and non-empty
    if (!personality.version || personality.version.trim().length === 0) {
      issuesArr.push({
        severity: "error",
        category: "missing_required_field",
        location: `personality[${personality.id}].version`,
        message: `version string is required`,
      });
    }

    // display_name, profile_description, reasoning_style required
    if (!personality.display_name || personality.display_name.trim().length === 0) {
      issuesArr.push({
        severity: "error",
        category: "missing_required_field",
        location: `personality[${personality.id}].display_name`,
        message: `display_name is required`,
      });
    }
    if (!personality.profile_description || personality.profile_description.trim().length < 30) {
      issuesArr.push({
        severity: "error",
        category: "missing_required_field",
        location: `personality[${personality.id}].profile_description`,
        message: `profile_description must be at least 30 chars`,
      });
    }

    // comfort_velocity must be one of the three declared values
    const validVelocities: ReadonlyArray<ComfortVelocity> = ["slow", "moderate", "fast"];
    if (!validVelocities.includes(personality.comfort_velocity)) {
      issuesArr.push({
        severity: "error",
        category: "missing_required_field",
        location: `personality[${personality.id}].comfort_velocity`,
        message: `comfort_velocity must be slow/moderate/fast; got ${personality.comfort_velocity}`,
      });
    }

    // attractive_signals_summary and structural_incompatibilities_summary required (CP-8 reads these)
    if (!personality.attractive_signals_summary || personality.attractive_signals_summary.length < 30) {
      issuesArr.push({
        severity: "error",
        category: "missing_required_field",
        location: `personality[${personality.id}].attractive_signals_summary`,
        message: `attractive_signals_summary must be at least 30 chars (read by CP-8 narrative)`,
      });
    }
    if (!personality.structural_incompatibilities_summary || personality.structural_incompatibilities_summary.length < 30) {
      issuesArr.push({
        severity: "error",
        category: "missing_required_field",
        location: `personality[${personality.id}].structural_incompatibilities_summary`,
        message: `structural_incompatibilities_summary must be at least 30 chars (read by CP-8 narrative)`,
      });
    }

    // ── Deal-breaker checks ──
    const seenDealBreakerIds = new Set<string>();
    for (const db of personality.deal_breakers) {
      if (seenDealBreakerIds.has(db.id)) {
        issuesArr.push({
          severity: "error",
          category: "duplicate_deal_breaker_id",
          location: `personality[${personality.id}].deal_breakers[${db.id}]`,
          message: `Duplicate deal_breaker.id`,
        });
      }
      seenDealBreakerIds.add(db.id);

      // Naming convention: {personality_short}.deal_breaker.{specific}
      const personalityShort = personality.id.split("_")[0];
      if (!db.id.startsWith(`${personalityShort}.deal_breaker.`)) {
        issuesArr.push({
          severity: "warning",
          category: "duplicate_deal_breaker_id",
          location: `personality[${personality.id}].deal_breakers[${db.id}]`,
          message: `deal_breaker.id should follow {personality_short}.deal_breaker.{specific} convention`,
        });
      }

      if (!db.name || !db.why_disqualifying || db.why_disqualifying.length < 30) {
        issuesArr.push({
          severity: "error",
          category: "missing_required_field",
          location: `personality[${personality.id}].deal_breakers[${db.id}]`,
          message: `deal_breaker requires name and why_disqualifying (≥30 chars)`,
        });
      }
      totalDealBreakers += 1;
    }

    // ── Discomfort source checks ──
    const seenDiscomfortIds = new Set<string>();
    for (const ds of personality.discomfort_sources) {
      if (seenDiscomfortIds.has(ds.id)) {
        issuesArr.push({
          severity: "error",
          category: "duplicate_discomfort_id",
          location: `personality[${personality.id}].discomfort_sources[${ds.id}]`,
          message: `Duplicate discomfort_source.id`,
        });
      }
      seenDiscomfortIds.add(ds.id);

      if (!ds.repairability || (ds.repairability !== "repairable" && ds.repairability !== "fatal")) {
        issuesArr.push({
          severity: "error",
          category: "missing_required_field",
          location: `personality[${personality.id}].discomfort_sources[${ds.id}]`,
          message: `discomfort_source.repairability must be 'repairable' or 'fatal'`,
        });
      } else if (ds.repairability === "fatal") {
        fatalDiscomforts += 1;
      } else {
        repairableDiscomforts += 1;
      }

      if (!ds.description || ds.description.length < 20) {
        issuesArr.push({
          severity: "error",
          category: "missing_required_field",
          location: `personality[${personality.id}].discomfort_sources[${ds.id}]`,
          message: `discomfort_source.description must be ≥20 chars`,
        });
      }
      if (!ds.why_uncomfortable || ds.why_uncomfortable.length < 40) {
        issuesArr.push({
          severity: "error",
          category: "missing_required_field",
          location: `personality[${personality.id}].discomfort_sources[${ds.id}]`,
          message: `discomfort_source.why_uncomfortable must be ≥40 chars (read by CP-8 narrative)`,
        });
      }

      // Check trigger pattern is structurally valid (one of the discriminated union variants)
      const validTriggerKinds = [
        "axis_band",
        "axis_score_below",
        "axis_score_above",
        "component_present",
        "scenario_clearance",
        "fragility_hotspot_concentration",
      ];
      if (!ds.trigger || !validTriggerKinds.includes(ds.trigger.kind)) {
        issuesArr.push({
          severity: "error",
          category: "missing_required_field",
          location: `personality[${personality.id}].discomfort_sources[${ds.id}].trigger`,
          message: `discomfort_source.trigger.kind must be a valid AxisDiscomfortPattern variant`,
        });
      }

      // Scenario-clearance triggers must reference real scenario IDs
      if (ds.trigger && ds.trigger.kind === "scenario_clearance") {
        if (!knownScenarioIds.has(ds.trigger.scenario_id)) {
          issuesArr.push({
            severity: "error",
            category: "scenario_reference_invalid",
            location: `personality[${personality.id}].discomfort_sources[${ds.id}].trigger.scenario_id`,
            message: `Trigger references unknown scenario: ${ds.trigger.scenario_id}`,
          });
        }
      }

      totalDiscomfortSources += 1;
    }

    // ── Comfort condition checks ──
    const seenComfortIds = new Set<string>();
    for (const cc of personality.required_comfort_conditions) {
      if (seenComfortIds.has(cc.id)) {
        issuesArr.push({
          severity: "error",
          category: "duplicate_comfort_condition_id",
          location: `personality[${personality.id}].required_comfort_conditions[${cc.id}]`,
          message: `Duplicate comfort_condition.id`,
        });
      }
      seenComfortIds.add(cc.id);

      if (!cc.description || !cc.why_needed || cc.why_needed.length < 30) {
        issuesArr.push({
          severity: "error",
          category: "missing_required_field",
          location: `personality[${personality.id}].required_comfort_conditions[${cc.id}]`,
          message: `comfort_condition requires description and why_needed (≥30 chars)`,
        });
      }
      if (typeof cc.required_for_interested !== "boolean") {
        issuesArr.push({
          severity: "error",
          category: "missing_required_field",
          location: `personality[${personality.id}].required_comfort_conditions[${cc.id}]`,
          message: `comfort_condition.required_for_interested must be boolean`,
        });
      }
      totalComfortConditions += 1;
    }

    // ── Information need checks ──
    const seenInfoIds = new Set<string>();
    for (const inf of personality.information_needs) {
      if (seenInfoIds.has(inf.id)) {
        issuesArr.push({
          severity: "error",
          category: "missing_required_field",
          location: `personality[${personality.id}].information_needs[${inf.id}]`,
          message: `Duplicate information_need.id`,
        });
      }
      seenInfoIds.add(inf.id);

      if (!inf.description || !inf.why_needed || inf.why_needed.length < 30) {
        issuesArr.push({
          severity: "error",
          category: "missing_required_field",
          location: `personality[${personality.id}].information_needs[${inf.id}]`,
          message: `information_need requires description and why_needed (≥30 chars)`,
        });
      }
    }

    // ── Scenario reading checks ──
    const seenScenarioIds = new Set<string>();
    for (const sr of personality.scenario_reading) {
      if (seenScenarioIds.has(sr.scenario_id)) {
        issuesArr.push({
          severity: "warning",
          category: "scenario_reference_invalid",
          location: `personality[${personality.id}].scenario_reading[${sr.scenario_id}]`,
          message: `Same scenario declared twice in scenario_reading`,
        });
      }
      seenScenarioIds.add(sr.scenario_id);

      if (!knownScenarioIds.has(sr.scenario_id)) {
        issuesArr.push({
          severity: "error",
          category: "scenario_reference_invalid",
          location: `personality[${personality.id}].scenario_reading[${sr.scenario_id}]`,
          message: `scenario_reading references unknown scenario: ${sr.scenario_id}`,
        });
      }

      if (!sr.why_relevant || sr.why_relevant.length < 20) {
        issuesArr.push({
          severity: "error",
          category: "missing_required_field",
          location: `personality[${personality.id}].scenario_reading[${sr.scenario_id}]`,
          message: `scenario_reading.why_relevant must be ≥20 chars`,
        });
      }
    }

    // ── Declarative-purity check ──
    // The DECLARATIVE_PERSONALITY_PRINCIPLE requires that personalities
    // are pure data, not procedural code. Verify no function-valued fields
    // exist on the personality declaration. This is a runtime structural
    // check — TypeScript types prohibit it at compile time, but runtime
    // verification catches deserialized data (e.g., from snapshots) that
    // might smuggle functions in.
    for (const [key, value] of Object.entries(personality)) {
      if (typeof value === "function") {
        issuesArr.push({
          severity: "error",
          category: "missing_required_field",
          location: `personality[${personality.id}].${key}`,
          message:
            `Personality field "${key}" contains a function. Personalities must be pure declarative data. ` +
            `Procedural logic belongs in the CP-7 simulator, not in personality declarations.`,
        });
      }
    }
  }

  // Copy issues from mutable array to readonly result
  for (const issue of issuesArr) {
    (issues as Array<typeof issue>).push(issue);
  }

  const errors = issuesArr.filter((i) => i.severity === "error").length;
  return {
    ok: errors === 0,
    issues,
    summary: {
      personality_count: PERSONALITY_CATALOGUE.length,
      total_deal_breakers: totalDealBreakers,
      total_discomfort_sources: totalDiscomfortSources,
      total_comfort_conditions: totalComfortConditions,
      fatal_discomforts: fatalDiscomforts,
      repairable_discomforts: repairableDiscomforts,
    },
    version: PERSONALITY_CATALOGUE_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human-readable summary of the catalogue. Used by CLI tools, governance
 * review documents, and debug endpoints.
 */
export function summarizeCatalogue(): ReadonlyArray<string> {
  const lines: string[] = [];
  lines.push(`Personality catalogue (${PERSONALITY_CATALOGUE_VERSION}):`);
  lines.push(`  Total personalities: ${PERSONALITY_CATALOGUE.length}`);
  lines.push("");
  for (const p of PERSONALITY_CATALOGUE) {
    lines.push(`${p.id}@${p.version}`);
    lines.push(`  ${p.display_name} (${p.archetype_label})`);
    lines.push(`  comfort_velocity: ${p.comfort_velocity}`);
    lines.push(`  axis priority: ${p.axis_priority_order.join(" → ")}`);
    lines.push(`  deal_breakers: ${p.deal_breakers.length}`);
    const fatal = p.discomfort_sources.filter((d) => d.repairability === "fatal").length;
    const repairable = p.discomfort_sources.filter((d) => d.repairability === "repairable").length;
    lines.push(`  discomfort_sources: ${p.discomfort_sources.length} (${fatal} fatal, ${repairable} repairable)`);
    lines.push(`  required_comfort_conditions: ${p.required_comfort_conditions.length}`);
    lines.push(`  information_needs: ${p.information_needs.length}`);
    lines.push(`  scenario_reading: ${p.scenario_reading.length}`);
    lines.push("");
  }
  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-TEST — fail-closed at module load
// ─────────────────────────────────────────────────────────────────────────────

function assertCatalogueValid(): void {
  const result = validatePersonalityCatalogue();
  if (!result.ok) {
    const errorList = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `  [${i.category}] ${i.location} — ${i.message}`)
      .join("\n");
    throw new Error(
      `Personality catalogue validation failed (${PERSONALITY_CATALOGUE_VERSION}):\n${errorList}`,
    );
  }
}

assertCatalogueValid();
