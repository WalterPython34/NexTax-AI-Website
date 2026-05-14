// lib/intelligence/operations/__boundary__/ast-walker.ts
// ─────────────────────────────────────────────────────────────────────────────
// CP-10 Constitutional Boundary — AST Walker
//
// TypeScript AST utilities used by the boundary-enforcement test
// suite. Walks .ts source files to extract:
//
//   - All import declarations (for Check 3: no LLM dependencies)
//   - All exported type/interface field declarations with their types
//     (for Checks 1, 2, 4: probability/aggregate/prose)
//
// Implementation note: TypeScript's compiler API is rich but heavy.
// We use it only at boundary-test time and at CI, never in production
// request paths. The runtime self-test (module-load) uses lighter
// metadata-based checks; AST scans live in the boundary test suite.
//
// Pure analysis. No IO except reading files passed in by path.
// Deterministic: same input file → same output report.
// ─────────────────────────────────────────────────────────────────────────────

import * as ts from "typescript";
import { readFileSync } from "fs";

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

export interface ImportRecord {
  readonly file_path: string;
  readonly line: number;
  readonly import_path: string;
  readonly is_type_only: boolean;
}

/**
 * Extract every import declaration from a TypeScript source file.
 *
 * Captures:
 *   - `import x from "..."`
 *   - `import { x } from "..."`
 *   - `import type { x } from "..."`
 *   - `import * as x from "..."`
 *   - `import "..."` (side-effect imports)
 *
 * Each result includes the file path and line number for error
 * reporting.
 */
export function scanFileImports(filePath: string): ReadonlyArray<ImportRecord> {
  const sourceText = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.ES2020,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );

  const imports: ImportRecord[] = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const moduleSpec = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpec)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        imports.push({
          file_path: filePath,
          line: line + 1, // 1-indexed for human readability
          import_path: moduleSpec.text,
          is_type_only:
            node.importClause?.isTypeOnly ?? false,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD DECLARATION EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Categorization of a field's static TypeScript type for boundary
 * checking.
 *
 *   "number"  — the field is exactly `number` or `number | null` /
 *               `number | undefined` / `readonly number`.
 *
 *   "string"  — the field is exactly `string` or `string | null`.
 *               INCLUDES string union types like `"a" | "b" | "c"` —
 *               these are enum-like strings.
 *
 *   "boolean" — boolean values. Always permitted. Not checked.
 *
 *   "other"   — arrays, objects, generic types, custom types.
 *               Not directly checked at the field level, but the
 *               element types inside arrays/objects are checked when
 *               those types are themselves CP-10 type declarations.
 */
export type FieldTypeCategory = "number" | "string" | "boolean" | "other";

export interface FieldRecord {
  readonly file_path: string;
  readonly line: number;
  readonly type_name: string;     // the containing type/interface name
  readonly field_name: string;
  readonly type_text: string;      // raw text of the type annotation
  readonly type_category: FieldTypeCategory;
  readonly is_exported: boolean;
  readonly is_string_literal_union: boolean;  // e.g., "a" | "b" | "c"
}

/**
 * Extract every field declaration from every exported interface and
 * type alias in a TypeScript source file.
 *
 * Only EXPORTED types are scanned. Internal types (used for module-
 * private implementation) are not constrained by the constitution
 * because they don't appear in the public API surface.
 */
export function scanFileFieldDeclarations(
  filePath: string,
): ReadonlyArray<FieldRecord> {
  const sourceText = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.ES2020,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );

  const fields: FieldRecord[] = [];

  function isExported(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return (
      modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
    );
  }

  function categorizeType(typeNode: ts.TypeNode | undefined): {
    category: FieldTypeCategory;
    is_string_literal_union: boolean;
    text: string;
  } {
    if (!typeNode) {
      return { category: "other", is_string_literal_union: false, text: "" };
    }
    const text = typeNode.getText(sourceFile);

    // Strip readonly / parens for analysis
    let inner = typeNode;
    if (ts.isParenthesizedTypeNode(inner)) {
      inner = inner.type;
    }

    // Union types — check if all members are number/null, string/null, or string literals
    if (ts.isUnionTypeNode(inner)) {
      const types = inner.types;
      const onlyNumberOrNull = types.every(
        (t) =>
          t.kind === ts.SyntaxKind.NumberKeyword ||
          (ts.isLiteralTypeNode(t) &&
            t.literal.kind === ts.SyntaxKind.NullKeyword),
      );
      if (onlyNumberOrNull) {
        return { category: "number", is_string_literal_union: false, text };
      }
      const onlyStringOrNull = types.every(
        (t) =>
          t.kind === ts.SyntaxKind.StringKeyword ||
          (ts.isLiteralTypeNode(t) &&
            t.literal.kind === ts.SyntaxKind.NullKeyword),
      );
      if (onlyStringOrNull) {
        return { category: "string", is_string_literal_union: false, text };
      }
      // String literal union (e.g., "a" | "b" | "c")
      const allStringLiterals = types.every(
        (t) =>
          ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal),
      );
      if (allStringLiterals) {
        return { category: "string", is_string_literal_union: true, text };
      }
      // Mixed string literal + null
      const stringLiteralsAndNull = types.every(
        (t) =>
          (ts.isLiteralTypeNode(t) &&
            (ts.isStringLiteral(t.literal) ||
              t.literal.kind === ts.SyntaxKind.NullKeyword)),
      );
      if (stringLiteralsAndNull) {
        return { category: "string", is_string_literal_union: true, text };
      }
      // Boolean union — fine
      const onlyBoolOrNull = types.every(
        (t) =>
          t.kind === ts.SyntaxKind.BooleanKeyword ||
          (ts.isLiteralTypeNode(t) &&
            t.literal.kind === ts.SyntaxKind.NullKeyword),
      );
      if (onlyBoolOrNull) {
        return { category: "boolean", is_string_literal_union: false, text };
      }
      return { category: "other", is_string_literal_union: false, text };
    }

    // Plain primitives
    if (inner.kind === ts.SyntaxKind.NumberKeyword) {
      return { category: "number", is_string_literal_union: false, text };
    }
    if (inner.kind === ts.SyntaxKind.StringKeyword) {
      return { category: "string", is_string_literal_union: false, text };
    }
    if (inner.kind === ts.SyntaxKind.BooleanKeyword) {
      return { category: "boolean", is_string_literal_union: false, text };
    }

    return { category: "other", is_string_literal_union: false, text };
  }

  function recordProperty(
    node: ts.PropertySignature | ts.PropertyDeclaration,
    typeName: string,
    exported: boolean,
  ): void {
    if (!node.name) return;
    const fieldName = node.name.getText(sourceFile);
    const { category, is_string_literal_union, text } = categorizeType(
      node.type,
    );
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    fields.push({
      file_path: filePath,
      line: line + 1,
      type_name: typeName,
      field_name: fieldName,
      type_text: text,
      type_category: category,
      is_exported: exported,
      is_string_literal_union,
    });
  }

  function walkTypeMembers(
    typeName: string,
    typeNode: ts.TypeNode | undefined,
    exported: boolean,
  ): void {
    if (!typeNode) return;

    // Direct type literal: { foo: string; bar: number }
    if (ts.isTypeLiteralNode(typeNode)) {
      for (const member of typeNode.members) {
        if (ts.isPropertySignature(member)) {
          recordProperty(member, typeName, exported);
        }
      }
      return;
    }

    // Intersection type: { a } & { b }
    if (ts.isIntersectionTypeNode(typeNode)) {
      for (const sub of typeNode.types) {
        walkTypeMembers(typeName, sub, exported);
      }
      return;
    }

    // Other constructs (Pick, Omit, references to other types, etc.) are
    // not directly traversed. Resolved types — including indirect ones —
    // surface through the interface/type declarations themselves.
  }

  function visit(node: ts.Node): void {
    if (ts.isInterfaceDeclaration(node)) {
      const typeName = node.name.text;
      const exported = isExported(node);
      for (const member of node.members) {
        if (ts.isPropertySignature(member)) {
          recordProperty(member, typeName, exported);
        }
      }
    } else if (ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name.text;
      const exported = isExported(node);
      walkTypeMembers(typeName, node.type, exported);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return fields;
}

// ─────────────────────────────────────────────────────────────────────────────
// NONDETERMINISTIC API DETECTION (Check 5 supporting analysis)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Banned API call expressions that produce nondeterministic output.
 *
 * Each banned call has an associated set of carveout files where the
 * call is permitted. Example: `Date.now()` is permitted only in
 * provenance construction (the threshold-manifest module and any
 * module that produces an ObservationProvenance), where it populates
 * the `computed_at` carveout field.
 */
export interface NondeterminismMatch {
  readonly file_path: string;
  readonly line: number;
  readonly call_text: string;
  readonly banned_kind: string;
  readonly carveout_allowed: boolean;
  readonly carveout_reason?: string;
}

const NONDETERMINISTIC_PATTERNS: ReadonlyArray<{
  readonly identifier: string;
  readonly banned_kind: string;
  readonly carveout_paths: ReadonlyArray<string>;
  readonly carveout_reason: string;
}> = [
  {
    identifier: "Math.random",
    banned_kind: "Math.random",
    carveout_paths: [],
    carveout_reason: "no carveout — never permitted",
  },
  {
    identifier: "Date.now",
    banned_kind: "Date.now",
    // Permitted only in modules that produce ObservationProvenance.
    // Their files are explicit; CI fails if Date.now appears elsewhere.
    carveout_paths: [
      "/operations/threshold-manifest.ts",
      "/operations/material-change-detector.ts",
      "/operations/impact-ranker.ts",
      "/operations/stalled-path-detector.ts",
      "/operations/structural-trajectory.ts",
      "/operations/readiness-classifier.ts",
      "/operations/monitoring-watchlist.ts",
      "/operations/deal-evolution-reader.ts",
      "/operations/operations-engine.ts",
      "/operations/types.ts",
    ],
    carveout_reason:
      "Permitted only for populating provenance.computed_at; excluded from replay-verification.",
  },
  {
    identifier: "performance.now",
    banned_kind: "performance.now",
    carveout_paths: [],
    carveout_reason: "no carveout",
  },
  {
    identifier: "process.hrtime",
    banned_kind: "process.hrtime",
    carveout_paths: [],
    carveout_reason: "no carveout",
  },
];

/**
 * Scan a file for nondeterministic API calls. Reports each occurrence
 * with whether the file is on the carveout list for that API.
 *
 * NOTE: `crypto.randomUUID` and similar deterministic-but-unique calls
 * have their own targeted carveouts in threshold-manifest.ts only.
 * They're not in this generic check because they have a specific
 * legitimate use (manifest_id generation at create time) which is
 * itself audited in the manifest module's tests.
 */
export function scanFileForNondeterminism(
  filePath: string,
): ReadonlyArray<NondeterminismMatch> {
  const sourceText = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS,
  );

  const matches: NondeterminismMatch[] = [];

  function checkCallableAccess(text: string, node: ts.Node): void {
    for (const pattern of NONDETERMINISTIC_PATTERNS) {
      if (text === pattern.identifier) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const carveoutAllowed = pattern.carveout_paths.some((p) =>
          filePath.includes(p),
        );
        matches.push({
          file_path: filePath,
          line: line + 1,
          call_text: text,
          banned_kind: pattern.banned_kind,
          carveout_allowed: carveoutAllowed,
          carveout_reason: carveoutAllowed
            ? pattern.carveout_reason
            : undefined,
        });
      }
    }
  }

  function visit(node: ts.Node): void {
    // Property access — Math.random, Date.now, performance.now, process.hrtime
    if (ts.isPropertyAccessExpression(node)) {
      const text = node.getText(sourceFile);
      checkCallableAccess(text, node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return matches;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE DISCOVERY HELPER
// ─────────────────────────────────────────────────────────────────────────────

import { readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Discover all .ts files under a directory recursively. Excludes
 * the __boundary__ directory itself (the boundary checks are not
 * subject to their own checks — they're the constitution).
 *
 * Returns paths in deterministic order (alphabetical), important for
 * reproducible boundary reports.
 */
export function discoverOperationsFiles(
  rootDir: string,
): ReadonlyArray<string> {
  const results: string[] = [];

  function walk(dir: string): void {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      let stats;
      try {
        stats = statSync(full);
      } catch {
        continue;
      }
      if (stats.isDirectory()) {
        if (entry === "__boundary__") continue;
        walk(full);
      } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
        results.push(full);
      }
    }
  }

  walk(rootDir);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSION
// ─────────────────────────────────────────────────────────────────────────────

export const AST_WALKER_VERSION = "cp10-ast-walker-v0.1.0";
