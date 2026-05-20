// lib/api-client/useDealSummary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Client hook for GET /api/deals/[id]/summary
//
// Phase 1 data-contract consumer. Deliberately faithful to the engine shape —
// imports engine types as the source of truth rather than redefining them.
//
// Per API-CONTRACT-PRINCIPLES.md Principle 3: the client receives the engine
// shape unchanged. Any presentation transformation happens in the COMPONENT
// that uses this hook, never in the hook or the API.
//
// This hook does NOT:
//   - flatten classifications
//   - invent summary scores
//   - reshape the payload
// It surfaces { success, data, manifest_id, generated_at } as-is.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import type { OperationalSnapshotReport } from "@/lib/intelligence/operations/operations-engine";

// ── Response envelope (transport layer — mirrors the route) ──

export interface DealSummarySuccess {
  success: true;
  data: OperationalSnapshotReport;
  manifest_id: string;
  generated_at: string;
}

export interface DealSummaryError {
  success: false;
  error_kind: string;
  reason: string;
}

export type DealSummaryEnvelope = DealSummarySuccess | DealSummaryError;

// ── Hook state ──

export interface UseDealSummaryState {
  loading: boolean;
  /** The engine-shaped report, present only on success. */
  report: OperationalSnapshotReport | null;
  /** Transport metadata, present only on success. */
  manifestId: string | null;
  generatedAt: string | null;
  /** A structured error, present when the read could not be satisfied. */
  error: { kind: string; reason: string } | null;
  /** Underlying HTTP status, for debugging. */
  httpStatus: number | null;
}

export interface UseDealSummaryOptions {
  /** Optional explicit snapshot. Omit to read the deal's latest snapshot. */
  snapshotId?: string;
  /** Optional threshold manifest. Omit for the platform default. */
  thresholdManifestId?: string;
  /** Set false to skip fetching (e.g., when dealId isn't ready). */
  enabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useDealSummary(
  dealId: string | null | undefined,
  options: UseDealSummaryOptions = {},
): UseDealSummaryState {
  const { snapshotId, thresholdManifestId, enabled = true } = options;

  const [state, setState] = useState<UseDealSummaryState>({
    loading: false,
    report: null,
    manifestId: null,
    generatedAt: null,
    error: null,
    httpStatus: null,
  });

  useEffect(() => {
    if (!enabled || !dealId) return;

    let cancelled = false;

    async function run() {
      setState((s) => ({ ...s, loading: true, error: null }));

      // Build the query string from the optional params
      const qs = new URLSearchParams();
      if (snapshotId) qs.set("snapshot_id", snapshotId);
      if (thresholdManifestId)
        qs.set("threshold_manifest_id", thresholdManifestId);
      const query = qs.toString();
      const urlStr =
        `/api/deals/${encodeURIComponent(dealId as string)}/summary` +
        (query ? `?${query}` : "");

      try {
        const res = await fetch(urlStr, { method: "GET" });
        const httpStatus = res.status;
        const body = (await res.json()) as DealSummaryEnvelope;

        if (cancelled) return;

        if (body.success) {
          setState({
            loading: false,
            report: body.data,
            manifestId: body.manifest_id,
            generatedAt: body.generated_at,
            error: null,
            httpStatus,
          });
        } else {
          setState({
            loading: false,
            report: null,
            manifestId: null,
            generatedAt: null,
            error: { kind: body.error_kind, reason: body.reason },
            httpStatus,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setState({
          loading: false,
          report: null,
          manifestId: null,
          generatedAt: null,
          error: {
            kind: "network_error",
            reason: err instanceof Error ? err.message : "Request failed.",
          },
          httpStatus: null,
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [dealId, snapshotId, thresholdManifestId, enabled]);

  return state;
}
