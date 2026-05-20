// lib/intelligence/operations/__boundary__/permitted-string-fields.ts
// ─────────────────────────────────────────────────────────────────────────────
// CP-10 Constitutional Boundary — Permitted String Fields Allowlist
//
// Enforces Invariant #5 Check 4 (No Prose Artifacts) by enumerating
// the only string field names that may appear in CP-10 types.
//
// CONSTITUTIONAL CATEGORIES (the only acceptable string semantics):
//
//   1. Identifiers — UUIDs, deterministic IDs, semantic keys.
//      Examples: snapshot_id, deal_id, item_id, manifest_id
//
//   2. Enum-like classifications — short string union types.
//      Examples: severity, classification, status, trajectory
//
//   3. Timestamps — ISO 8601 datetime strings.
//      Examples: computed_at, evaluated_at, event_at
//
//   4. Version strings — semantic versions like "cp10-v0.1.0".
//      Examples: operations_version, version
//
//   5. Pass-through fields from CP-9 — strings that CP-10 reads from
//      CP-9 records without modification. CP-9 already constrains
//      these (item_label is bounded length, etc.).
//      Examples: item_label, change_description (CP-9 lineage),
//      notes (institutional memory event field)
//
//   6. Filter values — short string values used for portfolio filter
//      semantics (e.g., industry_key value, axis name).
//      Examples: filter_value_text
//
// PROHIBITED categories (these will never appear here):
//
//   - description, narrative, summary, headline, explanation
//   - prose, message, body, content, sentence, paragraph
//   - human_readable, copy, instruction, suggestion
//   - recommendation, advice, next_action
//
// Adding entries requires governance review.
// Removing entries is always safe.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permitted string field names. Case-sensitive exact match.
 */
export const PERMITTED_STRING_FIELDS: ReadonlySet<string> = new Set([
  // ── Category 1: Identifiers ──
  // UUIDs and semantic keys for CP-10 entities and references.
  "snapshot_id",
  "before_snapshot_id",
  "after_snapshot_id",
  "first_appeared_snapshot_id",
  "first_seen_snapshot_id",
  "last_seen_snapshot_id",
  "resolved_at_snapshot_id",
  "detected_in_snapshot_id",
  "deal_id",
  "user_id",
  "team_id",
  "item_id",
  "from_item_id",
  "to_item_id",
  "concern_id",
  "priority_id",
  "fragment_id",
  "artifact_id",
  "evaluation_id",
  "event_id",
  "trace_id",
  "history_id",
  "entry_id",
  "manifest_id",
  "threshold_manifest_id",
  "firing_id",
  "addresses_target_id",
  "related_snapshot_id",
  "parent_event_id",
  "parent_snapshot_id",
  "root_evaluation_id",
  "replay_source_snapshot_id",
  "triggered_by",
  "triggered_by_event_id",
  "recorded_by",
  "group_key",

  // ── Category 2: Enum-like classifications ──
  // Short union-type strings. The TypeScript type system constrains
  // these to known values; the allowlist is belt-and-suspenders.
  "change_kind",
  "severity",
  "trajectory",
  "classification",
  "impact_classification",
  "aggregate_impact_classification",
  "stall_reason",
  "trigger_kind",
  "scope_kind",
  "filter_kind",
  "group_kind",
  "item_kind",
  "status",
  "current_status",
  "axis",
  "axis_or_dimension",
  "band",
  "band_before",
  "band_after",
  "band_transition",
  "repairability",
  "state",
  "state_before",
  "state_after",
  "state_transition",
  "fragment_kind",
  "artifact_type",
  "change_reason",
  "replay_origin",
  "event_type",
  "mode",
  "fingerprint_key",
  "highest_fragility_axis",
  "dominant_constraint_axis",
  "dominant_constraint_band",
  "dominant_constraint_repairability",
  "closest_recoverable_profile",
  "closest_recoverable_state",
  "top_assumption_key",
  "top_assumption_evidence_band",
  "personality_id",
  "personality_before",
  "personality_after",
  "personality",
  "primary_axis",
  "primary_axis_band",
  "axis_key",
  "assumption_key",
  "comfort_condition_id",
  "info_need_id",

  // ── Category 3: Timestamps ──
  // ISO 8601 datetime strings. Always RFC 3339 / ISO 8601 compliant.
  "computed_at",
  "evaluated_at",
  "created_at",
  "recorded_at",
  "event_at",
  "fired_at",
  "first_appeared_at",
  "first_seen_at",
  "last_seen_at",
  "last_evaluated_at",
  "before_evaluated_at",
  "after_evaluated_at",
  "from_evaluated_at",
  "to_evaluated_at",
  "since",
  "until",
  "retrieved_at",
  "replayed_at",

  // ── Category 4: Version strings ──
  // Semantic version identifiers.
  "operations_version",
  "version",
  "engine_version",
  "builder_version",
  "schema_version_string",

  // ── Category 5: Pass-through from CP-9 ──
  // Strings that originate in CP-9 records and pass through CP-10
  // unchanged. CP-9's own constraints apply.
  "item_label",
  "label",
  "change_description",
  "notes",
  "description",
  "assumption_name",

  // ── Category 6: Filter values (portfolio scope, reserved) ──
  // Short string values used inside portfolio filter configurations.
  // These are user-supplied values (industry key, axis name) — not
  // CP-10-generated prose.
  "filter_value_text",
  "industry_key",
  "deal_source_type",

  // ── Threshold names (string identifiers within threshold tracking) ──
  "threshold_kind",
  "threshold_name",
  // ── Error-handling fields (OperationsError) ──
  // Operator-facing error message. Mirrors CP-9's PersistenceError.message
  // convention. NOT buyer-facing prose — short technical descriptions
  // consumed by application error-handling code, never rendered to the
  // buyer. Bounded by the 200-char runtime cap (not on the long-string
  // carveout).
  "message",
  // Error code enum. String values come from the OperationsErrorCode union;
  // mirrors CP-9's PersistenceError.code pattern.
  "code",
]);

/**
 * Field names whose VALUES are permitted to exceed 200 characters.
 * Without this carveout, the runtime length check would false-positive
 * on legitimately long pass-through fields.
 *
 * CP-10 itself produces no long strings. Long strings only enter via
 * CP-9 pass-through fields like `description` (structural concern).
 */
export const PERMITTED_LONG_STRING_FIELDS: ReadonlySet<string> = new Set([
  "description",     // structural concern descriptions from CP-9 can be long
  "change_description",  // CP-9 lineage prose, sometimes long
  "notes",           // institutional memory event notes
  "item_label",      // can be a long-ish summary phrase
  "label",           // generic label, can be long
]);

/**
 * Maximum permitted value length for any string field NOT on the
 * PERMITTED_LONG_STRING_FIELDS list.
 *
 * 200 chars is generous for identifiers (UUIDs are 36 chars),
 * timestamps (ISO 8601 is ~30 chars), enum strings (under 60), and
 * version strings (under 30). Any string field whose value exceeds
 * this length and is not on the long-string carveout list fails the
 * runtime boundary check.
 */
export const MAX_PERMITTED_STRING_VALUE_LENGTH = 200;

/**
 * Allowlist version. Stamped onto every CP-10 artifact via
 * operations_version metadata.
 */
export const PERMITTED_STRING_FIELDS_VERSION =
  "cp10-permitted-string-v0.1.0";

/**
 * Test whether a field name is on the permitted string allowlist.
 */
export function isPermittedStringField(fieldName: string): boolean {
  return PERMITTED_STRING_FIELDS.has(fieldName);
}

/**
 * Test whether a field name is permitted to have a long (>200 char) value.
 */
export function isPermittedLongStringField(fieldName: string): boolean {
  return PERMITTED_LONG_STRING_FIELDS.has(fieldName);
}
