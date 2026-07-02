// app/api/content-engine-x7q4k9/drafts/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET:  list drafts (optional ?status= filter). Owner-gated.
// POST: generate a draft for {deal_run_id, topic_key} via the pipeline and
//       persist it (status='draft'). A draft failing the numeric check still
//       persists — visibly unstageable. Owner-gated. INSERT only.
// The pipeline ends here: there is no post/schedule action anywhere.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "../gate";
import { CANDIDATE_COLUMNS, applyEligibilityFilters } from "@/lib/contentEngine/eligibility";
import { runDraftPipeline } from "@/lib/contentEngine/pipeline";

export async function GET(req: NextRequest) {
  const gate = await requireOwner(req);
  if (!gate.ok) return gate.response;

  const status = new URL(req.url).searchParams.get("status");
  let query = gate.supabase
    .from("content_drafts")
    .select("id, created_at, updated_at, status, mode, topic_key, template_key, target_subreddit, title, numeric_check_passed, posted_url")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: "query_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, drafts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const gate = await requireOwner(req);
  if (!gate.ok) return gate.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "anthropic_key_missing" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const dealRunId = typeof body?.deal_run_id === "string" ? body.deal_run_id : null;
  const topicKey = typeof body?.topic_key === "string" ? body.topic_key : null;
  if (!dealRunId || !topicKey) {
    return NextResponse.json({ ok: false, error: "deal_run_id and topic_key required" }, { status: 400 });
  }

  const { data: rows, error } = await applyEligibilityFilters(
    gate.supabase.from("deal_runs").select(CANDIDATE_COLUMNS.join(",")) as any,
  )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    return NextResponse.json({ ok: false, error: "query_failed", detail: error.message }, { status: 500 });
  }

  const result = await runDraftPipeline({
    rows: rows ?? [],
    targetDealRunId: dealRunId,
    topicKey,
    apiKey,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "pipeline_aborted", stage: result.stage, reason: result.reason }, { status: 422 });
  }

  const { data: inserted, error: insertError } = await gate.supabase
    .from("content_drafts")
    .insert({ ...result.payload, created_by: gate.userId })
    .select("*")
    .single();
  if (insertError) {
    return NextResponse.json({ ok: false, error: "insert_failed", detail: insertError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, draft: inserted });
}
