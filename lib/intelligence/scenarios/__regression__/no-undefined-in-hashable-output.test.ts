// intelligence/scenarios/__regression__/no-undefined-in-hashable-output.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION GUARD — CP-4 must not emit explicit `undefined` values in any
// hashable artifact.
//
// BUG HISTORY (2026-05-14, found via Phase 0 shadow-mode orchestration):
//   CP-4 scenario-catalogue.ts constructed `adjusted_inputs` with patterns
//   like `dscr: dscrResult.value ?? undefined`. When the scenario could not
//   compute a value (because the live deal inputs omit DSCR / margin / ratio
//   data — the common production case), this produced an object with a
//   key explicitly set to `undefined`:  { dscr: undefined }.
//
//   CP-9's canonical hash function CORRECTLY rejects undefined-valued keys
//   (determinism requires canonical JSON; `{x: undefined}` vs `{}` is
//   ambiguous). buildSnapshot therefore failed with:
//     "CP-9 canonical hash failure ... undefined value at key "dscr".
//      omit the key entirely instead of setting it to undefined"
//
//   FIX: all such sites were rewritten to conditional object spreads:
//     ...(value != null ? { key: value } : {})
//   so absent values omit the key entirely.
//
// THIS GUARD: runs CP-4 across input shapes — especially the absent-DSCR /
// absent-margin case that triggered the bug — and asserts no hashable
// artifact contains an explicit `undefined` value anywhere in its object
// graph. If a future change reintroduces a `?? undefined` (or any
// undefined-valued key) in a scenario output, this test fails.
//
// Run: compile to JS and execute with node, passing no args.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveFingerprint } from "../../industry-fingerprints";
import { evaluateRuleEngine } from "../../rules/rule-engine";
import { evaluateScenarios } from "../scenario-engine";
import type { RuleEngineInputs } from "../../rules/types";

// ─────────────────────────────────────────────────────────────────────────────
// DEEP UNDEFINED SCANNER
//
// Walks an arbitrary object graph and collects the paths of any key whose
// value is exactly `undefined`. Arrays are indexed. This mirrors what the
// CP-9 canonical hash walker objects to.
// ─────────────────────────────────────────────────────────────────────────────

function findUndefinedKeys(value: unknown, path = "$"): string[] {
  const hits: string[] = [];

  if (value === undefined) {
    hits.push(path);
    return hits;
  }
  if (value === null) return hits;
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      hits.push(...findUndefinedKeys(item, `${path}[${i}]`));
    });
    return hits;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Object.entries SKIPS keys whose value is undefined? No — it includes
      // them with value undefined. So this catches { dscr: undefined }.
      if (v === undefined) {
        hits.push(`${path}.${k}`);
      } else {
        hits.push(...findUndefinedKeys(v, `${path}.${k}`));
      }
    }
  }
  return hits;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST INPUT SHAPES
//
// Each shape is designed to exercise scenario code paths. The critical ones
// OMIT dscr / margins / ratios so the scenarios cannot compute adjusted
// values — the exact condition that produced { dscr: undefined } before the
// fix.
// ─────────────────────────────────────────────────────────────────────────────

const TEST_INPUTS: ReadonlyArray<{ label: string; inputs: RuleEngineInputs }> = [
  {
    label: "absent DSCR + margins (the bug trigger)",
    inputs: {
      industry_key: "hvac",
      revenue: 1500000,
      sde: 375000,
      ebitda: 360000,
      purchase_price: 1200000,
      total_debt: 960000,
      // dscr, current_ratio, sde_margin_pct, ebitda_margin_pct OMITTED
    },
  },
  {
    label: "minimal inputs (only core financials)",
    inputs: {
      industry_key: "hvac",
      revenue: 800000,
      sde: 180000,
      purchase_price: 650000,
      total_debt: 520000,
    },
  },
  {
    label: "full inputs (everything present)",
    inputs: {
      industry_key: "hvac",
      revenue: 5000000,
      sde: 850000,
      ebitda: 825000,
      purchase_price: 4000000,
      total_debt: 3200000,
      dscr: 1.45,
      current_ratio: 1.6,
      sde_margin_pct: 17,
      ebitda_margin_pct: 16.5,
      gross_margin_pct: 28,
      operating_margin_pct: 12,
      ar_days: 45,
      top_customer_pct: 18,
      addback_total: 100000,
      addback_concentration_top_line_pct: 40,
      revenue_prior_year: 4500000,
      revenue_prior_prior_year: 4000000,
    },
  },
  {
    label: "high-margin deal (triggers margin-normalization scenario)",
    inputs: {
      industry_key: "hvac",
      revenue: 2000000,
      sde: 700000, // 35% — well above HVAC median, fires normalization
      ebitda: 680000,
      purchase_price: 2100000,
      total_debt: 1680000,
      sde_margin_pct: 35,
      ebitda_margin_pct: 34,
      // dscr OMITTED — normalization will try to recompute and may not get a value
    },
  },
  {
    label: "unknown industry (fallback fingerprint)",
    inputs: {
      industry_key: "underwater_basket_weaving",
      revenue: 500000,
      sde: 100000,
      purchase_price: 400000,
      total_debt: 320000,
    },
  },
];

// Industries to sweep for the absent-DSCR case (broad coverage)
const INDUSTRY_SWEEP = [
  "hvac", "laundromat", "landscaping", "dental", "restaurant",
  "ecommerce", "saas", "plumbing", "roofing", "accounting",
];

// ─────────────────────────────────────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────

function runScenariosFor(inputs: RuleEngineInputs) {
  const fingerprint = resolveFingerprint(inputs.industry_key ?? "");
  const ruleResult = evaluateRuleEngine(inputs, fingerprint);
  return evaluateScenarios(inputs, fingerprint, ruleResult);
}

function main(): void {
  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  // Part 1: explicit test shapes
  for (const { label, inputs } of TEST_INPUTS) {
    const scenarioResult = runScenariosFor(inputs);
    const undefinedPaths = findUndefinedKeys(scenarioResult);
    if (undefinedPaths.length === 0) {
      pass += 1;
      log(`  PASS  ${label}`);
    } else {
      fail += 1;
      failures.push(label);
      log(`  FAIL  ${label}`);
      for (const p of undefinedPaths.slice(0, 8)) log(`          ${p}`);
    }
  }

  // Part 2: industry sweep with the bug-trigger input shape
  for (const industry of INDUSTRY_SWEEP) {
    const inputs: RuleEngineInputs = {
      industry_key: industry,
      revenue: 1500000,
      sde: 375000,
      ebitda: 360000,
      purchase_price: 1200000,
      total_debt: 960000,
      // DSCR / margins / ratios OMITTED — the trigger condition
    };
    const scenarioResult = runScenariosFor(inputs);
    const undefinedPaths = findUndefinedKeys(scenarioResult);
    if (undefinedPaths.length === 0) {
      pass += 1;
      log(`  PASS  sweep:${industry} (absent-DSCR)`);
    } else {
      fail += 1;
      failures.push(`sweep:${industry}`);
      log(`  FAIL  sweep:${industry}`);
      for (const p of undefinedPaths.slice(0, 8)) log(`          ${p}`);
    }
  }

  log("");
  log("============================================================");
  log(`CP-4 NO-UNDEFINED-IN-HASHABLE-OUTPUT: PASS ${pass}  FAIL ${fail}`);
  log("============================================================");

  if (fail > 0) {
    log("");
    log("REGRESSION: CP-4 emitted explicit undefined values in hashable");
    log("output. This breaks CP-9 canonical hashing. Use conditional");
    log("object spreads — ...(v != null ? { k: v } : {}) — instead of");
    log("k: v ?? undefined. Failing shapes: " + failures.join(", "));
    const g = globalThis as { process?: { exit?: (n: number) => void } };
    g.process?.exit?.(1);
  }
}

function log(msg: string): void {
  const g = globalThis as { console?: { log?: (m: string) => void } };
  g.console?.log?.(msg);
}

main();
