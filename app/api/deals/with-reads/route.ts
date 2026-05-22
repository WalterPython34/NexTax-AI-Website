// app/api/deals/with-reads/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow — List deals that have an institutional read (READ-ONLY)
//
// GET /api/deals/with-reads
//   Returns the authenticated user's deals that have at least one CP snapshot
//   (evaluation_snapshots row). Powers the /acquiflow-intel index.
//
//   Auth: Authorization: Bearer <token> (localStorage session), cookie fallback.
//   Owner-scoped via verified user id. No writes, no mutations.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) {
    return NextResponse.json({ success: false, error_kind: "auth_token_missing", reason: "No bearer token." }, { status: 401 });
  }
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ success: false, error_kind: "unauthenticated", reason: "Session token did not verify." }, { status: 401 });
  }

  // Distinct deal_ids that have a CP snapshot, scoped to this user.
  const { data: snapRows, error: snapErr } = await supabaseAdmin
    .from("evaluation_snapshots")
    .select("deal_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (snapErr) {
    return NextResponse.json({ success: false, error_kind: "read_error", reason: snapErr.message }, { status: 200 });
  }

  const dealIds = Array.from(new Set((snapRows ?? []).map((r) => r.deal_id)));
  if (dealIds.length === 0) {
    return NextResponse.json({ success: true, deals: [] });
  }

  // Load minimal deal facts for display (read-only, owner-scoped).
  const { data: dealRows, error: dealErr } = await supabaseAdmin
    .from("deal_runs")
    .select("id, industry, revenue, sde, asking_price, created_at")
    .in("id", dealIds)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (dealErr) {
    return NextResponse.json({ success: false, error_kind: "read_error", reason: dealErr.message }, { status: 200 });
  }

  const deals = (dealRows ?? []).map((d) => ({
    deal_id: d.id,
    industry: d.industry ?? null,
    revenue: d.revenue ?? null,
    sde: d.sde ?? null,
    asking_price: d.asking_price ?? null,
    created_at: d.created_at ?? null,
  }));

  return NextResponse.json({ success: true, deals });
}
