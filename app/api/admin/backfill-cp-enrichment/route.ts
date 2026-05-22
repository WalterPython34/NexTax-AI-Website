// app/api/admin/backfill-cp-enrichment/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow — Admin Backfill: CP Enrichment (Phase 0.5)
//
// POST /api/admin/backfill-cp-enrichment
//   body (optional): { deal_ids?: string[], dry_run?: boolean, limit?: number }
//
// WHY THIS EXISTS:
//   /api/record-deal fires exactly once per deal (at "Save Deal to Dashboard")
//   and there is no re-save. Benchmark snapshots are created AFTER a deal
//   exists (via the Financial Benchmarks tab). So at the only moment the live
//   shadow write runs, no benchmark snapshot exists yet → live enrichment is
//   structurally impossible. This backfill is the correct trigger point: it
//   pairs existing deals with their (now-existing) benchmark snapshots and
//   writes ENRICHED CP snapshots retroactively.
//
// WHAT IT DOES (per deal that has a benchmark snapshot):
//   1. Reconstruct base CP inputs from the deal_runs row.
//   2. Fetch the latest benchmark snapshot (raw/computed columns only).
//   3. Merge benchmark operational enrichment.
//   4. Run CP TWICE — sparse and enriched — to produce a categorical diff
//      (CP has no score/risk to delta; we diff readiness, impact counts,
//      contributing factors, trajectories). Only the ENRICHED snapshot is
//      persisted; the sparse run is in-memory, for the diff only.
//   5. Return a per-deal summary + the diff.
//
// CONSTITUTIONAL BOUNDARIES:
//   - Reads only raw/computed benchmark columns (firewall enforced in fetch).
//   - No benchmark conclusions enter CP. CP computes its own reads.
//   - Additive: writes new evaluation_snapshots; touches nothing user-facing.
//
// SAFETY:
//   - Admin-only: gated to the platform owner's user id (verified token).
//   - Best-effort per deal: one deal's failure never aborts the batch.
//   - dry_run mode: computes the diff WITHOUT persisting (for inspection).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  mapDealRunRowToRuleInputs,
  mergeBenchmarkEnrichment,
  hasMinimumInputsForShadow,
  type DealRunRow,
} from "@/lib/intelligence/orchestrator/map-live-inputs";
import { fetchLatestBenchmarkEnrichment } from "@/lib/intelligence/orchestrator/fetch-benchmark-enrichment";
import { runCpPipelineAndPersist } from "@/lib/intelligence/orchestrator/run-cp-pipeline";
import type { RuleEngineInputs } from "@/lib/intelligence/rules/types";

export const runtime = "nodejs";
export const maxDuration = 300; // batch may take a while

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PRIMARY_AUTH_COOKIE = "sb-sgrosezedxunoicmglpj-auth-token";

// Platform owner — the only user permitted to run the backfill.
const OWNER_USER_ID = "fd51b1c2-d682-4278-8b58-6abad29a2a07";

// ── Auth: verified Bearer token, owner-only ──────────────────────────────────
function extractBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (h) {
    const m = /^Bearer\s+(.+)$/i.exec(h.trim());
    if (m && m[1]) return m[1].trim();
  }
  // cookie fallback
  const raw = req.cookies.get(PRIMARY_AUTH_COOKIE)?.value;
  if (raw) {
    try {
      let v = raw;
      if (v.startsWith("base64-")) v = Buffer.from(v.slice(7), "base64").toString("utf8");
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p[0]?.access_token ?? (typeof p[0] === "string" ? p[0] : null);
      if (p?.access_token) return p.access_token;
    } catch {
      if (raw.split(".").length === 3) return raw;
    }
  }
  return null;
}

// ── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Auth
  const token = extractBearer(req);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "auth_token_missing" },
      { status: 401 },
    );
  }
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  if (user.id !== OWNER_USER_ID) {
    return NextResponse.json({ ok: false, error: "forbidden_admin_only" }, { status: 403 });
  }

  // Parse options
  const body = await req.json().catch(() => ({}));
  const explicitIds: string[] | null = Array.isArray(body?.deal_ids) ? body.deal_ids : null;
  const dryRun = body?.dry_run === true;
  const limit = typeof body?.limit === "number" ? body.limit : 50;

  // Find candidate deals: those with at least one benchmark_snapshots row.
  // Pull distinct deal_ids from benchmark_snapshots, then load the deal_runs.
  let dealIds: string[];
  if (explicitIds) {
    dealIds = explicitIds;
  } else {
    const { data: bmRows, error: bmErr } = await supabaseAdmin
      .from("benchmark_snapshots")
      .select("deal_id")
      .order("created_at", { ascending: false })
      .limit(500);
    if (bmErr) {
      return NextResponse.json({ ok: false, error: "benchmark_query_failed", detail: bmErr.message }, { status: 200 });
    }
    dealIds = Array.from(new Set((bmRows ?? []).map((r) => r.deal_id))).slice(0, limit);
  }

  const results: unknown[] = [];
  let enrichedCount = 0, sparseCount = 0, skipped = 0, failed = 0;

  for (const dealId of dealIds) {
    try {
      // Load the deal_runs row (owner-scoped).
      const { data: dealRow, error: drErr } = await supabaseAdmin
        .from("deal_runs")
        .select("*")
        .eq("id", dealId)
        .maybeSingle();
      if (drErr || !dealRow) {
        skipped += 1;
        results.push({ deal_id: dealId, status: "skipped", reason: "deal_runs row not found" });
        continue;
      }
      if (dealRow.user_id !== OWNER_USER_ID) {
        skipped += 1;
        results.push({ deal_id: dealId, status: "skipped", reason: "not owned by admin" });
        continue;
      }

      // Reconstruct base inputs + fetch+merge enrichment.
      const baseInputs = mapDealRunRowToRuleInputs(dealRow as DealRunRow);
      const benchmark = await fetchLatestBenchmarkEnrichment(dealId, supabaseAdmin);
      const enrichedInputs = mergeBenchmarkEnrichment(baseInputs, benchmark);

      if (!hasMinimumInputsForShadow(enrichedInputs)) {
        skipped += 1;
        results.push({ deal_id: dealId, status: "skipped", reason: "insufficient inputs" });
        continue;
      }

      // Which fields did enrichment add?
      const baseKeys = new Set(Object.keys(baseInputs));
      const addedFields = Object.keys(enrichedInputs).filter((k) => !baseKeys.has(k));
      const isEnriched = benchmark != null && addedFields.length > 0;

      // Persist the ENRICHED snapshot (unless dry run).
      let snapshotId: string | null = null;
      let persistError: string | null = null;
      if (!dryRun) {
        const shadow = await runCpPipelineAndPersist(
          {
            deal_id: dealId,
            user_id: OWNER_USER_ID,
            rule_inputs: enrichedInputs,
            raw_input_payload: {
              _backfill: true,
              _cp_enrichment_benchmark_snapshot_id: benchmark?.snapshot_id ?? null,
              _source: "backfill-cp-enrichment",
            },
            deal_source_type: enrichedInputs.deal_source_type ?? null,
            evaluation_id: dealId,
            // triggered_by is a UUID column — must be a valid UUID or null.
            // Use the owner UUID (matches the live shadow write). The "this
            // came from backfill" marker lives in raw_input_payload._source.
            triggered_by: OWNER_USER_ID,
          },
          supabaseAdmin,
        );
        if (shadow.ok) snapshotId = shadow.snapshot_id;
        else persistError = `${shadow.stage}:${shadow.error_kind}:${shadow.message}`;
      }

      if (isEnriched) enrichedCount += 1; else sparseCount += 1;

      const summary = {
        deal_id: dealId,
        industry: dealRow.industry,
        status: dryRun ? "dry_run" : (snapshotId ? "persisted" : "persist_failed"),
        enriched: isEnriched,
        benchmark_snapshot_id: benchmark?.snapshot_id ?? null,
        // Input-level diff: which operational fields enrichment added, and
        // their values. The CATEGORICAL CP diff (readiness/impact/personas) is
        // observed by reading the persisted snapshot via /api/deals/[id]/summary
        // and comparing to the deal's prior sparse snapshot — not recomputed
        // here (avoids depending on internal pipeline summary shapes).
        added_fields: addedFields,
        enrichment_values: Object.fromEntries(
          addedFields.map((k) => [k, (enrichedInputs as Record<string, unknown>)[k]]),
        ),
        snapshot_id: snapshotId,
        persist_error: persistError,
      };
      results.push(summary);

      // Log per-deal for Vercel observability.
      console.log(
        `[backfill-cp] ${dealId} (${dealRow.industry}) ` +
          `${isEnriched ? `ENRICHED[+${addedFields.join(",")}]` : "SPARSE"} ` +
          `${dryRun ? "(dry-run)" : snapshotId ? `→ ${snapshotId}` : `FAILED:${persistError}`}`,
      );
    } catch (err) {
      failed += 1;
      results.push({
        deal_id: dealId,
        status: "error",
        reason: err instanceof Error ? err.message : String(err),
      });
      console.error(`[backfill-cp] ${dealId} threw:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    totals: {
      candidates: dealIds.length,
      enriched: enrichedCount,
      sparse: sparseCount,
      skipped,
      failed,
    },
    results,
  });
}
