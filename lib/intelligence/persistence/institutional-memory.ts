// lib/intelligence/persistence/institutional-memory.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-9 Institutional Memory
//
// The moat dataset. Real-world events occurring during deal lifecycle,
// recorded independently of snapshots and optionally linked to them.
//
// Eventually correlates:
//   - engine readings at snapshot time (axis scores, postures, fragility)
//   - actual deal outcomes (closed, died, retraded, SBA declined, etc.)
//
// That correlation is what makes this defensible territory.
//
// Architectural commitments:
//
//   1. Append-only at the DB level. The immutability trigger on
//      institutional_memory_events rejects UPDATE/DELETE. The typed
//      API matches that semantic: only insert + read operations are
//      exposed. There is no recordUpdate, no recordDelete.
//
//   2. Events are independent of snapshots. An event can be recorded
//      without an evaluation occurring. The optional related_snapshot_id
//      links an event to a snapshot when relevant (e.g., "lender
//      contacted while looking at this snapshot's PDF").
//
//   3. Events can chain. parent_event_id allows constructing event
//      sequences ("LOI submitted → LOI accepted → QoE started → ...").
//      The chain walker returns the full ancestry of an event.
//
//   4. Pure repository wrapper. This module does not analyze events,
//      classify them, or produce derived metrics. Those operations
//      belong to future analysis modules.
//
//   5. Errors are typed. PersistenceResult discriminated union for
//      every read/write. RLS denials, missing snapshots, batch
//      validation failures surface as typed PersistenceError values.
//
//   6. Batch writes are sequential, not atomic. The schema does not
//      expose a batch insert RPC for events (unlike snapshots, which
//      have cp9_insert_snapshot_bundle for atomicity). Batch event
//      recording is best-effort: each event is inserted in sequence;
//      a mid-batch failure leaves prior events committed. This is
//      acceptable because events are append-only and the application
//      can retry the remainder. The function documents this clearly.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type {
  InstitutionalMemoryEvent,
  InstitutionalMemoryEventInsert,
  MemoryEventType,
  PersistenceError,
  PersistenceErrorCode,
  PersistenceResult,
} from "./types";
import { PERSISTENCE_MODULE_VERSION } from "./types";

export { PERSISTENCE_MODULE_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construct an InstitutionalMemoryRepository over a Supabase client.
 *
 * Stateless. The caller controls auth context via the supplied
 * client — RLS resolves to the caller's auth.uid().
 */
export function createInstitutionalMemoryRepository(
  client: SupabaseClient,
): InstitutionalMemoryRepository {
  return new InstitutionalMemoryRepository(client);
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class InstitutionalMemoryRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // ──────────────────────────────────────────────────────────────────
  // WRITE API
  // ──────────────────────────────────────────────────────────────────

  /**
   * Record a single institutional memory event.
   *
   * Returns the generated event_id on success.
   *
   * Errors:
   *   - rls_access_denied: caller cannot insert (auth.uid() != user_id)
   *   - snapshot_not_found: related_snapshot_id references missing snapshot
   *   - unknown: unexpected database error
   *
   * Note: the database also rejects UPDATE and DELETE via the
   * immutability trigger; this method does not even attempt those
   * operations because the repository class exposes no update or
   * delete methods.
   */
  async recordEvent(
    event: InstitutionalMemoryEventInsert,
  ): Promise<PersistenceResult<string>> {
    try {
      const { data, error } = await this.client
        .from("institutional_memory_events")
        .insert({
          deal_id: event.deal_id,
          user_id: event.user_id,
          team_id: event.team_id,
          event_type: event.event_type,
          event_at: event.event_at,
          related_snapshot_id: event.related_snapshot_id,
          parent_event_id: event.parent_event_id,
          event_payload: event.event_payload,
          notes: event.notes,
          recorded_by: event.recorded_by,
        })
        .select("event_id")
        .single();

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          deal_id: event.deal_id,
          event_type: event.event_type,
        });
      }

      if (!data || typeof data.event_id !== "string") {
        return makeError(
          "unknown",
          "event insert returned no event_id",
          { event_type: event.event_type, deal_id: event.deal_id },
        );
      }

      return { ok: true, value: data.event_id };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error recording event: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { event_type: event.event_type, deal_id: event.deal_id },
      );
    }
  }

  /**
   * Record multiple events in sequence.
   *
   * IMPORTANT: this method is NOT atomic. Each event is inserted in
   * its own transaction. A mid-batch failure leaves prior events
   * committed. The application is responsible for retrying any
   * missing events from the returned partial results.
   *
   * Returns an array of results in the same order as the input. Each
   * entry is either:
   *   - PersistenceResult<string> with the generated event_id (ok=true)
   *   - PersistenceResult<string> with the typed error (ok=false)
   *
   * The application can inspect the returned array to determine which
   * events succeeded and which need retry.
   *
   * Why not atomic: the database does not expose a batch insert RPC
   * for events (events were not designed for high-volume bulk
   * insertion in CP-9). Atomic batching can be added later if a use
   * case emerges by introducing a Postgres function similar to
   * cp9_insert_snapshot_bundle.
   *
   * Recommended use:
   *   - Single event from a request handler: use recordEvent()
   *   - Backfill or import: use this method and check each result
   *   - Anywhere requiring all-or-nothing semantics: do NOT use this
   *     method
   */
  async recordEventBatch(
    events: ReadonlyArray<InstitutionalMemoryEventInsert>,
  ): Promise<ReadonlyArray<PersistenceResult<string>>> {
    const results: PersistenceResult<string>[] = [];
    for (const event of events) {
      const result = await this.recordEvent(event);
      results.push(result);
    }
    return results;
  }

  // ──────────────────────────────────────────────────────────────────
  // READ API
  // ──────────────────────────────────────────────────────────────────

  /**
   * Fetch a single event by its UUID.
   */
  async getEventById(
    event_id: string,
  ): Promise<PersistenceResult<InstitutionalMemoryEvent>> {
    try {
      const { data, error } = await this.client
        .from("institutional_memory_events")
        .select("*")
        .eq("event_id", event_id)
        .maybeSingle();

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          event_id,
        });
      }
      if (!data) {
        return makeError(
          "snapshot_not_found",
          `event ${event_id} not found (or RLS-hidden)`,
          { event_id },
        );
      }

      return { ok: true, value: rowToEvent(data) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching event: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { event_id },
      );
    }
  }

  /**
   * Fetch all events for a deal, newest first.
   *
   * Hits the (deal_id, event_at desc) index.
   */
  async getEventsForDeal(
    deal_id: string,
    options?: {
      readonly limit?: number;
      readonly event_type?: MemoryEventType;
    },
  ): Promise<PersistenceResult<ReadonlyArray<InstitutionalMemoryEvent>>> {
    try {
      let query = this.client
        .from("institutional_memory_events")
        .select("*")
        .eq("deal_id", deal_id)
        .order("event_at", { ascending: false });

      if (options?.event_type) {
        query = query.eq("event_type", options.event_type);
      }
      if (options?.limit !== undefined) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          deal_id,
        });
      }

      const rows = (data ?? []) as ReadonlyArray<RawEventRow>;
      return { ok: true, value: rows.map(rowToEvent) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching events for deal: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { deal_id },
      );
    }
  }

  /**
   * Fetch events of a specific type across all the caller's deals.
   *
   * Useful for "show me all LOIs" or "show me all deal_closed events"
   * dashboards. Newest first.
   */
  async getEventsByType(
    event_type: MemoryEventType,
    options?: {
      readonly limit?: number;
      readonly since?: string;   // ISO timestamp lower bound
      readonly until?: string;   // ISO timestamp upper bound
    },
  ): Promise<PersistenceResult<ReadonlyArray<InstitutionalMemoryEvent>>> {
    try {
      let query = this.client
        .from("institutional_memory_events")
        .select("*")
        .eq("event_type", event_type)
        .order("event_at", { ascending: false });

      if (options?.since !== undefined) {
        query = query.gte("event_at", options.since);
      }
      if (options?.until !== undefined) {
        query = query.lte("event_at", options.until);
      }
      if (options?.limit !== undefined) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          event_type,
        });
      }

      const rows = (data ?? []) as ReadonlyArray<RawEventRow>;
      return { ok: true, value: rows.map(rowToEvent) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching events by type: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { event_type },
      );
    }
  }

  /**
   * Fetch events linked to a specific snapshot.
   *
   * Useful for "what happened around the time of this evaluation?"
   * queries — e.g., "this snapshot triggered an LOI submission and
   * a lender contact."
   */
  async getEventsForSnapshot(
    snapshot_id: string,
  ): Promise<PersistenceResult<ReadonlyArray<InstitutionalMemoryEvent>>> {
    try {
      const { data, error } = await this.client
        .from("institutional_memory_events")
        .select("*")
        .eq("related_snapshot_id", snapshot_id)
        .order("event_at", { ascending: false });

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          snapshot_id,
        });
      }

      const rows = (data ?? []) as ReadonlyArray<RawEventRow>;
      return { ok: true, value: rows.map(rowToEvent) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching events for snapshot: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { snapshot_id },
      );
    }
  }

  /**
   * Fetch the direct children of an event (events whose parent_event_id
   * equals the given event_id).
   *
   * For walking forward through an event chain ("what happened after
   * this LOI was submitted?").
   */
  async getChildEvents(
    parent_event_id: string,
  ): Promise<PersistenceResult<ReadonlyArray<InstitutionalMemoryEvent>>> {
    try {
      const { data, error } = await this.client
        .from("institutional_memory_events")
        .select("*")
        .eq("parent_event_id", parent_event_id)
        .order("event_at", { ascending: true });

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          parent_event_id,
        });
      }

      const rows = (data ?? []) as ReadonlyArray<RawEventRow>;
      return { ok: true, value: rows.map(rowToEvent) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching child events: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { parent_event_id },
      );
    }
  }

  /**
   * Walk backward through an event chain, returning the full ancestry.
   *
   * Returns events ordered from root → current. The first element is
   * the root of the chain (no parent_event_id); the last element is
   * the given event.
   *
   * Limits chain walking to MAX_CHAIN_DEPTH iterations to prevent
   * infinite loops in case of cycles (which would indicate database
   * corruption — events are append-only and a cycle should not be
   * possible to construct, but we defend against it).
   *
   * Returns an empty array if the given event_id doesn't exist.
   */
  async getEventAncestry(
    event_id: string,
  ): Promise<PersistenceResult<ReadonlyArray<InstitutionalMemoryEvent>>> {
    const chain: InstitutionalMemoryEvent[] = [];
    const seenIds = new Set<string>();
    let currentId: string | null = event_id;

    for (let i = 0; i < MAX_CHAIN_DEPTH && currentId !== null; i += 1) {
      if (seenIds.has(currentId)) {
        // Cycle detected — shouldn't happen with append-only, but defend
        return makeError(
          "unknown",
          "event chain cycle detected; database integrity violation",
          { event_id, cycle_at: currentId },
        );
      }
      seenIds.add(currentId);

      const result = await this.getEventById(currentId);
      if (!result.ok) {
        // If the chain head doesn't exist, return empty (consistent
        // with "no ancestry to walk"). If an intermediate node is
        // missing, that's a referential integrity issue but the FK
        // constraints in the schema prevent it.
        if (result.error.code === "snapshot_not_found" && chain.length === 0) {
          return { ok: true, value: [] };
        }
        return result;
      }

      chain.push(result.value);
      currentId = result.value.parent_event_id;
    }

    // Reverse so root is first
    chain.reverse();
    return { ok: true, value: chain };
  }
}

/**
 * Maximum chain walking depth. Defensive bound against pathological
 * data. In practice chains should be 2-10 events deep (e.g., LOI
 * submitted → LOI accepted → QoE started → QoE completed → deal_closed
 * is 5 events). The bound exists to prevent unbounded queries; it can
 * be raised if real-world chains warrant.
 */
const MAX_CHAIN_DEPTH = 100;

// ─────────────────────────────────────────────────────────────────────────────
// POSTGRES ERROR MAPPING
// ─────────────────────────────────────────────────────────────────────────────

function mapPostgresError(error: PostgrestError): PersistenceErrorCode {
  const code = error.code;
  const message = (error.message || "").toLowerCase();

  // SQLSTATE 42501: insufficient_privilege (RLS denial)
  if (code === "42501") {
    return "rls_access_denied";
  }

  // SQLSTATE P0001: raise_exception (immutability trigger)
  if (code === "P0001") {
    if (message.includes("append-only") || message.includes("not permitted")) {
      return "snapshot_immutable_violation";
    }
    return "unknown";
  }

  // SQLSTATE 23503: foreign_key_violation
  // related_snapshot_id points to missing snapshot, OR parent_event_id
  // points to missing parent event
  if (code === "23503") {
    if (message.includes("related_snapshot_id")) {
      return "snapshot_not_found";
    }
    if (message.includes("parent_event_id")) {
      return "snapshot_not_found";
    }
    return "unknown";
  }

  // SQLSTATE 23514: check_violation
  if (code === "23514") {
    return "unknown";
  }

  // SQLSTATE PGRST116: PostgREST no-rows
  if (code === "PGRST116") {
    return "snapshot_not_found";
  }

  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW ROW TYPE
// ─────────────────────────────────────────────────────────────────────────────

interface RawEventRow {
  event_id: string;
  deal_id: string;
  user_id: string;
  team_id: string | null;
  event_type: string;
  event_at: string;
  recorded_at: string;
  related_snapshot_id: string | null;
  parent_event_id: string | null;
  event_payload: Record<string, unknown>;
  notes: string | null;
  recorded_by: string;
}

function rowToEvent(row: RawEventRow): InstitutionalMemoryEvent {
  return {
    event_id: row.event_id,
    deal_id: row.deal_id,
    user_id: row.user_id,
    team_id: row.team_id,
    event_type: row.event_type as MemoryEventType,
    event_at: row.event_at,
    recorded_at: row.recorded_at,
    related_snapshot_id: row.related_snapshot_id,
    parent_event_id: row.parent_event_id,
    event_payload: row.event_payload,
    notes: row.notes,
    recorded_by: row.recorded_by,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────

function makeError<T>(
  code: PersistenceError["code"],
  message: string,
  context: Record<string, unknown>,
): PersistenceResult<T> {
  return {
    ok: false,
    error: { code, message, context },
  };
}
