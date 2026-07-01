import { createHmac, timingSafeEqual } from "node:crypto";
import type { InputProvenance, VerdictZone } from "./sba-engine";
import type { OwnerRole } from "./owner-comp-provider";

// Signed on the free verdict response; verified + recomputed on the breakdown call.
// Carries the full normalized deal plus the benchmark vintage, so the gated
// breakdown always reproduces the exact numbers shown in the free verdict.
export interface ReplayTokenPayload {
  reportedSde: number;
  annualRevenue: number;
  askingPrice: number;
  debtPercent: number;
  ratePercent: number;
  termYears: number;
  industryKey: string;
  role?: OwnerRole;
  medianMargin: number | null;
  ownerCompOverride?: number;
  provenance?: InputProvenance;
  benchmarkVersion: number;
  zone: VerdictZone;
  iat: number;
}

// Optional soft ceiling; tokens older than this are rejected on verify.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function secret(): string {
  const s = process.env.SBA_REPLAY_SECRET;
  if (!s) throw new Error("SBA_REPLAY_SECRET is not set");
  return s;
}

function sign(body: string): string {
  return b64url(createHmac("sha256", secret()).update(body).digest());
}

/** Returns a signed token, or null if signing is not configured (verdict still returns). */
export function signReplayToken(payload: ReplayTokenPayload): string | null {
  try {
    const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
    return `${body}.${sign(body)}`;
  } catch {
    return null;
  }
}

export type VerifyResult =
  | { ok: true; payload: ReplayTokenPayload }
  | { ok: false; reason: string };

export function verifyReplayToken(token: string): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "Malformed token." };
  const [body, mac] = parts;

  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return { ok: false, reason: "Token verification is not configured." };
  }

  const a = fromB64url(mac);
  const b = fromB64url(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "Invalid token signature." };
  }

  let payload: ReplayTokenPayload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8"));
  } catch {
    return { ok: false, reason: "Unreadable token payload." };
  }

  if (typeof payload.iat !== "number" || Date.now() / 1000 - payload.iat > MAX_AGE_SECONDS) {
    return { ok: false, reason: "Token has expired." };
  }

  return { ok: true, payload };
}
