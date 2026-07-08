// lib/pipelineLogger.ts
// Patch E1 — Structured pipeline event logging
//
// Purpose: replace silent catch blocks in /api/record-deal with a structured,
// queryable failure signal, WITHOUT changing the non-blocking save guarantee.
//
// Contract:
//   - logPipelineEvent NEVER throws. A logging failure degrades to console
//     output only. Nothing in this module can block or fail a deal save.
//   - Writes go to public.pipeline_events via the service-role client the
//     route already holds (supabaseAdmin). RLS denies all other access.
//   - The insert is AWAITED by callers inside the request lifecycle so Vercel
//     cannot kill it after the response returns (same reasoning as the CP
//     shadow write). It is fast (single-row insert) and failure-tolerant.
//
// Usage in route:
//   import { logPipelineEvent } from "@/lib/pipelineLogger";
//
//   try {
//     ...normalization...
//     await logPipelineEvent(supabaseAdmin, {
//       stage: "normalization", status: "ok", fingerprint,
//       detail: { keys: Object.keys(normPayload) },
//     });
//   } catch (e) {
//     await logPipelineEvent(supabaseAdmin, {
//       stage: "normalization", status: "failed", fingerprint, error: e,
//     });
//     // save proceeds — normalization stays additive
//   }

import type { SupabaseClient } from "@supabase/supabase-js";

export type PipelineStage =
  | "normalization"
  | "read_market_facts"
  | "classification"
  | "cp_shadow"
  | "canonical"
  | "insert";

export type PipelineStatus = "ok" | "failed" | "skipped";

export interface PipelineEventInput {
  stage: PipelineStage;
  status: PipelineStatus;
  fingerprint?: string | null;
  dealRunId?: string | null;
  /** Pass the caught value directly; class/message are extracted safely. */
  error?: unknown;
  /** Stage-specific context. Keep small; this is telemetry, not storage. */
  detail?: Record<string, unknown> | null;
}

/**
 * Write one structured event to pipeline_events.
 * Never throws. Never blocks the save path on failure.
 */
export async function logPipelineEvent(
  supabaseAdmin: SupabaseClient,
  input: PipelineEventInput
): Promise<void> {
  try {
    const errorClass =
      input.error instanceof Error ? input.error.name
      : input.error !== undefined && input.error !== null ? typeof input.error
      : null;

    const errorMessage =
      input.error instanceof Error ? input.error.message
      : input.error !== undefined && input.error !== null ? String(input.error)
      : null;

    const { error: insertError } = await supabaseAdmin
      .from("pipeline_events")
      .insert({
        stage: input.stage,
        status: input.status,
        fingerprint: input.fingerprint ?? null,
        deal_run_id: input.dealRunId ?? null,
        error_class: errorClass,
        error_message: errorMessage ? errorMessage.slice(0, 2000) : null,
        detail: input.detail ?? null,
      });

    if (insertError) {
      // Logging must not create a new silent failure of its own:
      console.error(
        `[pipeline-events] insert failed (stage=${input.stage}, status=${input.status}):`,
        insertError.message
      );
    }
  } catch (e) {
    // Absolute backstop — the logger itself can never throw upward.
    console.error(
      "[pipeline-events] logger exception:",
      e instanceof Error ? e.message : String(e)
    );
  }
}
