// lib/acquiflow/tax-structure-section.derive.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Stage 3 — deriveReadinessSignal unit tests.
//
// Run with: npx tsx lib/acquiflow/tax-structure-section.derive.test.ts
//
// Targets the pure derivation helper exported from tax-structure-section.ts.
// Tests every branch of the v1 ruleset:
//   - unspecified structure
//   - asset (clean, §1245 only, §1250 only, both)
//   - stock_with_338_h_10
//   - stock_with_336_e
//   - stock (no election)
//   - unknown structure (fallthrough)
//
// Does NOT exercise the engine; deriveReadinessSignal is a pure function of
// (dealStructure, statements). Engine-integrated end-to-end behavior is
// verified at Smoke Test S3 against a real deal in production.
// ─────────────────────────────────────────────────────────────────────────────

import { deriveReadinessSignal } from "./tax-structure-section";
import type { TaxStructureStatement } from "./tax-structure-section";

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

function A(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }

// Statement fixtures using the production headings (must match the
// STATEMENT_HEADINGS map in the builder for the recapture heuristic to fire).
const stmt = (heading: string): TaxStructureStatement => ({
  heading,
  body: `synthetic statement body for ${heading}`,
  seam: "assumption",
});

// ── Cases ───────────────────────────────────────────────────────────────────
console.log("── Stage 3: deriveReadinessSignal ──");

T("unspecified structure → unavailable + 'not yet selected' reason", () => {
  const s = deriveReadinessSignal("unspecified", []);
  AE(s.state, "unavailable", "state");
  AE(s.reason, "Transaction structure has not yet been selected, limiting tax impact analysis.", "reason");
});

T("asset, no recapture statements → favorable + step-up reason", () => {
  const s = deriveReadinessSignal("asset", []);
  AE(s.state, "favorable", "state");
  A(s.reason.includes("Asset purchase structure provides basis step-up benefits"), "reason mentions step-up benefits");
  A(s.reason.includes("under current assumptions"), "reason carries the 'under current assumptions' softening");
  A(s.reason.includes("no material recapture concerns have been identified"), "reason notes no recapture concerns");
});

T("asset + §1245 recapture statement → open + 1245-specific reason", () => {
  const s = deriveReadinessSignal("asset", [stmt("\u00A71245 recapture character")]);
  AE(s.state, "open", "state");
  A(s.reason.includes("\u00A71245"), "reason references §1245");
  A(!s.reason.includes("\u00A71250"), "reason should NOT reference §1250 when only 1245 is flagged");
  A(s.reason.includes("recapture exposure remains unresolved"), "reason notes unresolved exposure");
  A(s.reason.includes("under current assumptions"), "softening preserved");
});

T("asset + §1250 recapture statement → open + 1250-specific reason", () => {
  const s = deriveReadinessSignal("asset", [stmt("\u00A71250 recapture character")]);
  AE(s.state, "open", "state");
  A(s.reason.includes("\u00A71250"), "reason references §1250");
  A(!s.reason.includes("\u00A71245"), "reason should NOT reference §1245 when only 1250 is flagged");
});

T("asset + both §1245 and §1250 → open + combined reason", () => {
  const s = deriveReadinessSignal("asset", [
    stmt("\u00A71245 recapture character"),
    stmt("\u00A71250 recapture character"),
  ]);
  AE(s.state, "open", "state");
  A(s.reason.includes("\u00A71245 and \u00A71250"), "reason combines both refs with 'and'");
});

T("asset, statements present but no recapture → still favorable", () => {
  // Other engine statements (basis step-up, structural difference) emitting
  // should NOT trigger the recapture branch. Only character_1245/1250 do.
  const s = deriveReadinessSignal("asset", [
    stmt("Basis step-up"),
    stmt("Structural treatment"),
    stmt("\u00A7197 intangible amortization"),
  ]);
  AE(s.state, "favorable", "state should remain favorable when no recapture flagged");
});

T("stock_with_338_h_10 → favorable + §338(h)(10)-specific reason", () => {
  const s = deriveReadinessSignal("stock_with_338_h_10", []);
  AE(s.state, "favorable", "state");
  A(s.reason.includes("\u00A7338(h)(10) election"), "reason references §338(h)(10) election");
  A(s.reason.includes("basis step-up benefit"), "reason notes step-up benefit");
  A(s.reason.includes("under current assumptions"), "softening preserved");
});

T("stock_with_336_e → favorable + §336(e)-specific reason", () => {
  const s = deriveReadinessSignal("stock_with_336_e", []);
  AE(s.state, "favorable", "state");
  A(s.reason.includes("\u00A7336(e) election"), "reason references §336(e) election");
  A(s.reason.includes("basis step-up benefit"), "reason notes step-up benefit");
});

T("stock without election → open + historic-basis reason (advisor tone)", () => {
  const s = deriveReadinessSignal("stock", []);
  AE(s.state, "open", "state");
  A(s.reason.startsWith("Stock acquisition without a basis-step-up election"), "reason opens with stock-no-election framing");
  A(s.reason.includes("generally preserves historic tax basis"), "softer 'generally' framing preserved");
  A(s.reason.includes("limiting future depreciation and amortization benefits"), "reason notes depreciation/amortization limit");
});

T("unrecognized structure code → open + generic diligence reason (no throw)", () => {
  // Future-proofing: when the engine adds F reorg or rollover before the
  // builder, the section should still render with a generic signal rather
  // than crash. The fallthrough makes Intel resilient to engine drift.
  const s = deriveReadinessSignal("internal_rollover", []);
  AE(s.state, "open", "state");
  A(s.reason.includes("open questions requiring diligence review"), "generic diligence reason");
});

T("empty string structure code → open + generic (defensive)", () => {
  const s = deriveReadinessSignal("", []);
  AE(s.state, "open", "fallthrough");
});

T("tone discipline: NO signal reason contains verdict language", () => {
  // The reason strings must NOT read as conclusions. Forbidden vocabulary:
  // "must", "should not", "do not proceed", "reject", "unacceptable",
  // "killer", "fatal". Reasons describe evidence state, not action.
  const forbidden = ["must ", "should not", "do not proceed", "reject", "unacceptable", "killer", "fatal", "kill the deal"];
  const cases: Array<[string, TaxStructureStatement[]]> = [
    ["unspecified", []],
    ["asset", []],
    ["asset", [stmt("\u00A71245 recapture character")]],
    ["stock", []],
    ["stock_with_338_h_10", []],
    ["stock_with_336_e", []],
    ["internal_rollover", []],
  ];
  for (const [dealStruct, statements] of cases) {
    const s = deriveReadinessSignal(dealStruct, statements);
    for (const f of forbidden) {
      A(!s.reason.toLowerCase().includes(f), `case ${dealStruct}: reason must not contain "${f}"`);
    }
  }
});

T("tone discipline: every reason includes 'under current assumptions' OR equivalent softener", () => {
  // The reason should ALWAYS carry framing that signals AcquiFlow has not
  // performed diligence. Either explicit "under current assumptions" or
  // soft framing like "generally", "have been identified", "may", etc.
  const softeners = ["under current assumptions", "generally", "have been identified", "remains unresolved", "limiting", "limit", "requiring diligence"];
  const cases: Array<[string, TaxStructureStatement[]]> = [
    ["asset", []],
    ["asset", [stmt("\u00A71245 recapture character")]],
    ["stock", []],
    ["stock_with_338_h_10", []],
    ["stock_with_336_e", []],
    ["internal_rollover", []],
  ];
  for (const [dealStruct, statements] of cases) {
    const s = deriveReadinessSignal(dealStruct, statements);
    const hasSoftener = softeners.some(soft => s.reason.toLowerCase().includes(soft.toLowerCase()));
    A(hasSoftener, `case ${dealStruct}: reason must include a softener — got "${s.reason}"`);
  }
  // Note: "unspecified" intentionally describes data state, not a structural
  // read, so no softener required for that branch.
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("\n── failed test details ──");
  errors.forEach(e => console.log("  " + e));
  (globalThis as unknown as { process?: { exit?: (n: number) => void } }).process?.exit?.(1);
}
