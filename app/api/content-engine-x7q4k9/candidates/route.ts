// app/api/content-engine-x7q4k9/candidates/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET: eligible public-marketplace deals that can fuel a draft, with their
// topic triggers and mode decision, ranked by the metrics prior (heaviest
// triggered template weight first). Owner-gated. Read-only.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "../gate";
import {
  CANDIDATE_COLUMNS,
  applyEligibilityFilters,
  detectTopicTriggers,
  evaluateEligibility,
} from "@/lib/contentEngine/eligibility";
import { decideDraftMode, sanitizeDealFacts } from "@/lib/contentEngine/anonymize";
import { selectTemplates } from "@/lib/contentEngine/templates";

export async function GET(req: NextRequest) {
  const gate = await requireOwner(req);
  if (!gate.ok) return gate.response;

  const { data: rows, error } = await applyEligibilityFilters(
    gate.supabase.from("deal_runs").select(CANDIDATE_COLUMNS.join(",") + ",created_at") as any,
  )
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) {
    return NextResponse.json({ ok: false, error: "query_failed", detail: error.message }, { status: 500 });
  }

  // DB filter narrows; the pure predicate decides (defense in depth).
  const eligibleRows = (rows ?? []).filter((r: Record<string, unknown>) => evaluateEligibility(r).eligible);
  const pool = eligibleRows.map((r: Record<string, unknown>) => sanitizeDealFacts(r));

  const candidates = eligibleRows
    .map((r: Record<string, unknown>) => {
      const triggers = detectTopicTriggers(r);
      if (triggers.length === 0) return null;
      const deal = sanitizeDealFacts(r);
      const mode = decideDraftMode(deal, pool);
      if (mode.decision === "suppress") return null;
      const weight = Math.max(
        ...triggers.map((t) => selectTemplates(t.topic_key, mode.decision)[0]?.weight ?? 0),
      );
      return {
        deal_run_id: deal.deal_run_id,
        industry: deal.industry,
        created_at: r.created_at ?? null,
        // Internal owner-only surface: raw figures aid review here; they
        // never reach a draft except through the anonymization pipeline.
        revenue: deal.revenue,
        reported_sde: deal.reported_sde,
        usable_sde: deal.usable_sde,
        asking_price: deal.asking_price,
        dscr: deal.dscr,
        triggers,
        mode: mode.decision,
        mode_reasons: mode.reasons,
        prior_weight: weight,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.prior_weight - a.prior_weight)
    .slice(0, 50);

  return NextResponse.json({
    ok: true,
    total_from_db: rows?.length ?? 0,
    eligible: eligibleRows.length,
    candidates,
  });
}
