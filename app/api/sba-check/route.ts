// app/api/sba-check/route.ts
// SBA Deal Check verdict route.
//
// 7.6.26 addition: every successful run is persisted to sba_check_runs
// (fire-and-forget, never blocks or fails the response). Attribution is
// derived server-side from the same-origin Referer path: runs from
// /smbdealhunter carry partner_ref, everything else records as sba-checker.
// Referer note: same-origin fetches send the full URL under the default
// Referrer-Policy, so this is reliable for our own pages; if the header is
// ever absent the run persists with source "sba-checker" and no partner_ref.

import { runSbaCheck, type SbaCheckRequest } from "@/lib/sba/run-sba-check";
import { blsOewsProvider } from "@/lib/sba/providers/bls-oews-provider";
import type { OwnerRole } from "@/lib/sba/owner-comp-provider";
import { signReplayToken } from "@/lib/sba/replay-token";
import { CURRENT_BENCHMARK_VERSION } from "@/lib/sba/ownerCompBenchmarks/index";
import type { InputProvenance, InputSource } from "@/lib/sba/sba-engine";
import { persistCheckRun } from "@/lib/sba/check-runs-store";

const OWNER_COMP_LABEL = "benchmark owner replacement cost";
const DISCLAIMER =
  "This is an underwriting screen, not a lender credit decision. The owner-comp benchmark is a market replacement-cost estimate; lenders may treat owner comp and add-backs differently.";
const API_VERSION = "sba-check.v1";

const OWNER_ROLES: OwnerRole[] = ["operator", "operator_technical", "passive"];
const INPUT_SOURCES: InputSource[] = ["stated", "extracted", "estimated", "inferred"];

// Partner routes whose runs carry attribution (path segment -> partner_ref)
const PARTNER_PATHS: Record<string, string> = {
  "/smbdealhunter": "smbdealhunter",
};

type ParseResult =
  | { ok: true; request: SbaCheckRequest }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseProvenance(value: unknown, errors: string[]): InputProvenance | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    errors.push("provenance must be an object with revenue, sde, and industry.");
    return undefined;
  }
  const fields: (keyof InputProvenance)[] = ["revenue", "sde", "industry"];
  const out = {} as InputProvenance;
  for (const field of fields) {
    const source = value[field];
    if (!INPUT_SOURCES.includes(source as InputSource)) {
      errors.push(`provenance.${field} must be one of ${INPUT_SOURCES.join(", ")}.`);
    } else {
      out[field] = source as InputSource;
    }
  }
  return out;
}

function parseRequest(body: unknown): ParseResult {
  if (!isRecord(body)) {
    return { ok: false, reason: "Request body must be a JSON object." };
  }

  const errors: string[] = [];
  const numericFields = [
    "reportedSde",
    "annualRevenue",
    "askingPrice",
    "debtPercent",
    "ratePercent",
    "termYears",
  ] as const;

  const numbers = {} as Record<(typeof numericFields)[number], number>;
  for (const field of numericFields) {
    if (!isFiniteNumber(body[field])) {
      errors.push(`${field} must be a finite number.`);
    } else {
      numbers[field] = body[field] as number;
    }
  }

  if (typeof body.industryKey !== "string" || body.industryKey.trim() === "") {
    errors.push("industryKey must be a non-empty string.");
  }

  let role: OwnerRole | undefined;
  if (body.role !== undefined) {
    if (!OWNER_ROLES.includes(body.role as OwnerRole)) {
      errors.push(`role must be one of ${OWNER_ROLES.join(", ")}.`);
    } else {
      role = body.role as OwnerRole;
    }
  }

  let medianMargin: number | null = null;
  if (body.medianMargin !== undefined && body.medianMargin !== null) {
    if (!isFiniteNumber(body.medianMargin)) {
      errors.push("medianMargin must be a number or null.");
    } else {
      medianMargin = body.medianMargin;
    }
  }

  let ownerCompOverride: number | undefined;
  if (body.ownerCompOverride !== undefined) {
    if (!isFiniteNumber(body.ownerCompOverride)) {
      errors.push("ownerCompOverride must be a finite number.");
    } else {
      ownerCompOverride = body.ownerCompOverride;
    }
  }

  const provenance = parseProvenance(body.provenance, errors);

  if (errors.length > 0) {
    return { ok: false, reason: `Invalid request: ${errors.join(" ")}` };
  }

  return {
    ok: true,
    request: {
      reportedSde: numbers.reportedSde,
      annualRevenue: numbers.annualRevenue,
      askingPrice: numbers.askingPrice,
      debtPercent: numbers.debtPercent,
      ratePercent: numbers.ratePercent,
      termYears: numbers.termYears,
      industryKey: (body.industryKey as string).trim(),
      role,
      medianMargin,
      provenance,
      ownerCompOverride,
    },
  };
}

function attributionFromReferer(request: Request): { source: string; partnerRef: string | null } {
  try {
    const referer = request.headers.get("referer");
    if (referer) {
      const path = new URL(referer).pathname;
      for (const [prefix, slug] of Object.entries(PARTNER_PATHS)) {
        if (path === prefix || path.startsWith(prefix + "/")) {
          return { source: `partner:${slug}`, partnerRef: slug };
        }
      }
    }
  } catch { /* fall through */ }
  return { source: "sba-checker", partnerRef: null };
}

function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, reason: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = parseRequest(body);
  if (!parsed.ok) {
    return Response.json({ ok: false, reason: parsed.reason }, { status: 400 });
  }

  const provider = blsOewsProvider;

  try {
    const result = await runSbaCheck(parsed.request, provider);
    if (!result.ok) {
      return Response.json({ ok: false, reason: result.reason }, { status: 200 });
    }
    const replayToken = signReplayToken({
      reportedSde: parsed.request.reportedSde,
      annualRevenue: parsed.request.annualRevenue,
      askingPrice: parsed.request.askingPrice,
      debtPercent: parsed.request.debtPercent,
      ratePercent: parsed.request.ratePercent,
      termYears: parsed.request.termYears,
      industryKey: parsed.request.industryKey,
      role: parsed.request.role,
      medianMargin: parsed.request.medianMargin,
      ownerCompOverride: parsed.request.ownerCompOverride,
      provenance: parsed.request.provenance,
      benchmarkVersion: CURRENT_BENCHMARK_VERSION,
      zone: result.verdict.zone,
      iat: Math.floor(Date.now() / 1000),
    });

    // Top-of-funnel record — separate table from deal_runs by design.
    // Fire-and-forget: persistence failures never affect the response.
    const attribution = attributionFromReferer(request);
    void persistCheckRun({
      industryKey: parsed.request.industryKey,
      annualRevenue: parsed.request.annualRevenue,
      reportedSde: parsed.request.reportedSde,
      askingPrice: parsed.request.askingPrice,
      debtPercent: parsed.request.debtPercent,
      ratePercent: parsed.request.ratePercent,
      termYears: parsed.request.termYears,
      role: parsed.request.role,
      verdict: result.verdict,
      benchmarkVersion: CURRENT_BENCHMARK_VERSION,
      source: attribution.source,
      partnerRef: attribution.partnerRef,
      ip: clientIp(request),
    });

    return Response.json(
      {
        ok: true,
        verdict: result.verdict,
        replayToken,
        meta: {
          provider: provider.id,
          providerLabel: provider.label,
          ownerCompLabel: OWNER_COMP_LABEL,
          disclaimer: DISCLAIMER,
          version: API_VERSION,
        },
      },
      { status: 200 },
    );
  } catch {
    return Response.json(
      { ok: false, reason: "The check could not be completed." },
      { status: 500 },
    );
  }
}

export function GET(): Response {
  return Response.json(
    { ok: false, reason: "Use POST to run an SBA check." },
    { status: 405 },
  );
}
