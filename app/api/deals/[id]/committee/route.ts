// app/api/deals/[id]/committee/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow — Committee Read (assembly route)
//
// GET /api/deals/[id]/committee
//   Assembles the institutional "committee read" from THREE independent streams:
//     1. CP summary      — the engine's categorical reasoning (reused verbatim
//                          from /api/deals/[id]/summary; NOT re-implemented)
//     2. Market facts     — raw factual benchmark context (readMarketFacts)
//     3. Narrative        — presentation-layer synthesis (ADDED IN NEXT SUB-STEP;
//                          absent here by design — this version returns structured
//                          data only, so the assembly is testable before prose)
//
// FIREWALL: the three streams are independent. CP produced stream 1 in isolation
// (frozen). Stream 2 is read straight from benchmark tables — it NEVER enters CP.
// Stream 3 (when added) reads 1+2 to write prose but is presentation-only and is
// NEVER written back to evaluation_snapshots. CP never sees market facts.
//
// READ-ONLY. Owner-gated. No writes.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readMarketFacts } from "@/app/acquiflow-intel/_lib/marketFacts";
import { generateCommitteeNarrative } from "@/app/acquiflow-intel/_lib/committeeNarrative";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PRIMARY_AUTH_COOKIE = "sb-sgrosezedxunoicmglpj-auth-token";

function extractToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (h) {
    const m = /^Bearer\s+(.+)$/i.exec(h.trim());
    if (m && m[1]) return m[1].trim();
  }
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

interface ErrorEnvelope { success: false; error_kind: string; reason: string; }

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: dealId } = await params;
  if (!dealId) {
    return NextResponse.json<ErrorEnvelope>(
      { success: false, error_kind: "invalid_request", reason: "Deal id required." },
      { status: 400 },
    );
  }

  const token = extractToken(req);
  if (!token) {
    return NextResponse.json<ErrorEnvelope>(
      { success: false, error_kind: "auth_token_missing", reason: "No bearer token." },
      { status: 401 },
    );
  }

  // Verify the session token → user.
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json<ErrorEnvelope>(
      { success: false, error_kind: "unauthenticated", reason: "Session token did not verify." },
      { status: 401 },
    );
  }

  // Ownership gate + load deal facts (read-only). supabaseAdmin bypasses RLS, so
  // the explicit ownership check is load-bearing.
  const { data: deal, error: dealErr } = await supabaseAdmin
    .from("deal_runs")
    .select("id, user_id, industry, revenue, sde, asking_price, state")
    .eq("id", dealId)
    .maybeSingle();

  if (dealErr) {
    return NextResponse.json<ErrorEnvelope>(
      { success: false, error_kind: "read_error", reason: "Could not load deal." },
      { status: 200 },
    );
  }
  if (!deal) {
    return NextResponse.json<ErrorEnvelope>(
      { success: false, error_kind: "deal_not_found", reason: "No deal at this id." },
      { status: 404 },
    );
  }
  if (deal.user_id !== user.id) {
    return NextResponse.json<ErrorEnvelope>(
      { success: false, error_kind: "rls_access_denied", reason: "You do not have access to this deal." },
      { status: 403 },
    );
  }

  // ── Stream 1: CP summary — reuse the existing summary route VERBATIM ──
  // We call it server-side with the forwarded Bearer token so the engine read,
  // ownership gate, and snapshot resolution are not duplicated. If it fails, we
  // surface its error; the committee read requires a CP snapshot to exist.
  let cp: unknown = null;
  let cpManifest: string | null = null;
  let cpGeneratedAt: string | null = null;
  try {
    const origin = new URL(req.url).origin;
    const summaryRes = await fetch(`${origin}/api/deals/${dealId}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const summaryJson = await summaryRes.json();
    if (!summaryJson.success) {
      return NextResponse.json<ErrorEnvelope>(
        { success: false, error_kind: summaryJson.error_kind ?? "cp_unavailable", reason: summaryJson.reason ?? "CP summary unavailable." },
        { status: summaryRes.status === 404 ? 404 : 200 },
      );
    }
    cp = summaryJson.data;
    cpManifest = summaryJson.manifest_id ?? null;
    cpGeneratedAt = summaryJson.generated_at ?? null;
  } catch (e) {
    return NextResponse.json<ErrorEnvelope>(
      { success: false, error_kind: "cp_fetch_error", reason: e instanceof Error ? e.message : String(e) },
      { status: 200 },
    );
  }

  // ── Stream 2: market facts — raw benchmark context (best-effort) ──
  // Never blocks the committee read; if benchmark tables are sparse, facts come
  // back with "unavailable" bases and the panel renders accordingly.
  let marketFacts: unknown = null;
  try {
    marketFacts = await readMarketFacts(supabaseAdmin, {
      industry: deal.industry ?? null,
      revenue: deal.revenue ?? null,
      sde: deal.sde ?? null,
      asking_price: deal.asking_price ?? null,
      state: deal.state ?? null,
    });
  } catch (e) {
    // Best-effort: market facts are augmentation, not a hard dependency.
    marketFacts = null;
    console.warn(`[committee] market facts failed for ${dealId}:`, e instanceof Error ? e.message : String(e));
  }

  // ── Stream 3: committee narrative — presentation-layer synthesis ──
  // Best-effort: reads streams 1 + 2 to write institutional prose. Returns null
  // on any failure (missing key, API error, guard rejection) so the committee
  // read degrades gracefully to structured data. NEVER written back to CP /
  // evaluation_snapshots — this is display-only.
  let narrative: unknown = null;
  try {
    narrative = await generateCommitteeNarrative(cp, marketFacts, {
      industry: deal.industry ?? null,
      revenue: deal.revenue ?? null,
      sde: deal.sde ?? null,
      asking_price: deal.asking_price ?? null,
    });
  } catch (e) {
    narrative = null;
    console.warn(`[committee] narrative generation failed for ${dealId}:`, e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json({
    success: true,
    data: {
      deal_id: dealId,
      deal_facts: {
        industry: deal.industry ?? null,
        revenue: deal.revenue ?? null,
        sde: deal.sde ?? null,
        asking_price: deal.asking_price ?? null,
      },
      cp,                 // stream 1 — engine reasoning (categorical)
      market_facts: marketFacts, // stream 2 — raw factual context
      narrative,          // stream 3 — added next sub-step
    },
    cp_manifest_id: cpManifest,
    cp_generated_at: cpGeneratedAt,
    generated_at: new Date().toISOString(),
  });
}
