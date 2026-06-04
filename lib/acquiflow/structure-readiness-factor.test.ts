// lib/acquiflow/structure-readiness-factor.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Stage 3 — deriveStructureReadinessFactor unit tests.
//
// Run with: npx tsx lib/acquiflow/structure-readiness-factor.test.ts
//
// Verifies:
//   1. undefined / null section → factor omitted (returns null)
//   2. section with readiness_signal "unavailable" → factor "pending_input"
//   3. section with readiness_signal "favorable"   → factor "interested"
//   4. section with readiness_signal "open"        → factor "cautious"
//   5. band field passes through structure_label verbatim
//   6. reason field passes through readiness_signal.reason verbatim
//   7. source tag is always "tax_structure"
//   8. axis token is always "tax_structure_readiness"
//   9. degraded path: section without readiness_signal → pending_input with
//      a neutral reason (graceful degradation, not a throw)
//  10. unspecified-structure case (present:true but structure_label "Not yet
//      specified") produces correct pending_input + reason from builder
// ─────────────────────────────────────────────────────────────────────────────

import { deriveStructureReadinessFactor } from "./structure-readiness-factor";
import type { TaxStructureSection } from "./tax-structure-section";

// ── Test harness ────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const errors: string[] = [];

function T(name: string, fn: () => void) {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    const m = e instanceof Error ? e.message : String(e);
    errors.push(`${name}: ${m}`);
    console.log(`  ✗ ${name}\n      ${m}`);
  }
}

function AE<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── Section fixtures ────────────────────────────────────────────────────────
const baseSection: TaxStructureSection = {
  present: true,
  structure_label: "Asset purchase",
  entity_label: "S-Corporation",
  statements: [],
  schedules: [],
  absent_notes: [],
  provenance: "test",
  // Default — overridden in cases that test specific signal states. Required
  // on the type since v1.1 builder; the default keeps the base fixture valid.
  readiness_signal: { state: "favorable", reason: "test default" },
};

// ── Cases ───────────────────────────────────────────────────────────────────
console.log("── Stage 3: deriveStructureReadinessFactor ──");

T("undefined section → factor omitted (returns null)", () => {
  const f = deriveStructureReadinessFactor(undefined);
  AE(f, null, "factor for undefined input");
});

T("null section → factor omitted (returns null)", () => {
  const f = deriveStructureReadinessFactor(null);
  AE(f, null, "factor for null input");
});

T("signal 'favorable' → factor state 'interested'", () => {
  const f = deriveStructureReadinessFactor({
    ...baseSection,
    structure_label: "Asset purchase",
    readiness_signal: {
      state: "favorable",
      reason: "Asset purchase structure provides basis step-up benefits under current assumptions and no material recapture concerns have been identified.",
    },
  });
  if (f === null) throw new Error("factor should not be null");
  AE(f.state, "interested", "state");
  AE(f.band, "Asset purchase", "band passes through structure_label");
  AE(f.axis_or_dimension, "tax_structure_readiness", "axis token");
  AE(f.source, "tax_structure", "source tag");
  AE(f.reason.startsWith("Asset purchase structure provides basis step-up"), true, "reason passes through verbatim");
});

T("signal 'open' → factor state 'cautious'", () => {
  const f = deriveStructureReadinessFactor({
    ...baseSection,
    structure_label: "Stock purchase",
    readiness_signal: {
      state: "open",
      reason: "Stock acquisition without a basis-step-up election generally preserves historic tax basis, limiting future depreciation and amortization benefits to the buyer.",
    },
  });
  if (f === null) throw new Error("factor should not be null");
  AE(f.state, "cautious", "state");
  AE(f.band, "Stock purchase", "band");
  AE(f.reason.includes("Stock acquisition without a basis-step-up election"), true, "reason");
});

T("signal 'unavailable' (present:false case) → factor state 'pending_input'", () => {
  const f = deriveStructureReadinessFactor({
    ...baseSection,
    present: false,
    structure_label: "Not yet specified",
    readiness_signal: {
      state: "unavailable",
      reason: "Buyer tax assumptions not yet recorded for this deal.",
    },
  });
  if (f === null) throw new Error("factor should not be null even when present:false");
  AE(f.state, "pending_input", "state");
  AE(f.band, "Not yet specified", "band");
  AE(f.reason, "Buyer tax assumptions not yet recorded for this deal.", "reason");
});

T("signal 'unavailable' (unspecified-structure case) → factor state 'pending_input' with distinct reason", () => {
  // present:true but structure not selected — the new branch from Steve's
  // refinement. Different reason from the "no row" case, same factor state.
  const f = deriveStructureReadinessFactor({
    ...baseSection,
    present: true,
    structure_label: "Not yet specified",
    readiness_signal: {
      state: "unavailable",
      reason: "Transaction structure has not yet been selected, limiting tax impact analysis.",
    },
  });
  if (f === null) throw new Error("factor should not be null");
  AE(f.state, "pending_input", "state");
  AE(f.band, "Not yet specified", "band");
  AE(f.reason, "Transaction structure has not yet been selected, limiting tax impact analysis.", "reason");
});

T("signal 'favorable' (stock + §338(h)(10) election) → 'interested' with election-specific band", () => {
  const f = deriveStructureReadinessFactor({
    ...baseSection,
    structure_label: "Stock purchase + §338(h)(10)",
    readiness_signal: {
      state: "favorable",
      reason: "Stock acquisition with §338(h)(10) election preserves the buyer's basis step-up benefit under current assumptions.",
    },
  });
  if (f === null) throw new Error("factor should not be null");
  AE(f.state, "interested", "state");
  AE(f.band, "Stock purchase + §338(h)(10)", "band carries the election directly from the builder vocab");
});

T("signal 'open' (asset deal with recapture overhang) → 'cautious' with recapture-aware reason", () => {
  const f = deriveStructureReadinessFactor({
    ...baseSection,
    structure_label: "Asset purchase",
    readiness_signal: {
      state: "open",
      reason: "Asset purchase structure provides basis step-up, though §1245 recapture exposure remains unresolved under current assumptions.",
    },
  });
  if (f === null) throw new Error("factor should not be null");
  AE(f.state, "cautious", "asset+recapture should be 'cautious', not 'interested'");
  AE(f.reason.includes("§1245 recapture exposure"), true, "reason surfaces the unresolved exposure");
});

T("degraded path: section without readiness_signal → graceful 'pending_input' (no throw)", () => {
  // Older builder output, malformed data, type-coercion edge cases — module
  // must degrade rather than throw. Constitutional: missing evidence reduces
  // certainty, but never crashes the rendering pipeline.
  //
  // Cast: readiness_signal is required on TaxStructureSection in the v1.1
  // builder; this test deliberately constructs a malformed fixture (no
  // spread of baseSection, since baseSection now carries a valid signal) to
  // verify the factor module's defensive fallback for older builder output.
  // The `as unknown as ...` cast is the explicit signal that we are
  // intentionally violating the contract for this test.
  const degraded = {
    present: true,
    structure_label: "Asset purchase",
    entity_label: "S-Corporation",
    statements: [],
    schedules: [],
    absent_notes: [],
    provenance: "test",
    // readiness_signal intentionally omitted to simulate older builder output
  } as unknown as TaxStructureSection;
  const f = deriveStructureReadinessFactor(degraded);
  if (f === null) throw new Error("factor should not be null on degraded input — should degrade to pending_input");
  AE(f.state, "pending_input", "state degrades to pending_input");
  AE(f.band, "Asset purchase", "band still passes through from structure_label");
  AE(f.reason, "Tax structure data is incomplete for this deal.", "neutral degraded reason");
});

T("source tag is always 'tax_structure' across all states", () => {
  const cases: TaxStructureSection["readiness_signal"][] = [
    { state: "favorable",   reason: "x" },
    { state: "open",        reason: "x" },
    { state: "unavailable", reason: "x" },
  ];
  for (const signal of cases) {
    const f = deriveStructureReadinessFactor({ ...baseSection, readiness_signal: signal });
    if (f === null) throw new Error(`null factor for signal state ${signal?.state}`);
    AE(f.source, "tax_structure", `source tag for ${signal?.state}`);
    AE(f.axis_or_dimension, "tax_structure_readiness", `axis token for ${signal?.state}`);
  }
});

T("factor shape: exactly 5 keys, no extras", () => {
  // Schema discipline: future readers count on a stable shape. If we add a
  // field, this test will fail and force a deliberate update.
  const f = deriveStructureReadinessFactor({
    ...baseSection,
    readiness_signal: { state: "favorable", reason: "x" },
  });
  if (f === null) throw new Error("factor should not be null");
  const keys = Object.keys(f).sort();
  AE(keys.join(","), "axis_or_dimension,band,reason,source,state", "factor keys");
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("\n── failed test details ──");
  errors.forEach(e => console.log("  " + e));
  (globalThis as unknown as { process?: { exit?: (n: number) => void } }).process?.exit?.(1);
}
