// app/api/reports-v2/[dealId]/route.ts
// REACT-PDF SPIKE ENDPOINT — parallel to the legacy /api/reports pipeline.
// Legacy generator untouched. Delete or gate this route before any public use.
//
// SETUP (both required, or this fails the way the old attempts did):
//   1. npm install @react-pdf/renderer
//   2. next.config: add top-level  serverExternalPackages: ["@react-pdf/renderer"]
//      (Next 15 — prevents webpack from bundling the renderer; the classic
//      silent-failure cause on this stack.)
//
// Guard: if REPORTS_V2_SPIKE_KEY is set in env, requests must include ?key=<value>.

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { DealReportV2, type SpikeDeal } from "@/lib/pdf-v2/DealReportV2";
import React from "react";

export const runtime = "nodejs";           // react-pdf requires Node, not edge
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await ctx.params;

  const guard = process.env.REPORTS_V2_SPIKE_KEY;
  if (guard && req.nextUrl.searchParams.get("key") !== guard) {
    return new Response("Not found", { status: 404 });
  }

  const { data: deal, error } = await supabaseAdmin
    .from("deal_runs")
    .select(
      "id, industry, city, state, revenue, sde, asking_price, dscr, " +
      "overall_score, verdict, confidence_grade, divergence_band"
    )
    .eq("id", dealId)
    .single();

  if (error || !deal) {
    return new Response(`Deal not found: ${error?.message ?? dealId}`, { status: 404 });
  }

  try {
    const buffer = await renderToBuffer(
      React.createElement(DealReportV2, { deal: deal as SpikeDeal })
    );
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="AcquiFlow-v2-${dealId.slice(0, 8)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    // Fail LOUD — the whole point of the spike is a real error if the chain breaks.
    return new Response(
      `render failed: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
      { status: 500 }
    );
  }
}
