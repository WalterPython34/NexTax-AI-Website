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

  const { email, replayToken, source } = (body ?? {}) as {
    email?: unknown;
    replayToken?: unknown;
    source?: unknown;
  };

  if (!validEmail(email)) {
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

  return Response.json({ ok: true, breakdown }, { status: 200 });
}

export function GET(): Response {
  return Response.json({ ok: false, reason: "Use POST to fetch a breakdown." }, { status: 405 });
}
