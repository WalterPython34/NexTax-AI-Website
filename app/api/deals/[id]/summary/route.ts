// app/api/deals/[id]/summary/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow API — Deal Operational Summary
//
// Phase 1 (Product Integration) — first route.
//
// THIN TRANSPORT WRAPPER around OperationsEngine.getOperationalSnapshot.
//
// Governed by API-CONTRACT-PRINCIPLES.md. In particular:
//   Principle 1 (Engine Purity), 3 (No Semantic Reshaping),
//   4 (Payload Invariants), 5 (Error Duality), 8 (Manifest Propagation).
//
// ── AUTH MODEL (operational-intelligence API tier) ──────────────────────────
//
//   Identity MUST come from a VERIFIED Supabase session token — never from a
//   caller-supplied query param. The ?uid= pattern is NOT acceptable here.
//
//   This app stores the Supabase session in localStorage (not cookies) and
//   authenticates via Authorization: Bearer headers. So the PRIMARY token
//   source is the Authorization header. A cookie fallback is retained for
//   environments/clients that do send the sb-<ref>-auth-token cookie.
//
//   Flow:
//     1. Read the access token from `Authorization: Bearer <token>`
//        (fallback: sb-<ref>-auth-token cookie, incl. base64/chunked forms).
//     2. Verify it with supabaseAdmin.auth.getUser(token) → verified user.id.
//     3. Ownership gate: confirm deal_runs.id === dealId AND
//        deal_runs.user_id === user.id. If not owned → 403, engine NOT called.
//     4. Only after the gate passes, construct the engine with supabaseAdmin
//        and call getOperationalSnapshot.
//
//   The ownership gate is LOAD-BEARING because supabaseAdmin bypasses RLS.
//   It runs BEFORE the engine is ever constructed.
//
//   CLIENT REQUIREMENT: callers must attach the token explicitly, e.g.
//     const t = JSON.parse(localStorage.getItem('sb-<ref>-auth-token')).access_token
//     fetch(url, { headers: { Authorization: `Bearer ${t}` } })
//   localStorage (unlike cookies) is NOT sent automatically.
//
// Query params:
//   ?snapshot_id=           optional; default = latest snapshot for the deal
//   ?threshold_manifest_id= optional; default = cp10-defaults-v0.1.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createOperationsEngine } from "@/lib/intelligence/operations/operations-engine";
import { PLATFORM_DEFAULT_MANIFEST_ID } from "@/lib/intelligence/operations/threshold-manifest";

export const runtime = "nodejs";

// Service-role client. Used for (a) verifying the session token and (b) the
// engine's CP-9 reads. RLS is bypassed — authorization is enforced by the
// explicit ownership gate below, NOT by RLS.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// The Supabase auth cookie name (project-specific) — used only for the
// cookie FALLBACK path. The app primarily authenticates via Bearer header.
const PRIMARY_AUTH_COOKIE = "sb-sgrosezedxunoicmglpj-auth-token";

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE ENVELOPE TYPES (transport layer — not engine types)
// ─────────────────────────────────────────────────────────────────────────────

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  manifest_id: string;
  generated_at: string;
}

interface ErrorEnvelope {
  success: false;
  error_kind: string;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH TOKEN EXTRACTION
//
// PRIMARY: Authorization: Bearer <token> (matches this app's localStorage +
//   Bearer auth transport).
// FALLBACK: sb-<ref>-auth-token cookie (raw JSON, base64-prefixed, or chunked).
// ─────────────────────────────────────────────────────────────────────────────

function extractAccessToken(req: NextRequest): string | null {
  // ── PRIMARY: Authorization header ──
  const authHeader =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (authHeader) {
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (match && match[1]) {
      const token = match[1].trim();
      if (token.length > 0) return token;
    }
  }

  // ── FALLBACK: cookie (raw / base64 / chunked) ──
  const candidates: string[] = [];
  const primary = req.cookies.get(PRIMARY_AUTH_COOKIE)?.value;
  if (primary) candidates.push(primary);

  const chunks: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const c = req.cookies.get(`${PRIMARY_AUTH_COOKIE}.${i}`)?.value;
    if (!c) break;
    chunks.push(c);
  }
  if (chunks.length > 0) candidates.push(chunks.join(""));

  for (const raw of candidates) {
    const token = parseAccessTokenFromCookieValue(raw);
    if (token) return token;
  }
  return null;
}

function parseAccessTokenFromCookieValue(raw: string): string | null {
  let value = raw;

  if (value.startsWith("base64-")) {
    try {
      const b64 = value.slice("base64-".length);
      value = Buffer.from(b64, "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const first = parsed[0];
      if (typeof first === "string") return first;
      if (first && typeof first.access_token === "string")
        return first.access_token;
    }
    if (parsed && typeof parsed.access_token === "string") {
      return parsed.access_token;
    }
  } catch {
    if (value.split(".").length === 3) return value; // looks like a JWT
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<SuccessEnvelope<unknown> | ErrorEnvelope>> {
  const { id: dealId } = await params;

  // ── Request validation (Principle 5: malformed → 400) ──
  if (!dealId || typeof dealId !== "string" || dealId.length === 0) {
    return NextResponse.json(
      {
        success: false as const,
        error_kind: "invalid_request",
        reason: "Deal id is required in the route path.",
      },
      { status: 400 },
    );
  }

  // ── Query params ──
  const url = new URL(req.url);
  const snapshotIdParam = url.searchParams.get("snapshot_id"); // optional
  const manifestIdParam =
    url.searchParams.get("threshold_manifest_id") ??
    PLATFORM_DEFAULT_MANIFEST_ID;

  // ── 1+2. Extract and VERIFY the session token ──
  const accessToken = extractAccessToken(req);
  if (!accessToken) {
    // Do NOT fall back to ?uid=. Surface what auth signals are present so the
    // client integration can be corrected.
    const hasAuthHeader = Boolean(
      req.headers.get("authorization") ?? req.headers.get("Authorization"),
    );
    const cookieNames = req.cookies.getAll().map((c) => c.name);
    return NextResponse.json(
      {
        success: false as const,
        error_kind: "auth_token_missing",
        reason:
          "No bearer token or parseable Supabase auth cookie found. " +
          "Send 'Authorization: Bearer <access_token>' (token from " +
          "localStorage 'sb-sgrosezedxunoicmglpj-auth-token'.access_token). " +
          "Authorization header present: " +
          hasAuthHeader +
          ". Cookies present: " +
          (cookieNames.length > 0 ? cookieNames.join(", ") : "(none)"),
      },
      { status: 401 },
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json(
      {
        success: false as const,
        error_kind: "unauthenticated",
        reason: "Session token did not verify to a valid user.",
      },
      { status: 401 },
    );
  }

  // ── 3+4+5. OWNERSHIP GATE (load-bearing — supabaseAdmin bypasses RLS) ──
  const { data: dealRow, error: dealError } = await supabaseAdmin
    .from("deal_runs")
    .select("id, user_id")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError) {
    return NextResponse.json(
      {
        success: false as const,
        error_kind: "cp9_read_error",
        reason: "Could not verify deal ownership.",
      },
      { status: 200 },
    );
  }
  if (!dealRow) {
    return NextResponse.json(
      {
        success: false as const,
        error_kind: "deal_not_found",
        reason: "No deal exists with this id.",
      },
      { status: 404 },
    );
  }
  if (dealRow.user_id !== user.id) {
    return NextResponse.json(
      {
        success: false as const,
        error_kind: "rls_access_denied",
        reason: "You do not have access to this deal.",
      },
      { status: 403 },
    );
  }

  // ── 6. Ownership confirmed. Construct the engine and call it. ──
  const engine = createOperationsEngine({ supabase: supabaseAdmin });

  let snapshotId: string;
  if (snapshotIdParam && snapshotIdParam.length > 0) {
    snapshotId = snapshotIdParam;
  } else {
    const latest = await engine.snapshots.getLatestSnapshotForDeal(dealId);
    if (!latest.ok) {
      if (latest.error.code === "snapshot_not_found") {
        return NextResponse.json(
          {
            success: false as const,
            error_kind: "snapshot_not_found",
            reason: "This deal has no evaluation snapshots yet.",
          },
          { status: 404 },
        );
      }
      return NextResponse.json(
        {
          success: false as const,
          error_kind: "cp9_read_error",
          reason: latest.error.message,
        },
        { status: 200 },
      );
    }
    snapshotId = latest.value.snapshot_id;
  }

  const result = await engine.getOperationalSnapshot({
    deal_id: dealId,
    snapshot_id: snapshotId,
    threshold_manifest_id: manifestIdParam,
  });

  if (!result.ok) {
    let status = 200;
    if (result.error.code === "snapshot_not_found") status = 404;
    else if (result.error.code === "manifest_not_found") status = 404;
    else if (result.error.code === "rls_access_denied") status = 403;
    return NextResponse.json(
      {
        success: false as const,
        error_kind: result.error.code,
        reason: result.error.message,
      },
      { status },
    );
  }

  // ── Success path (Principles 3, 4, 8) ──
  const report = result.value;
  const generatedAt =
    report.readiness.provenance.computed_at ??
    report.impact_ranking.provenance.computed_at;
  const manifestId = report.readiness.provenance.threshold_manifest_id;

  const body: SuccessEnvelope<typeof report> = {
    success: true,
    data: report,
    manifest_id: manifestId,
    generated_at: generatedAt,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=15, must-revalidate",
    },
  });
}
