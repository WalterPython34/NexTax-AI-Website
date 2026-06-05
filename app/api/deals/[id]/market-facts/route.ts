// app/api/deals/[id]/market-facts/route.ts
// ═════════════════════════════════════════════════════════════════════════════
// AcquiFlow Market Facts Endpoint — Patch D, Phase 1
//
// Single-purpose endpoint that returns the canonical `MarketFacts` shape for
// one deal. Called by the dashboard when the user opens the Compare or
// Underwriting view for a specific deal (per-deal-view, not list-time).
//
// AUTH/OWNERSHIP PATTERN: identical to /api/deals/[id]/committee. The endpoint
// verifies the session JWT, loads the deal_runs row via supabaseAdmin (which
// bypasses RLS), and gates on `deal.user_id === user.id`. Returns 401 / 403 /
// 404 with structured ErrorEnvelope shapes consistent with the rest of the
// /api/deals/[id]/* family.
//
// DATA PATH: delegates entirely to readMarketFacts (canonical). No fabrication,
// no hardcoded tables, no fallback math. When closed-comp data is unavailable
// for the deal's industry, the returned MarketFacts shape carries
// closed_comp_basis: "unavailable" and the caller renders honest absence — the
// same Patch C discipline applied to the workspace PDF and Intel memo.
//
// CALLERS (after Phase 3 ships):
//   - Dashboard's Compare tab (Market Comps + Closed Comps panels)
//   - Dashboard's Underwriting → Market Comps Range band
//
// NOT CALLED BY (deliberately):
//   - /api/deal-intelligence: that route calls readMarketFacts directly
//     server-side (Phase 2 migration). Server routes don't need to bounce
//     through HTTP — direct calls preserve latency.
//   - /api/record-deal: same — direct server-side call (Phase 2).
//   - The committee route: already loads market_facts via direct readMarketFacts
//     call in its own data load.
// ═════════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readMarketFacts } from "@/app/acquiflow-intel/_lib/marketFacts";

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

  // ── Auth: extract + verify session token ─────────────────────────────────
  const token = extractToken(req);
  if (!token) {
    return NextResponse.json<ErrorEnvelope>(
      { success: false, error_kind: "auth_token_missing", reason: "No bearer token." },
      { status: 401 },
    );
  }

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json<ErrorEnvelope>(
      { success: false, error_kind: "unauthenticated", reason: "Session token did not verify." },
      { status: 401 },
    );
  }

  // ── Ownership gate + load deal facts (read-only) ─────────────────────────
  // supabaseAdmin bypasses RLS, so the explicit user_id check is load-bearing.
  // Only select the columns readMarketFacts needs — minimum-data discipline.
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

  // ── Canonical market facts read ──────────────────────────────────────────
  // Wrapped in try/catch so a benchmark-table outage doesn't 500 the endpoint —
  // we'd rather return an empty-facts payload than a hard error. The dashboard
  // renders the same "unavailable" honest-absence treatment for both cases.
  let marketFacts: unknown = null;
  try {
    marketFacts = await readMarketFacts(supabaseAdmin, {
      industry:     deal.industry ?? null,
      revenue:      deal.revenue ?? null,
      sde:          deal.sde ?? null,
      asking_price: deal.asking_price ?? null,
      state:        deal.state ?? null,
    });
  } catch (e) {
    console.warn(`[market-facts] readMarketFacts failed for ${dealId}:`, e instanceof Error ? e.message : String(e));
    // Return empty facts shape rather than 500. The dashboard's honest-absence
    // path handles "unavailable" basis identically whether the cause is no
    // matching benchmark row or a benchmark-table outage.
    marketFacts = {
      deal_multiple: null,
      closed_comp_median: null,
      closed_comp_p25: null,
      closed_comp_p75: null,
      closed_comp_sample_size: null,
      closed_comp_basis: "unavailable",
      deal_vs_closed_position: null,
      listing_multiple: null,
      listing_basis: "unavailable",
      listing_vs_closed_gap_pct: null,
      median_days_on_market: null,
      evidence_depth: { closed_comp_sample_size: null, listing_sample_size: null },
    };
  }

  return NextResponse.json({
    success: true,
    data: {
      deal_id: dealId,
      market_facts: marketFacts,
    },
    generated_at: new Date().toISOString(),
  });
}
