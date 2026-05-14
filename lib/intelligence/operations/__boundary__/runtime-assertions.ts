// lib/intelligence/operations/__boundary__/runtime-assertions.ts
// ─────────────────────────────────────────────────────────────────────────────
// CP-10 Constitutional Boundary — Runtime Assertion Infrastructure
//
// Lightweight runtime checks that live in production request paths.
//
// Why a separate layer from boundary tests:
//
//   Boundary tests run at CI / pre-build time. They use the TypeScript
//   compiler API to scan ASTs — heavy work, not suitable for every
//   request.
//
//   Runtime assertions run at module load. They validate exported
//   metadata that modules embed via const assertions. O(n) over field
//   metadata, not O(n) over source AST. Acceptable to run on every
//   server startup.
//
// What runtime assertions verify:
//
//   - Every CP-10 module exports an EXPECTED_BOUNDARY_METADATA object
//     describing its field allowlist conformance. This is opt-in
//     metadata; modules that don't export it are flagged.
//
//   - Every primitive returned from a CP-10 function has the expected
//     provenance shape (assertProvenance).
//
//   - Outputs are deterministic across repeat invocations
//     (assertDeterministicOutput — used in self-tests).
//
//   - String field values do not exceed MAX_PERMITTED_STRING_VALUE_LENGTH
//     unless the field name is on the long-string carveout list.
//
// BoundaryEnforcementError carries `remediation_required: true` as a
// const literal — there is no path to construct one that says
// "remediation not required." Constitutional failures cannot be
// gracefully degraded.
// ─────────────────────────────────────────────────────────────────────────────

import {
  checkNumericFieldName,
  checkStringFieldName,
} from "./banned-field-patterns";
import {
  MAX_PERMITTED_STRING_VALUE_LENGTH,
  isPermittedLongStringField,
} from "./permitted-string-fields";

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARY ENFORCEMENT ERROR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when a constitutional invariant is violated at runtime.
 *
 * The `remediation_required: true` field is a `const` literal — there
 * is no possible value other than `true`. Constitutional failures
 * cannot be marked as "ignore-able" or "non-critical."
 */
export class BoundaryEnforcementError extends Error {
  public readonly constraint_violated:
    | "no_probability_fields"
    | "no_aggregate_scores"
    | "no_llm_dependencies"
    | "no_prose_artifacts"
    | "no_nondeterminism"
    | "missing_provenance"
    | "not_on_allowlist"
    | "string_too_long"
    | "boundary_metadata_missing";

  public readonly violating_artifact: string;
  public readonly violation_details: Record<string, unknown>;
  public readonly remediation_required: true;

  constructor(
    constraint: BoundaryEnforcementError["constraint_violated"],
    violating_artifact: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(
      `[CP-10 Boundary Enforcement] ${constraint}: ${violating_artifact}: ${message}`,
    );
    this.name = "BoundaryEnforcementError";
    this.constraint_violated = constraint;
    this.violating_artifact = violating_artifact;
    this.violation_details = details;
    this.remediation_required = true as const;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARY METADATA
//
// CP-10 modules export a `BOUNDARY_METADATA` object describing their
// exported types. The runtime self-test validates the metadata against
// the allowlists. This is faster than re-parsing the source AST at
// module load.
//
// Each module's metadata is a frozen object containing one entry per
// exported type, listing its field names and categories.
// ─────────────────────────────────────────────────────────────────────────────

export interface FieldMetadata {
  readonly field_name: string;
  readonly type_category: "number" | "string" | "boolean" | "other";
}

export interface TypeMetadata {
  readonly type_name: string;
  readonly fields: ReadonlyArray<FieldMetadata>;
}

export interface BoundaryMetadata {
  readonly module_name: string;
  readonly module_version: string;
  readonly types: ReadonlyArray<TypeMetadata>;
}

/**
 * Assert that a module's BOUNDARY_METADATA conforms to the
 * constitutional allowlists.
 *
 * Throws BoundaryEnforcementError on any violation. Errors include:
 *   - banned field name patterns (probability, aggregate, prose)
 *   - field names not on PERMITTED_NUMERIC_FIELDS / PERMITTED_STRING_FIELDS
 *
 * Pure function. No IO. Same input → same output.
 */
export function assertBoundaryMetadata(metadata: BoundaryMetadata): void {
  for (const typeEntry of metadata.types) {
    for (const field of typeEntry.fields) {
      const violation = checkFieldMetadata(typeEntry.type_name, field);
      if (violation) {
        throw new BoundaryEnforcementError(
          violation.constraint,
          `${metadata.module_name}.${typeEntry.type_name}.${field.field_name}`,
          violation.message,
          {
            module_name: metadata.module_name,
            module_version: metadata.module_version,
            type_name: typeEntry.type_name,
            field_name: field.field_name,
            field_category: field.type_category,
          },
        );
      }
    }
  }
}

function checkFieldMetadata(
  typeName: string,
  field: FieldMetadata,
): {
  constraint: BoundaryEnforcementError["constraint_violated"];
  message: string;
} | null {
  if (field.type_category === "number") {
    const result = checkNumericFieldName(field.field_name);
    if (!result.ok) {
      return {
        constraint:
          result.violated_invariant === "no_probability_fields"
            ? "no_probability_fields"
            : result.violated_invariant === "no_aggregate_scores"
              ? "no_aggregate_scores"
              : "not_on_allowlist",
        message: result.explanation ?? "boundary violation",
      };
    }
    return null;
  }
  if (field.type_category === "string") {
    const result = checkStringFieldName(field.field_name);
    if (!result.ok) {
      return {
        constraint:
          result.violated_invariant === "no_prose_artifacts"
            ? "no_prose_artifacts"
            : "not_on_allowlist",
        message: result.explanation ?? "boundary violation",
      };
    }
    return null;
  }
  // boolean / other types are unconstrained by name
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE ASSERTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum required shape of ObservationProvenance for runtime
 * validation. Mirrors the type defined in operations/types.ts.
 *
 * Runtime checks the shape, not the deeper semantic correctness of
 * each field value.
 */
export interface ProvenanceShape {
  readonly computed_at: string;
  readonly operations_version: string;
  readonly threshold_manifest_id: string;
  readonly derived_from_snapshot_ids: ReadonlyArray<string>;
  readonly derived_from_event_ids: ReadonlyArray<string>;
}

/**
 * Assert that a value has a valid `provenance` field with all required
 * shape elements.
 *
 * Throws BoundaryEnforcementError with constraint=missing_provenance
 * on any violation.
 */
export function assertProvenance(
  primitive: unknown,
  artifact_name: string,
): asserts primitive is { provenance: ProvenanceShape } {
  if (
    primitive === null ||
    typeof primitive !== "object" ||
    !("provenance" in primitive)
  ) {
    throw new BoundaryEnforcementError(
      "missing_provenance",
      artifact_name,
      "primitive does not contain a `provenance` field",
      { received: typeof primitive },
    );
  }

  const p = (primitive as { provenance: unknown }).provenance;
  if (p === null || typeof p !== "object") {
    throw new BoundaryEnforcementError(
      "missing_provenance",
      artifact_name,
      "`provenance` field is not an object",
    );
  }

  const provenance = p as Record<string, unknown>;
  const requiredFields: ReadonlyArray<keyof ProvenanceShape> = [
    "computed_at",
    "operations_version",
    "threshold_manifest_id",
    "derived_from_snapshot_ids",
    "derived_from_event_ids",
  ];

  for (const field of requiredFields) {
    if (!(field in provenance)) {
      throw new BoundaryEnforcementError(
        "missing_provenance",
        artifact_name,
        `provenance is missing required field '${field}'`,
      );
    }
  }

  if (typeof provenance.computed_at !== "string") {
    throw new BoundaryEnforcementError(
      "missing_provenance",
      artifact_name,
      "provenance.computed_at must be a string (ISO 8601)",
    );
  }
  if (typeof provenance.operations_version !== "string") {
    throw new BoundaryEnforcementError(
      "missing_provenance",
      artifact_name,
      "provenance.operations_version must be a string",
    );
  }
  if (typeof provenance.threshold_manifest_id !== "string") {
    throw new BoundaryEnforcementError(
      "missing_provenance",
      artifact_name,
      "provenance.threshold_manifest_id must be a string",
    );
  }
  if (!Array.isArray(provenance.derived_from_snapshot_ids)) {
    throw new BoundaryEnforcementError(
      "missing_provenance",
      artifact_name,
      "provenance.derived_from_snapshot_ids must be an array",
    );
  }
  if (!Array.isArray(provenance.derived_from_event_ids)) {
    throw new BoundaryEnforcementError(
      "missing_provenance",
      artifact_name,
      "provenance.derived_from_event_ids must be an array",
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STRING VALUE LENGTH ASSERTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walk a primitive recursively and assert no string field's value
 * exceeds MAX_PERMITTED_STRING_VALUE_LENGTH unless the field name is
 * on the long-string carveout.
 *
 * This catches accidental prose injection at runtime: even if the
 * type system permits a string field, its value can't exceed the
 * threshold.
 */
export function assertNoLongStrings(
  primitive: unknown,
  artifact_name: string,
  current_field_name: string | null = null,
): void {
  if (primitive === null || primitive === undefined) return;
  if (typeof primitive === "string") {
    if (
      current_field_name !== null &&
      !isPermittedLongStringField(current_field_name) &&
      primitive.length > MAX_PERMITTED_STRING_VALUE_LENGTH
    ) {
      throw new BoundaryEnforcementError(
        "string_too_long",
        `${artifact_name}.${current_field_name}`,
        `String value exceeds ${MAX_PERMITTED_STRING_VALUE_LENGTH} chars (got ${primitive.length}). Long strings are restricted to pass-through CP-9 fields. Add to PERMITTED_LONG_STRING_FIELDS only with governance review.`,
        {
          field_name: current_field_name,
          value_length: primitive.length,
          max_length: MAX_PERMITTED_STRING_VALUE_LENGTH,
        },
      );
    }
    return;
  }
  if (Array.isArray(primitive)) {
    for (const item of primitive) {
      assertNoLongStrings(item, artifact_name, current_field_name);
    }
    return;
  }
  if (typeof primitive === "object") {
    for (const [key, value] of Object.entries(primitive)) {
      assertNoLongStrings(value, artifact_name, key);
    }
    return;
  }
  // numbers, booleans — fine
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISM ASSERTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a function twice and assert that the outputs are byte-identical
 * after stripping `computed_at` fields (the only permitted
 * nondeterministic value).
 *
 * Used in module self-tests to verify deterministic behavior of CP-10
 * detectors and classifiers.
 *
 * Throws BoundaryEnforcementError with constraint=no_nondeterminism if
 * outputs differ.
 */
export function assertDeterministicOutput<T>(
  artifact_name: string,
  produce: () => T,
): void {
  const a = produce();
  const b = produce();
  const aStripped = stripComputedAt(a);
  const bStripped = stripComputedAt(b);
  const aJson = canonicalJSON(aStripped);
  const bJson = canonicalJSON(bStripped);
  if (aJson !== bJson) {
    throw new BoundaryEnforcementError(
      "no_nondeterminism",
      artifact_name,
      "Two invocations of the same function produced different outputs",
      {
        first_output_excerpt: aJson.slice(0, 300),
        second_output_excerpt: bJson.slice(0, 300),
      },
    );
  }
}

/**
 * Recursively strip `computed_at` and `retrieved_at` fields from a
 * value. These are the only permitted nondeterministic fields and must
 * be excluded from replay-verification comparison.
 *
 * Pure function. Returns a new value; input is unmodified.
 */
const NONDETERMINISTIC_FIELD_NAMES: ReadonlySet<string> = new Set([
  "computed_at",
  "retrieved_at",
]);

function stripComputedAt(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripComputedAt);
  const result: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (NONDETERMINISTIC_FIELD_NAMES.has(key)) continue;
    result[key] = stripComputedAt(v);
  }
  return result;
}

/**
 * Canonical JSON: keys sorted at every level for stable string
 * comparison. Same algorithm as CP-9's canonicalizeForHash.
 */
function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJSON).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  const pairs = keys.map(
    (k) =>
      JSON.stringify(k) +
      ":" +
      canonicalJSON((value as Record<string, unknown>)[k]),
  );
  return "{" + pairs.join(",") + "}";
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSION
// ─────────────────────────────────────────────────────────────────────────────

export const RUNTIME_ASSERTIONS_VERSION = "cp10-runtime-assertions-v0.1.0";
