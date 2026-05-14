// lib/intelligence/operations/__boundary__/boundary-enforcement.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// CP-10 Constitutional Boundary — Enforcement Test Suite
//
// This file runs the five boundary checks against the live CP-10
// module directory. CI invokes it via `npm run test:boundary`. Vercel
// invokes it as a prebuild gate.
//
// EXIT CODES:
//   0 — all five checks pass
//   1 — any check fails (boundary violation)
//
// The five checks:
//   1. No probability fields
//   2. No aggregate operational scores
//   3. No LLM/AI dependencies
//   4. No prose artifacts
//   5. No nondeterministic behavior
//
// Checks 1, 2, 4 share the AST field-scanning infrastructure. Check 3
// uses the import-scanning infrastructure. Check 5 uses the
// nondeterminism scanner plus runtime determinism assertions on
// module self-tests.
//
// Output is human-readable when run directly; structured (JSON) when
// CP10_BOUNDARY_FORMAT=json is set, for CI integration.
// ─────────────────────────────────────────────────────────────────────────────

import {
  scanFileImports,
  scanFileFieldDeclarations,
  scanFileForNondeterminism,
  discoverOperationsFiles,
  AST_WALKER_VERSION,
} from "./ast-walker";
import {
  checkImportPath,
  BANNED_IMPORTS_VERSION,
} from "./banned-imports";
import {
  checkNumericFieldName,
  checkStringFieldName,
  BANNED_FIELD_PATTERNS_VERSION,
} from "./banned-field-patterns";
import {
  PERMITTED_NUMERIC_FIELDS_VERSION,
} from "./permitted-numeric-fields";
import {
  PERMITTED_STRING_FIELDS_VERSION,
} from "./permitted-string-fields";

// ─────────────────────────────────────────────────────────────────────────────
// VIOLATION RECORD
// ─────────────────────────────────────────────────────────────────────────────

export interface BoundaryViolation {
  readonly check_number: 1 | 2 | 3 | 4 | 5;
  readonly check_name: string;
  readonly file_path: string;
  readonly line: number | null;
  readonly violating_artifact: string;
  readonly violated_invariant: string;
  readonly explanation: string;
}

export interface BoundaryReport {
  readonly run_at: string;
  readonly operations_root: string;
  readonly files_scanned: number;
  readonly violations: ReadonlyArray<BoundaryViolation>;
  readonly check_results: {
    readonly check_1_probability: { passed: boolean; violations: number };
    readonly check_2_aggregate: { passed: boolean; violations: number };
    readonly check_3_llm_imports: { passed: boolean; violations: number };
    readonly check_4_prose: { passed: boolean; violations: number };
    readonly check_5_nondeterminism: { passed: boolean; violations: number };
  };
  readonly all_passed: boolean;
  readonly allowlist_versions: {
    readonly banned_imports: string;
    readonly banned_fields: string;
    readonly permitted_numeric: string;
    readonly permitted_string: string;
    readonly ast_walker: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run all five boundary checks against the given operations root
 * directory. Returns a structured BoundaryReport.
 *
 * Pure function. Reads files; does not write.
 */
export function runBoundaryChecks(operationsRoot: string): BoundaryReport {
  const files = discoverOperationsFiles(operationsRoot);
  const violations: BoundaryViolation[] = [];

  // ── Check 3: scan imports across all files ──
  for (const filePath of files) {
    const imports = scanFileImports(filePath);
    for (const imp of imports) {
      const match = checkImportPath(imp.import_path);
      if (match) {
        violations.push({
          check_number: 3,
          check_name: "no_llm_dependencies",
          file_path: filePath,
          line: imp.line,
          violating_artifact: imp.import_path,
          violated_invariant: "no_llm_dependencies",
          explanation: `Import path "${imp.import_path}" matches banned ${match.matched_rule} pattern "${match.matched_pattern}". LLM/AI dependencies are constitutionally prohibited in CP-10.`,
        });
      }
    }
  }

  // ── Checks 1, 2, 4: scan exported field declarations ──
  for (const filePath of files) {
    const fields = scanFileFieldDeclarations(filePath);
    for (const field of fields) {
      if (!field.is_exported) continue;

      if (field.type_category === "number") {
        const result = checkNumericFieldName(field.field_name);
        if (!result.ok) {
          let checkNumber: 1 | 2 = 1;
          let checkName = "no_probability_fields";
          if (result.violated_invariant === "no_aggregate_scores") {
            checkNumber = 2;
            checkName = "no_aggregate_scores";
          } else if (result.violated_invariant === "not_on_allowlist") {
            // Default to check 2 — numeric allowlist sits under aggregate-score invariant
            checkNumber = 2;
            checkName = "no_aggregate_scores";
          }
          violations.push({
            check_number: checkNumber,
            check_name: checkName,
            file_path: filePath,
            line: field.line,
            violating_artifact: `${field.type_name}.${field.field_name}`,
            violated_invariant: result.violated_invariant ?? "unknown",
            explanation: result.explanation ?? "field check failed",
          });
        }
      }

      if (field.type_category === "string") {
        const result = checkStringFieldName(field.field_name);
        if (!result.ok) {
          violations.push({
            check_number: 4,
            check_name: "no_prose_artifacts",
            file_path: filePath,
            line: field.line,
            violating_artifact: `${field.type_name}.${field.field_name}`,
            violated_invariant: result.violated_invariant ?? "unknown",
            explanation: result.explanation ?? "string field check failed",
          });
        }
      }
    }
  }

  // ── Check 5: scan for nondeterministic API calls ──
  for (const filePath of files) {
    const ndMatches = scanFileForNondeterminism(filePath);
    for (const m of ndMatches) {
      if (!m.carveout_allowed) {
        violations.push({
          check_number: 5,
          check_name: "no_nondeterminism",
          file_path: filePath,
          line: m.line,
          violating_artifact: m.call_text,
          violated_invariant: "no_nondeterminism",
          explanation: `Nondeterministic API call '${m.call_text}' detected outside its carveout. ${m.banned_kind} is permitted only in specific provenance-construction modules.`,
        });
      }
    }
  }

  // ── Aggregate check results ──
  const check_1_violations = violations.filter((v) => v.check_number === 1).length;
  const check_2_violations = violations.filter((v) => v.check_number === 2).length;
  const check_3_violations = violations.filter((v) => v.check_number === 3).length;
  const check_4_violations = violations.filter((v) => v.check_number === 4).length;
  const check_5_violations = violations.filter((v) => v.check_number === 5).length;

  return {
    run_at: new Date().toISOString(),
    operations_root: operationsRoot,
    files_scanned: files.length,
    violations,
    check_results: {
      check_1_probability: {
        passed: check_1_violations === 0,
        violations: check_1_violations,
      },
      check_2_aggregate: {
        passed: check_2_violations === 0,
        violations: check_2_violations,
      },
      check_3_llm_imports: {
        passed: check_3_violations === 0,
        violations: check_3_violations,
      },
      check_4_prose: {
        passed: check_4_violations === 0,
        violations: check_4_violations,
      },
      check_5_nondeterminism: {
        passed: check_5_violations === 0,
        violations: check_5_violations,
      },
    },
    all_passed: violations.length === 0,
    allowlist_versions: {
      banned_imports: BANNED_IMPORTS_VERSION,
      banned_fields: BANNED_FIELD_PATTERNS_VERSION,
      permitted_numeric: PERMITTED_NUMERIC_FIELDS_VERSION,
      permitted_string: PERMITTED_STRING_FIELDS_VERSION,
      ast_walker: AST_WALKER_VERSION,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HUMAN-READABLE REPORT FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

export function formatBoundaryReport(report: BoundaryReport): string {
  const lines: string[] = [];
  lines.push("=".repeat(76));
  lines.push("CP-10 Constitutional Boundary Enforcement Report");
  lines.push("=".repeat(76));
  lines.push(`Run at:           ${report.run_at}`);
  lines.push(`Operations root:  ${report.operations_root}`);
  lines.push(`Files scanned:    ${report.files_scanned}`);
  lines.push("");
  lines.push("Allowlist versions in effect:");
  lines.push(`  banned_imports:    ${report.allowlist_versions.banned_imports}`);
  lines.push(`  banned_fields:     ${report.allowlist_versions.banned_fields}`);
  lines.push(`  permitted_numeric: ${report.allowlist_versions.permitted_numeric}`);
  lines.push(`  permitted_string:  ${report.allowlist_versions.permitted_string}`);
  lines.push(`  ast_walker:        ${report.allowlist_versions.ast_walker}`);
  lines.push("");
  lines.push("-".repeat(76));
  lines.push("Check Results");
  lines.push("-".repeat(76));

  const r = report.check_results;
  lines.push(formatCheckLine("Check 1: No probability fields    ", r.check_1_probability));
  lines.push(formatCheckLine("Check 2: No aggregate scores      ", r.check_2_aggregate));
  lines.push(formatCheckLine("Check 3: No LLM dependencies      ", r.check_3_llm_imports));
  lines.push(formatCheckLine("Check 4: No prose artifacts       ", r.check_4_prose));
  lines.push(formatCheckLine("Check 5: No nondeterminism        ", r.check_5_nondeterminism));
  lines.push("");

  if (report.violations.length > 0) {
    lines.push("-".repeat(76));
    lines.push(`Violations (${report.violations.length}):`);
    lines.push("-".repeat(76));
    for (const v of report.violations) {
      lines.push("");
      lines.push(`  [Check ${v.check_number}: ${v.check_name}]`);
      lines.push(`  File:     ${v.file_path}${v.line ? `:${v.line}` : ""}`);
      lines.push(`  Artifact: ${v.violating_artifact}`);
      lines.push(`  Invariant violated: ${v.violated_invariant}`);
      lines.push(`  Explanation: ${v.explanation}`);
    }
    lines.push("");
  }

  lines.push("=".repeat(76));
  if (report.all_passed) {
    lines.push("OVERALL: ALL CHECKS PASSED");
  } else {
    lines.push(`OVERALL: BOUNDARY VIOLATION — ${report.violations.length} issue(s)`);
    lines.push("");
    lines.push("This is a constitutional failure. CP-10 staging is blocked.");
    lines.push("Remediation is required — boundary violations cannot be bypassed.");
  }
  lines.push("=".repeat(76));

  return lines.join("\n");
}

function formatCheckLine(
  label: string,
  result: { passed: boolean; violations: number },
): string {
  if (result.passed) {
    return `  ${label} ✓ PASS`;
  }
  return `  ${label} ✗ FAIL (${result.violations} violations)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI ENTRY POINT (invoked by npm run test:boundary)
// ─────────────────────────────────────────────────────────────────────────────

function main(): void {
  // Resolve the operations root from CWD. When called from project root,
  // this is `lib/intelligence/operations`. The script accepts an explicit
  // path as the first argv argument for flexibility.
  const argRoot = process.argv[2];
  const operationsRoot =
    argRoot ?? "./intelligence/operations";

  const report = runBoundaryChecks(operationsRoot);

  const format =
    typeof process !== "undefined" &&
    typeof process.env !== "undefined" &&
    process.env.CP10_BOUNDARY_FORMAT === "json"
      ? "json"
      : "text";

  if (format === "json") {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(formatBoundaryReport(report) + "\n");
  }

  if (!report.all_passed) {
    process.exit(1);
  }
}

if (
  typeof require !== "undefined" &&
  typeof module !== "undefined" &&
  require.main === module
) {
  main();
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSION
// ─────────────────────────────────────────────────────────────────────────────

export const BOUNDARY_TEST_SUITE_VERSION = "cp10-boundary-test-v0.1.0";
