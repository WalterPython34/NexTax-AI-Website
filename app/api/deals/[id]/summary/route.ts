// app/api/deals/[id]/summary/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow API — Deal Operational Summary
//
// Phase 1 (Product Integration) — first route.
//
// THIN TRANSPORT WRAPPER around OperationsEngine.getOperationalSnapshot.
//
// Governed by API-CONTRACT-PRINCIPLES.md. In particular:
//
//   Principle 1 (Engine Purity) — this route instantiates the engine with a
//     Supabase client; the engine has no HTTP knowledge.
//   Principle 3 (No Semantic Reshaping) — `data` carries the engine output
//     STRUCTURALLY UNCHANGED. No flattening, no renaming, no invented counts.
//   Principle 4 (Payload Invariants) — { success, data, manifest_id, generated_at }.
//   Principle 5 (Error Duality) — HTTP codes for transport; payload error_kind
//     for operational state.
//   Principle 8 (Manifest Propagation) — manifest_id is read from the engine's
//     provenance, surfaced in the envelope, never re-derived from the request.
//
// ── AUTH MODEL (operational-intelligence API tier) ──────────────────────────
//
//   Identity MUST come from a VERIFIED Supabase session token — never from a
//   caller-supplied query param. The ?uid= pattern used by some older routes
//   is NOT acceptable here: it lets any caller claim any user's identity by
//   guessing a UUID, which would leak deal intelligence.
//
//   Flow:
//     1. Read the Supabase auth token from the request cookie.
//     2. Verify it with supabaseAdmin.auth.getUser(token) → verified user.id.
//     3. Ownership gate: confirm deal_runs.id === dealId AND
//        deal_runs.user_id === user.id. If not owned → 403, engine NOT called.
//     4. Only after the gate passes, construct the engine with supabaseAdmin
//        and call getOperationalSnapshot.
//
//   The ownership gate is LOAD-BEARING because supabaseAdmin bypasses RLS.
//   It is the only thing standing between a user and another user's deal.
//   It runs BEFORE the engine is ever constructed.
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

// The Supabase auth cookie name is project-specific:
//   sb-<project-ref>-auth-token
// For this project the ref is sgrosezedxunoicmglpj.
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
// Supabase stores the session as a cookie named sb-<ref>-auth-token. Depending
// on supabase-js version the cookie value is either:
//   (a) a raw JSON array/string containing the access_token, or
//   (b) a base64-prefixed JSON blob ("base64-<...>"), or
//   (c) chunked across sb-<ref>-auth-token.0, .1, ... for large sessions.
// We extract the access_token defensively. If we cannot, the caller surfaces
// the available cookie names (see handler) rather than falling back to ?uid=.
// ─────────────────────────────────────────────────────────────────────────────

function extractAccessToken(req: NextRequest): string | null {
  // Try the primary cookie, then chunked variants.
  const candidates: string[] = [];
  const primary = req.cookies.get(PRIMARY_AUTH_COOKIE)?.value;
  if (primary) candidates.push(primary);

  // Chunked cookies: sb-<ref>-auth-token.0, .1, ...
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

  // Supabase may prefix the cookie with "base64-" then base64-encode the JSON.
  if (value.startsWith("base64-")) {
    try {
      const b64 = value.slice("base64-".length);
      value = Buffer.from(b64, "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  // The decoded value is typically a JSON array whose first element is the
  // session object, or a JSON object with access_token directly.
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const first = parsed[0];
      if (typeof first === "string") return first; // some versions store token directly
      if (first && typeof first.access_token === "string")
        return first.access_token;
    }
    if (parsed && typeof parsed.access_token === "string") {
      return parsed.access_token;
    }
  } catch {
    // Not JSON — some setups store the bare access token string.
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
    // Per instruction: do NOT fall back to ?uid=. Surface the cookie names
    // actually present so we can correct the cookie name if needed.
    const presentCookieNames = req.cookies.getAll().map((c) => c.name);
    return NextResponse.json(
      {
        success: false as const,
        error_kind: "auth_token_missing",
        reason:
          "No parseable Supabase auth token found. Expected cookie '" +
          PRIMARY_AUTH_COOKIE +
          "'. Cookies present: " +
          (presentCookieNames.length > 0
            ? presentCookieNames.join(", ")
            : "(none)"),
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
  // This MUST pass before the engine is constructed or called.
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
  // Principle 1: the engine receives a Supabase client; it has no HTTP
  // knowledge. supabaseAdmin is used because the ownership gate above —
  // not RLS — is the authorization boundary for this tier.
  const engine = createOperationsEngine({ supabase: supabaseAdmin });

  // Resolve snapshot_id: explicit param OR latest snapshot for the deal.
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
      // Any other CP-9 read failure: transport succeeded, read could not
      // complete (Principle 5: operational state → 200 + success:false).
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

  // ── The single engine call (Principle 2: composite route wraps ONE method) ──
  const result = await engine.getOperationalSnapshot({
    deal_id: dealId,
    snapshot_id: snapshotId,
    threshold_manifest_id: manifestIdParam,
  });

  // ── Error path (Principle 5: duality) ──
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
  // `data` is the engine output, STRUCTURALLY UNCHANGED. manifest_id and
  // generated_at are read from the engine's provenance, not invented here.
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

  // Snapshot-bound read → short cache only (Principle 7). generated_at inside
  // the payload always reflects compute time, never cache-hit time.
  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=15, must-revalidate",
    },
  });
}
