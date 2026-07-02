// app/api/content-engine-x7q4k9/gate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — owner gate (route layer).
//
// Every content-engine route calls requireOwner() first. The pattern is the
// proven one from app/api/admin/backfill-cp-enrichment: verified Bearer
// token (header, cookie fallback) → supabase.auth.getUser → exact owner id.
// The non-guessable path segment is defense-in-depth only; THIS gate is the
// control. Product users can never reach these routes.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { OWNER_USER_ID } from "@/lib/contentEngine/eligibility";

const PRIMARY_AUTH_COOKIE = "sb-sgrosezedxunoicmglpj-auth-token";

export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function extractBearer(req: NextRequest): string | null {
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

export type GateResult =
  | { ok: true; userId: string; supabase: SupabaseClient }
  | { ok: false; response: NextResponse };

/** 401 without a verified token, 403 for anyone but the platform owner. */
export async function requireOwner(req: NextRequest): Promise<GateResult> {
  const token = extractBearer(req);
  if (!token) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "auth_token_missing" }, { status: 401 }) };
  }
  const supabase = serviceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 }) };
  }
  if (user.id !== OWNER_USER_ID) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "forbidden_owner_only" }, { status: 403 }) };
  }
  return { ok: true, userId: user.id, supabase };
}
