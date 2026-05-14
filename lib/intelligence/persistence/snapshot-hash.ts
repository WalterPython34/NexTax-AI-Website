// lib/intelligence/persistence/snapshot-hash.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-9 Canonical Hash Computation
//
// Produces the `canonical_evaluation_hash` stored on every snapshot.
//
// REQUIREMENTS (every requirement is a real defensibility property):
//
//   1. Deterministic across runs, machines, and Node versions
//      Same logical input → same hash, every time. This is the anchor for
//      replay verification, dedup, and legal defensibility.
//
//   2. Order-insensitive for objects
//      Object keys do not have a meaningful order in JSON. Two objects
//      with the same key-value pairs in different orders must hash
//      identically.
//
//   3. Order-SENSITIVE for arrays
//      Arrays DO have a meaningful order. CP-3 rule firings, CP-4
//      scenario outputs, CP-5 axis components, etc., all carry
//      semantically-meaningful order. Reordering an array changes the
//      hash.
//
//   4. Number normalization
//      JavaScript number serialization has floating-point edge cases.
//      We normalize to a canonical decimal representation that is
//      stable across runs.
//
//   5. Strict type validation
//      Reject values that have no canonical JSON serialization:
//        - undefined (cannot be JSON-stringified portably)
//        - functions
//        - symbols
//        - BigInt
//        - Date objects (must be ISO strings before reaching the hasher)
//      Throw on unsupported types rather than silently coercing.
//
//   6. Null is preserved
//      null is a meaningful value (distinct from absent). The serializer
//      preserves null verbatim.
//
//   7. NaN, Infinity, -Infinity are rejected
//      These have no canonical JSON representation. The hasher fails
//      fast rather than serializing as "null" (the default JSON.stringify
//      behavior) or "NaN" (non-standard).
//
//   8. Length-prefixed string encoding inside hash buffer
//      To avoid hash collisions from concatenation tricks (the classic
//      "ab" + "c" vs "a" + "bc" problem), we use the canonical JSON
//      string as the input to SHA-256 directly. JSON's quote escaping
//      ensures structural unambiguity.
//
//   9. SHA-256 output
//      Returns a 64-character lowercase hex string. Matches the SQL
//      check constraint: `~ '^[a-f0-9]{64}$'`.
//
// What this module does NOT do:
//
//   - Validate that the CanonicalHashInput is structurally well-formed
//     (the SQL schema check constraints handle that on insert).
//   - Sign or encrypt the hash (this is a content hash, not an
//     authentication tag).
//   - Maintain a hash registry (the database does that via the unique
//     constraint on (deal_id, canonical_evaluation_hash)).
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from "crypto";
import type { CanonicalHashInput } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// NOISE-FIELD STRIPPING
//
// Pipeline artifacts carry per-run identity fields that vary across runs
// even when the underlying logical state is identical:
//
//   - Engine-side timestamps (evaluated_at, fired_at, detected_at, etc.)
//   - Engine-side IDs derived from Date.now() + Math.random()
//     (evaluation_id, posture_id, batch_id, axis_composition_evaluation_id)
//
// These fields MUST be stripped before hashing. Otherwise the
// architectural intent — "two evaluations with identical normalized
// inputs and identical artifact outputs produce the same hash" — fails:
// every run produces a unique hash regardless of state.
//
// The strip is conservative:
//   - Field names are matched exactly (no substring matching) to avoid
//     accidentally removing semantically-meaningful fields.
//   - Stripping happens recursively at every depth.
//   - Arrays are walked; their elements are stripped element-wise.
//   - The stripped value is the original with the noise keys omitted
//     (not set to null), so they don't contribute to the hash at all.
//
// IMPORTANT: When the engine adds new identity/timestamp fields, the
// blocklist below MUST be extended. Otherwise replay verification will
// silently break.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Field names whose values vary across runs of identical state. These
 * are stripped at every nesting depth before hashing.
 *
 * Sourced from CP-2 through CP-8 artifact shapes by enumeration:
 *   - timestamps: evaluated_at, fired_at, detected_at
 *   - identity: evaluation_id, posture_id, batch_id,
 *     axis_composition_evaluation_id
 *
 * If new noise fields appear in CP-N artifacts, extend this set.
 */
export const HASH_NOISE_FIELD_NAMES: ReadonlySet<string> = new Set([
  // Timestamp fields
  "evaluated_at",
  "fired_at",
  "detected_at",
  "created_at",
  "computed_at",
  // Engine-side identifier fields (regenerated per run via Date.now() or
  // Math.random() — they identify the run, not the state)
  "evaluation_id",
  "posture_id",
  "batch_id",
  "axis_composition_evaluation_id",
]);

/**
 * Field names whose VALUES are run-scoped IDs of the form
 *   "{logical_id}@{ISO_timestamp}#{counter}"
 * or
 *   "{logical_id}-{timestamp}-{N}-{random}"
 *
 * For these fields, the per-run suffix is stripped but the field itself
 * is preserved (with the stable logical_id portion as the value). This
 * keeps cross-references between artifacts intact while removing the
 * per-run noise.
 *
 * Examples of fields whose values get normalized:
 *   - firing_id: "rule.coverage.dscr_thin@2026-05-14T03:15:39.144Z#6"
 *                 → "rule.coverage.dscr_thin"
 *   - detection_id: "pattern.evidence.insufficiency_cluster#4@..."
 *                    → "pattern.evidence.insufficiency_cluster"
 *   - output_id: "scenario.stress.lender_stress@2026-05-14T03:15:39.146Z#4"
 *                 → "scenario.stress.lender_stress"
 *
 * Reference fields (whose values are strings referencing the above) are
 * also normalized:
 *   - participating_firing_ids (array of firing_id values)
 *   - sources[].id (each source.id may reference a run-scoped firing_id
 *     or scenario output_id)
 *
 * The "id" field is normalized only when its value MATCHES the run-scoped
 * pattern. Stable IDs without the timestamp/counter suffix pass through
 * unchanged.
 */
/**
 * Test whether a field name represents a run-scoped ID reference.
 *
 * Heuristic: field names ending in "_id" or "_ids" carry IDs that may be
 * run-scoped. We apply ID normalization to their string values.
 *
 * The "id" field by itself is also matched.
 *
 * Examples that match:
 *   firing_id, detection_id, output_id, conclusion_id
 *   from_conclusion_id, to_conclusion_id
 *   participating_firing_ids
 *   addresses_source_ids
 *   related_personality_ids (though personality IDs are stable)
 *   related_axis_keys (does NOT match — ends in "_keys" not "_ids")
 *   id
 *
 * Stable IDs (those without the @timestamp pattern) pass through the
 * normalizer unchanged, so this broad matching is safe.
 */
function isIdReferenceField(fieldName: string): boolean {
  if (fieldName === "id") return true;
  if (fieldName.endsWith("_id")) return true;
  if (fieldName.endsWith("_ids")) return true;
  return false;
}

/**
 * Match a run-scoped ID and return the stable prefix.
 *
 * The general shape of run-scoped IDs across CP-3 / CP-4 / CP-5:
 *
 *   {stable_prefix}{optional_counter}@{ISO_timestamp}{optional_suffix}
 *
 * Where:
 *   {stable_prefix}   — the logical identity (e.g., "rule.coverage.dscr_thin",
 *                      "scenario.normalization.industry_normalized")
 *   {optional_counter} — "#N" before the @ (CP-3 pattern detections)
 *   {ISO_timestamp}    — "2026-05-14T03:14:41.144Z"
 *   {optional_suffix}  — "#N" counter (CP-3 firings) or "#model_gate" /
 *                       similar semantic label (CP-4 scenario outputs)
 *
 * The semantic suffix (#model_gate, #model_path, etc.) IS semantically
 * meaningful — it distinguishes WHY the output was produced. We preserve
 * it when present, stripping only the timestamp in the middle.
 *
 * If the value contains "@" but doesn't match the pattern, leave it
 * unchanged (conservative).
 *
 * Examples:
 *   "rule.coverage.dscr_thin@2026-05-14T03:14:41.144Z#6"
 *     → "rule.coverage.dscr_thin#6"  (counter preserved? no — counter
 *                                     is per-run too)
 *   So actually the trailing #N IS noise (counter). But #model_gate is
 *   semantic. Distinguish by checking whether the suffix is numeric:
 *     numeric suffix (#\d+) → strip (counter)
 *     non-numeric suffix (#word) → preserve (semantic label)
 *
 * Final form:
 *   "rule.coverage.dscr_thin@2026-05-14T...#6" → "rule.coverage.dscr_thin"
 *   "scenario.normalization.capex_normalized@2026-05-14T...#model_gate"
 *     → "scenario.normalization.capex_normalized#model_gate"
 *   "pattern.cluster#1@2026-05-14T..."
 *     → "pattern.cluster"  (the #1 before @ is the counter — strip)
 *   "conclusion.firing.rule.x@2026-05-14T...#6"
 *     → "conclusion.firing.rule.x"
 */
const RUN_SCOPED_TIMESTAMP_REGEX = /@\d{4}-\d{2}-\d{2}T[\d:.Z]+/;
const PRECEDING_COUNTER_REGEX = /#\d+$/;

function normalizeRunScopedId(value: string): string {
  // Fast path: no @ symbol means not a timestamped ID. But might still have
  // a counter prefix like "rule.x#3" without timestamp — in practice CP
  // engines always include the timestamp, but defensively check.
  if (!value.includes("@")) {
    return value;
  }

  // Find the timestamp section
  const timestampMatch = value.match(RUN_SCOPED_TIMESTAMP_REGEX);
  if (!timestampMatch) {
    return value; // contains @ but not the timestamp pattern; leave unchanged
  }

  const tsStart = timestampMatch.index ?? 0;
  const tsLength = timestampMatch[0].length;
  const beforeTimestamp = value.slice(0, tsStart);
  const afterTimestamp = value.slice(tsStart + tsLength);

  // The portion before the timestamp may contain a "#NN" counter suffix
  // (e.g., "pattern.cluster#1@..."). Strip it — it's per-run noise.
  const stablePrefix = beforeTimestamp.replace(PRECEDING_COUNTER_REGEX, "");

  // The portion after the timestamp may be:
  //   "" (empty) — nothing to add
  //   "#NN" (numeric counter) — strip (per-run noise)
  //   "#word" (semantic label) — preserve
  let semanticSuffix = "";
  if (afterTimestamp.length > 0) {
    if (PRECEDING_COUNTER_REGEX.test(afterTimestamp)) {
      // Pure numeric counter — strip
      semanticSuffix = "";
    } else {
      // Non-numeric — preserve
      semanticSuffix = afterTimestamp;
    }
  }

  return stablePrefix + semanticSuffix;
}

/**
 * Deep recursive copy with noise fields stripped and run-scoped IDs
 * normalized. Pure function: input is unmodified.
 *
 * Three transformations:
 *
 *   1. Fields in HASH_NOISE_FIELD_NAMES are dropped entirely
 *      (evaluated_at, fired_at, evaluation_id, batch_id, etc.).
 *
 *   2. Fields whose names end in "_id" or "_ids" (or are exactly "id")
 *      have their string values stripped of run-scoped suffixes:
 *        "rule.coverage.dscr_thin@2026-05-14T...#3"
 *        → "rule.coverage.dscr_thin"
 *      Stable IDs without the @timestamp pattern pass through unchanged.
 *
 *   3. Array fields whose names end in "_ids" have each string element
 *      normalized the same way.
 *
 * Returns the input value when:
 *   - It is null
 *   - It is a primitive (no parent context that requires normalization)
 *
 * Walks arrays element-wise and strips each element.
 *
 * This is exported for diagnostic use ("what does the engine actually
 * hash?") and unit testing.
 */
export function stripNoiseForHashing(value: unknown): unknown {
  return stripNoiseInner(value, null);
}

function stripNoiseInner(value: unknown, parentKey: string | null): unknown {
  if (value === null) return null;
  if (typeof value !== "object") {
    // ID normalization: when the parent key is an ID reference field
    // and the value is a string, strip its run-scoped suffix.
    if (
      typeof value === "string" &&
      parentKey !== null &&
      isIdReferenceField(parentKey)
    ) {
      return normalizeRunScopedId(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    // Array reference fields (anything ending in "_ids"): every string
    // element is a run-scoped ID needing normalization.
    if (parentKey !== null && (parentKey.endsWith("_ids") || parentKey === "ids")) {
      return value.map((v) =>
        typeof v === "string" ? normalizeRunScopedId(v) : stripNoiseInner(v, null),
      );
    }
    return value.map((v) => stripNoiseInner(v, null));
  }
  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (HASH_NOISE_FIELD_NAMES.has(key)) continue;
    result[key] = stripNoiseInner(obj[key], key);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the canonical SHA-256 hash of a CanonicalHashInput.
 *
 * Strips noise fields (timestamps, run-scoped IDs) before canonicalizing.
 * This makes the hash invariant across runs of identical logical state.
 *
 * Returns a 64-character lowercase hexadecimal string suitable for the
 * `canonical_evaluation_hash` column. Pure function: same logical input
 * always produces the same output.
 *
 * Throws if the input contains non-canonical values (undefined, NaN,
 * Infinity, functions, symbols, BigInt, Date objects). Callers must
 * pre-serialize Date values to ISO strings.
 */
export function computeCanonicalEvaluationHash(
  input: CanonicalHashInput,
): string {
  const stripped = stripNoiseForHashing(input);
  const canonical = canonicalize(stripped);
  const hash = createHash("sha256");
  hash.update(canonical, "utf8");
  return hash.digest("hex");
}

/**
 * Lower-level export: produce the canonical JSON string that would be
 * hashed, without actually hashing it. Useful for diagnostics ("show me
 * exactly what was canonicalized") and golden-file tests.
 *
 * The output is a single-line JSON string with no whitespace, keys
 * sorted lexicographically at every object level, numbers normalized,
 * and noise fields stripped.
 */
export function canonicalizeForHash(input: CanonicalHashInput): string {
  const stripped = stripNoiseForHashing(input);
  return canonicalize(stripped);
}

/**
 * Compute a hash of an arbitrary canonical-serializable value. Exposed
 * for use in tests, audit tools, and the explainability ledger
 * (downstream modules may want to hash structured artifacts for cache
 * keys).
 *
 * Does NOT strip noise fields — use this when you need to hash exactly
 * what you give it. For the snapshot canonical hash, use
 * computeCanonicalEvaluationHash().
 *
 * Same throw semantics as computeCanonicalEvaluationHash.
 */
export function computeContentHash(value: unknown): string {
  const canonical = canonicalize(value);
  const hash = createHash("sha256");
  hash.update(canonical, "utf8");
  return hash.digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL JSON SERIALIZATION
//
// JSON.stringify is NOT canonical:
//   - Object key order depends on insertion order (not lexicographic)
//   - Numbers may serialize differently across implementations
//   - Some non-canonical values silently coerce (undefined → omitted in
//     objects, undefined → null in arrays; NaN/Infinity → null)
//
// Our canonicalize() function fixes these:
//   - Sorts object keys lexicographically (recursive)
//   - Normalizes numbers to a stable decimal representation
//   - Throws on non-canonical values
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a value to its canonical JSON string representation.
 * Throws on unsupported types.
 */
function canonicalize(value: unknown): string {
  return serialize(value, []);
}

/**
 * Recursive serializer. The `path` argument carries the current key path
 * for diagnostic messages — if a type error fires, we can tell the
 * caller "the value at axis_composition_result.financial_score.components[2].contribution
 * is NaN" rather than "something is wrong somewhere."
 */
function serialize(value: unknown, path: ReadonlyArray<string>): string {
  // ── null ──
  if (value === null) {
    return "null";
  }

  // ── undefined ──
  if (value === undefined) {
    throw makeHashError(
      "undefined values are not canonicalizable",
      path,
      "consider null or omitting the key",
    );
  }

  // ── boolean ──
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  // ── number ──
  if (typeof value === "number") {
    return serializeNumber(value, path);
  }

  // ── string ──
  if (typeof value === "string") {
    return JSON.stringify(value); // JSON.stringify handles escaping deterministically
  }

  // ── bigint ──
  if (typeof value === "bigint") {
    throw makeHashError(
      "BigInt values are not canonicalizable",
      path,
      "convert to string or number before hashing",
    );
  }

  // ── symbol ──
  if (typeof value === "symbol") {
    throw makeHashError(
      "Symbol values are not canonicalizable",
      path,
      "symbols have no canonical JSON representation",
    );
  }

  // ── function ──
  if (typeof value === "function") {
    throw makeHashError(
      "Function values are not canonicalizable",
      path,
      "functions must be stripped before hashing",
    );
  }

  // ── Date (we require ISO strings, not Date objects) ──
  if (value instanceof Date) {
    throw makeHashError(
      "Date values are not canonicalizable directly",
      path,
      "convert Date to ISO string via toISOString() before hashing",
    );
  }

  // ── array ──
  if (Array.isArray(value)) {
    return serializeArray(value, path);
  }

  // ── plain object ──
  if (typeof value === "object") {
    return serializeObject(value as Record<string, unknown>, path);
  }

  // Should be unreachable — typeof covers all primitives + objects/functions
  throw makeHashError(
    `unsupported value type: ${typeof value}`,
    path,
    "only null, boolean, number, string, array, and plain object are canonicalizable",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NUMBER NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a number to a canonical decimal representation.
 *
 * Rules:
 *   - NaN, Infinity, -Infinity → throw (no canonical representation)
 *   - Negative zero (-0) → "0" (positive zero canonical form)
 *   - Integers fitting in safe integer range → integer literal
 *     (e.g., 42 → "42", not "42.0")
 *   - Floats → use the shortest round-trip representation (JavaScript's
 *     default Number.prototype.toString() already produces this; we
 *     accept it as the canonical form)
 *
 * Note: we intentionally do not round or truncate. Two snapshots with
 * differing floats (e.g., 0.1 + 0.2 = 0.30000000000000004 vs 0.3) MUST
 * produce different hashes — the engine should produce stable floats
 * upstream. The canonical hash exposes drift; it does not paper over it.
 */
function serializeNumber(n: number, path: ReadonlyArray<string>): string {
  if (Number.isNaN(n)) {
    throw makeHashError(
      "NaN is not canonicalizable",
      path,
      "the engine should not produce NaN; check upstream computation",
    );
  }
  if (n === Number.POSITIVE_INFINITY) {
    throw makeHashError(
      "Infinity is not canonicalizable",
      path,
      "the engine should not produce Infinity; check upstream computation",
    );
  }
  if (n === Number.NEGATIVE_INFINITY) {
    throw makeHashError(
      "-Infinity is not canonicalizable",
      path,
      "the engine should not produce -Infinity; check upstream computation",
    );
  }

  // Normalize -0 to 0. Object.is distinguishes them; we collapse to
  // the positive form. (JSON treats them identically anyway.)
  if (Object.is(n, -0)) {
    return "0";
  }

  // Use Number.prototype.toString() which produces the shortest
  // round-trip representation. This is the same algorithm that
  // JSON.stringify uses for numbers, so it is portable across Node
  // versions.
  return n.toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// ARRAY SERIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serialize an array. Order is preserved — arrays in our domain carry
 * semantic order (rule firings sequence, axis component order, etc.).
 */
function serializeArray(
  arr: ReadonlyArray<unknown>,
  path: ReadonlyArray<string>,
): string {
  if (arr.length === 0) return "[]";
  const items: string[] = [];
  for (let i = 0; i < arr.length; i += 1) {
    items.push(serialize(arr[i], [...path, `[${i}]`]));
  }
  return `[${items.join(",")}]`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OBJECT SERIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serialize an object with keys sorted lexicographically.
 *
 * Undefined values in objects are REJECTED, not skipped. This differs
 * from JSON.stringify which silently drops keys with undefined values.
 * We reject because dropping silently can cause two semantically-different
 * inputs to hash identically.
 *
 * To omit a value, the caller should omit the key entirely (not set it
 * to undefined).
 */
function serializeObject(
  obj: Record<string, unknown>,
  path: ReadonlyArray<string>,
): string {
  // Get own enumerable string keys (we deliberately skip symbol keys).
  const keys = Object.keys(obj).sort();

  if (keys.length === 0) return "{}";

  const pairs: string[] = [];
  for (const key of keys) {
    const value = obj[key];
    // Object.keys returns only enumerable own keys, but a value can
    // still be explicitly set to undefined. We reject that.
    if (value === undefined) {
      throw makeHashError(
        `undefined value at key ${JSON.stringify(key)}`,
        path,
        "omit the key entirely instead of setting it to undefined",
      );
    }
    const serializedKey = JSON.stringify(key);
    const serializedValue = serialize(value, [...path, key]);
    pairs.push(`${serializedKey}:${serializedValue}`);
  }
  return `{${pairs.join(",")}}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

function makeHashError(
  reason: string,
  path: ReadonlyArray<string>,
  hint: string,
): Error {
  const pathDisplay = path.length === 0 ? "(root)" : path.join(".");
  return new Error(
    `CP-9 canonical hash failure at ${pathDisplay}: ${reason}. ${hint}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-TEST — fail closed at module load
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Module-load self-test. Verifies the canonical hash function produces:
 *   - Stable output for the same input (run twice, get the same hash)
 *   - Different output for different inputs (sanity)
 *   - Order-insensitive on object keys
 *   - Order-sensitive on arrays
 *   - 64-character lowercase hex
 *   - Throws on undefined / NaN / Infinity / -Infinity
 *
 * Logs warnings on failure but does not throw — the canonical hash is
 * exercised heavily by snapshot-builder which has its own validation.
 */
function logSelfTestWarning(message: string): void {
  const g = globalThis as { console?: { error?: (m: string) => void } };
  if (g.console && typeof g.console.error === "function") {
    g.console.error(message);
  }
}

function selfTestCanonicalHash(): boolean {
  try {
    // Test 1: deterministic output
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 2 };
    const h1 = computeContentHash(obj1);
    const h2 = computeContentHash(obj2);
    if (h1 !== h2) {
      logSelfTestWarning(`CP-9 hash self-test failed: identical inputs produced different hashes (${h1} vs ${h2})`);
      return false;
    }

    // Test 2: order-insensitive on object keys
    const ordered = { a: 1, b: 2, c: 3 };
    const reordered = { c: 3, a: 1, b: 2 };
    const hOrdered = computeContentHash(ordered);
    const hReordered = computeContentHash(reordered);
    if (hOrdered !== hReordered) {
      logSelfTestWarning("CP-9 hash self-test failed: object key reordering changed the hash");
      return false;
    }

    // Test 3: order-sensitive on arrays
    const arr1 = [1, 2, 3];
    const arr2 = [3, 2, 1];
    const hArr1 = computeContentHash(arr1);
    const hArr2 = computeContentHash(arr2);
    if (hArr1 === hArr2) {
      logSelfTestWarning("CP-9 hash self-test failed: array reordering did not change the hash");
      return false;
    }

    // Test 4: hash format (64-char lowercase hex)
    if (!/^[a-f0-9]{64}$/.test(h1)) {
      logSelfTestWarning(`CP-9 hash self-test failed: hash format invalid (got: ${h1})`);
      return false;
    }

    // Test 5: throws on undefined
    let threwOnUndefined = false;
    try {
      computeContentHash({ a: undefined as unknown as null });
    } catch {
      threwOnUndefined = true;
    }
    if (!threwOnUndefined) {
      logSelfTestWarning("CP-9 hash self-test failed: undefined did not throw");
      return false;
    }

    // Test 6: throws on NaN
    let threwOnNaN = false;
    try {
      computeContentHash({ a: NaN });
    } catch {
      threwOnNaN = true;
    }
    if (!threwOnNaN) {
      logSelfTestWarning("CP-9 hash self-test failed: NaN did not throw");
      return false;
    }

    // Test 7: throws on Infinity
    let threwOnInfinity = false;
    try {
      computeContentHash({ a: Infinity });
    } catch {
      threwOnInfinity = true;
    }
    if (!threwOnInfinity) {
      logSelfTestWarning("CP-9 hash self-test failed: Infinity did not throw");
      return false;
    }

    // Test 8: -0 normalizes to 0
    const hNegZero = computeContentHash({ a: -0 });
    const hPosZero = computeContentHash({ a: 0 });
    if (hNegZero !== hPosZero) {
      logSelfTestWarning("CP-9 hash self-test failed: -0 did not normalize to 0");
      return false;
    }

    // Test 9: null preserved (distinct from absent)
    const hNull = computeContentHash({ a: null });
    const hEmpty = computeContentHash({});
    if (hNull === hEmpty) {
      logSelfTestWarning("CP-9 hash self-test failed: null and absent key produced the same hash");
      return false;
    }

    // Test 10: nested object key order
    const nested1 = { outer: { a: 1, b: 2 }, other: [3, 4] };
    const nested2 = { other: [3, 4], outer: { b: 2, a: 1 } };
    const hNested1 = computeContentHash(nested1);
    const hNested2 = computeContentHash(nested2);
    if (hNested1 !== hNested2) {
      logSelfTestWarning("CP-9 hash self-test failed: nested object key reordering changed the hash");
      return false;
    }

    // Test 11: noise fields stripped at top level
    const withTimestamp = stripNoiseForHashing({
      a: 1,
      evaluated_at: "2026-01-01T00:00:00Z",
      evaluation_id: "eval-12345",
    });
    if ((withTimestamp as Record<string, unknown>).evaluated_at !== undefined) {
      logSelfTestWarning("CP-9 hash self-test failed: evaluated_at not stripped");
      return false;
    }
    if ((withTimestamp as Record<string, unknown>).evaluation_id !== undefined) {
      logSelfTestWarning("CP-9 hash self-test failed: evaluation_id not stripped");
      return false;
    }
    if ((withTimestamp as Record<string, unknown>).a !== 1) {
      logSelfTestWarning("CP-9 hash self-test failed: stripping removed non-noise field");
      return false;
    }

    // Test 12: noise stripping is recursive
    const nested = stripNoiseForHashing({
      outer: {
        evaluated_at: "2026-01-01T00:00:00Z",
        inner: { posture_id: "p-1", value: 42 },
      },
    });
    const outerObj = (nested as { outer: Record<string, unknown> }).outer;
    if (outerObj.evaluated_at !== undefined) {
      logSelfTestWarning("CP-9 hash self-test failed: nested evaluated_at not stripped");
      return false;
    }
    const innerObj = outerObj.inner as Record<string, unknown>;
    if (innerObj.posture_id !== undefined) {
      logSelfTestWarning("CP-9 hash self-test failed: deeply-nested posture_id not stripped");
      return false;
    }
    if (innerObj.value !== 42) {
      logSelfTestWarning("CP-9 hash self-test failed: stripping removed deeply-nested non-noise field");
      return false;
    }

    // Test 13: array elements get stripped
    const arrStripped = stripNoiseForHashing([
      { fired_at: "2026-01-01T00:00:00Z", id: 1 },
      { fired_at: "2026-01-02T00:00:00Z", id: 2 },
    ]) as Array<Record<string, unknown>>;
    if (arrStripped[0].fired_at !== undefined || arrStripped[1].fired_at !== undefined) {
      logSelfTestWarning("CP-9 hash self-test failed: array element noise fields not stripped");
      return false;
    }

    return true;
  } catch (err) {
    logSelfTestWarning(
      `CP-9 hash self-test crashed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

const _selfTestResult = selfTestCanonicalHash();
if (!_selfTestResult) {
  logSelfTestWarning("CP-9 canonical hash module loaded with self-test warnings");
}
