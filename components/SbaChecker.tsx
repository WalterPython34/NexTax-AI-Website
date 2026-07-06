// app/api/sba-check/breakdown/route.ts
// Gated add-back breakdown.
//
// Two access modes:
//   1. Email gate (default): valid email required; lead persisted. Unchanged
//      from the original Reddit-facing behavior.
//   2. Partner bypass: whitelisted partner slug (e.g. smbdealhunter) in the
//      body; email optional. No lead is persisted in this mode (no email
//      means no lead row; nothing is fabricated). A best-effort per-IP rate
//      limit protects the LLM-backed kill-line from ungated abuse.
//
// Rate limit honesty: the limiter is in-memory per serverless instance, so it
// is soft protection (each warm instance keeps its own counters, cold starts
// reset them). Adequate at beta scale; move to durable storage (e.g. Upstash)
// if partner traffic grows.

import { runSbaCheck, type SbaCheckRequest } from "@/lib/sba/run-sba-check";
import { createBlsOewsProvider } from "@/lib/sba/providers/bls-oews-provider";
import { verifyReplayToken } from "@/lib/sba/replay-token";
import { buildBreakdown } from "@/lib/sba/breakdown";
import { generateKillLine } from "@/lib/sba/kill-line";
import { buildInterpretationPayload } from "@/lib/sba/sba-engine";
import { persistLead, type SbaLead } from "@/lib/sba/leads-store";

// Mirror the verdict route's copy so both surfaces stay identical.
const DISCLAIMER =
  "This is an underwriting screen, not a lender credit decision. The owner-comp benchmark is a market replacement-cost estimate; lenders may treat owner comp and add-backs differently.";
const API_VERSION = "sba-check.v1";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Partner bypass whitelist ────────────────────────────────────────────────
const PARTNER_SLUGS = new Set(["smbdealhunter"]);

// ─── Best-effort per-IP rate limit for partner (ungated) traffic ─────────────
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 20;                   // runs per IP per window per instance
const rateBuckets = new Map<string, number[]>();

function partnerRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    rateBuckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  // Opportunistic cleanup so the map cannot grow without bound
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return false;
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function validEmail(v: unknown): v is string {
  return typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v.trim());
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, reason: "Request body must be valid JSON." }, { status: 400 });
  }

  const { email, replayToken, source, partner } = (body ?? {}) as {
    email?: unknown;
    replayToken?: unknown;
    source?: unknown;
    partner?: unknown;
  };

  const partnerMode = typeof partner === "string" && PARTNER_SLUGS.has(partner);

  if (partnerMode) {
    if (partnerRateLimited(clientIp(request))) {
      return Response.json(
        { ok: false, reason: "Too many runs from this connection. Try again in a bit." },
        { status: 429 },
      );
    }
  } else if (!validEmail(email)) {
    return Response.json({ ok: false, reason: "Enter a valid email to view the breakdown." }, { status: 400 });
  }

  if (typeof replayToken !== "string" || replayToken.length === 0) {
    return Response.json({ ok: false, reason: "Missing replay token." }, { status: 400 });
  }

  const verified = verifyReplayToken(replayToken);
  if (!verified.ok) {
    return Response.json({ ok: false, reason: verified.reason }, { status: 400 });
  }
  const p = verified.payload;

  const req: SbaCheckRequest = {
    reportedSde: p.reportedSde,
    annualRevenue: p.annualRevenue,
    askingPrice: p.askingPrice,
    debtPercent: p.debtPercent,
    ratePercent: p.ratePercent,
    termYears: p.termYears,
    industryKey: p.industryKey,
    role: p.role,
    medianMargin: p.medianMargin,
    provenance: p.provenance,
    ownerCompOverride: p.ownerCompOverride,
  };

  let result;
  try {
    // Pin the benchmark vintage recorded in the token so the breakdown reproduces
    // the exact numbers shown in the free verdict.
    const provider = createBlsOewsProvider(p.benchmarkVersion);
    result = await runSbaCheck(req, provider);
  } catch {
    return Response.json({ ok: false, reason: "The breakdown could not be computed." }, { status: 500 });
  }

  if (!result.ok) {
    return Response.json({ ok: false, reason: result.reason }, { status: 200 });
  }

  const verdict = result.verdict;
  if (verdict.zone !== p.zone) {
    // Deterministic recompute should match the token's zone; if not, trust the
    // recompute (authoritative) but leave a trace.
    console.warn(`[sba-breakdown] zone drift: token=${p.zone} recomputed=${verdict.zone}`);
  }

  // LLM interprets only; deterministic numbers. Any validation/API failure
  // inside generateKillLine falls back to the per-zone template (never throws).
  const interpretation = await generateKillLine(verdict, buildInterpretationPayload(verdict));
  const breakdown = buildBreakdown(verdict, {
    disclaimer: DISCLAIMER,
    version: API_VERSION,
    interpretation,
  });

  // Lead persistence only in email-gate mode. Partner mode has no email and
  // nothing is fabricated; partner attribution happens at signup instead
  // (partner_attributions table via the buyer dashboard).
  if (!partnerMode) {
    const lead: SbaLead = {
      email: (email as string).trim(),
      industryKey: p.industryKey,
      zone: verdict.zone,
      verdictConfidence: verdict.verdictConfidence.level,
      inputConfidence: verdict.inputConfidence.level,
      deal: {
        reportedSde: p.reportedSde,
        annualRevenue: p.annualRevenue,
        askingPrice: p.askingPrice,
        debtPercent: p.debtPercent,
        ratePercent: p.ratePercent,
        termYears: p.termYears,
      },
      source: typeof source === "string" && source.trim() ? source.trim().slice(0, 120) : undefined,
      createdAt: new Date().toISOString(),
    };
    // Best-effort: never blocks the response.
    await persistLead(lead);
  }

  return Response.json({ ok: true, breakdown }, { status: 200 });
}

export function GET(): Response {
  return Response.json({ ok: false, reason: "Use POST to fetch a breakdown." }, { status: 405 });
}
