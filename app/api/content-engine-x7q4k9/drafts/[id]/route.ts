// app/api/content-engine-x7q4k9/drafts/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET:   one draft with its full audit trail. Owner-gated.
// PATCH: the ONLY state transitions that exist. Owner-gated.
//   save        {title?, body_md?}  — edit + deterministic re-verify; a
//                                     staged draft that now fails reverts to
//                                     'draft' (cannot remain staged unverified)
//   stage                          — draft → staged, ONLY if numeric check passed
//   approve                        — staged → approved
//   discard                        — draft|staged|approved → discarded
//   mark_posted {posted_url}       — approved → posted_manually. BOOKKEEPING
//                                     ONLY: records that Steve posted by hand.
//                                     No code path posts to Reddit or schedules
//                                     anything, by constitution (§2.4).
// No DELETE. Terminal states (discarded, posted_manually) are immutable.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "../../gate";
import { verifyDraft } from "@/lib/contentEngine/verify";
import type { DraftMode, FactSheet } from "@/lib/contentEngine/types";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireOwner(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  const { data, error } = await gate.supabase.from("content_drafts").select("*").eq("id", id).single();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, draft: data });
}

const TERMINAL = new Set(["discarded", "posted_manually"]);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireOwner(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : null;
  if (!action) return NextResponse.json({ ok: false, error: "action required" }, { status: 400 });

  const { data: draft, error } = await gate.supabase.from("content_drafts").select("*").eq("id", id).single();
  if (error || !draft) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (TERMINAL.has(draft.status)) {
    return NextResponse.json({ ok: false, error: `draft is ${draft.status} (terminal)` }, { status: 409 });
  }

  let patch: Record<string, unknown>;

  if (action === "save") {
    const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : draft.title;
    const body_md = typeof body?.body_md === "string" && body.body_md.trim() ? body.body_md.trim() : draft.body_md;
    const check = verifyDraft({
      title,
      body: body_md,
      sheet: draft.fact_sheet as FactSheet,
      mode: draft.mode as DraftMode,
    });
    patch = {
      title,
      body_md,
      numeric_check: check,
      numeric_check_passed: check.passed,
      // A staged draft that no longer verifies cannot remain staged.
      ...(draft.status === "staged" && !check.passed ? { status: "draft" } : {}),
    };
  } else if (action === "stage") {
    if (draft.status !== "draft") {
      return NextResponse.json({ ok: false, error: `cannot stage from '${draft.status}'` }, { status: 409 });
    }
    if (draft.numeric_check_passed !== true) {
      return NextResponse.json(
        { ok: false, error: "numeric check has not passed — a draft with unverified numbers cannot be staged" },
        { status: 409 },
      );
    }
    patch = { status: "staged", reviewed_at: new Date().toISOString() };
  } else if (action === "approve") {
    if (draft.status !== "staged") {
      return NextResponse.json({ ok: false, error: `cannot approve from '${draft.status}'` }, { status: 409 });
    }
    patch = { status: "approved", reviewed_at: new Date().toISOString() };
  } else if (action === "discard") {
    patch = { status: "discarded", reviewed_at: new Date().toISOString() };
  } else if (action === "mark_posted") {
    if (draft.status !== "approved") {
      return NextResponse.json({ ok: false, error: `cannot mark posted from '${draft.status}'` }, { status: 409 });
    }
    const postedUrl = typeof body?.posted_url === "string" && body.posted_url.trim() ? body.posted_url.trim() : null;
    if (!postedUrl) {
      return NextResponse.json({ ok: false, error: "posted_url required (record of your manual post)" }, { status: 400 });
    }
    patch = { status: "posted_manually", posted_url: postedUrl, posted_at: new Date().toISOString() };
  } else {
    return NextResponse.json({ ok: false, error: `unknown action '${action}'` }, { status: 400 });
  }

  const { data: updated, error: updateError } = await gate.supabase
    .from("content_drafts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (updateError) {
    return NextResponse.json({ ok: false, error: "update_failed", detail: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, draft: updated });
}
