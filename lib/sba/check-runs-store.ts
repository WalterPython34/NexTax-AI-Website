// lib/sba/check-runs-store.ts
// Fire-and-forget persistence for SBA Deal Check runs into sba_check_runs.
// Service-role only; RLS on the table has no policies, so this is the single
// write path. Never throws and never blocks the response.
//
// ENV ASSUMPTION (flagged): uses NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY. If leads-store.ts uses different variable names
// for the same values, align these two lines with it and nothing else changes.

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import type { SbaVerdict } from "@/lib/sba/sba-engine";

export interface SbaCheckRunRecord {
  industryKey: string;
  annualRevenue: number;
  reportedSde: number;
  askingPrice: number;
  debtPercent?: number;
  ratePercent?: number;
  termYears?: number;
  role?: string;
  verdict: SbaVerdict;
  benchmarkVersion?: string;
  source?: string;
  partnerRef?: string | null;
  ip?: string | null;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** SHA-256 of the client IP: pseudonymous dedupe key, never the raw address. */
function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  return createHash("sha256").update(ip).digest("hex");
}

export async function persistCheckRun(rec: SbaCheckRunRecord): Promise<void> {
  try {
    const supabase = serviceClient();
    if (!supabase) {
      console.warn("[sba-check-runs] missing supabase env; run not persisted");
      return;
    }
    const { error } = await supabase.from("sba_check_runs").insert({
      industry_key: rec.industryKey,
      annual_revenue: rec.annualRevenue,
      reported_sde: rec.reportedSde,
      asking_price: rec.askingPrice,
      debt_percent: rec.debtPercent ?? null,
      rate_percent: rec.ratePercent ?? null,
      term_years: rec.termYears ?? null,
      owner_role: rec.role ?? null,
      zone: rec.verdict.zone,
      verdict_confidence: rec.verdict.verdictConfidence?.level ?? null,
      input_confidence: rec.verdict.inputConfidence?.level ?? null,
      buyer_case_dscr: rec.verdict.buyerCaseDscr ?? null,
      lender_dscr_low: rec.verdict.lenderDscrLow ?? null,
      lender_dscr_high: rec.verdict.lenderDscrHigh ?? null,
      benchmark_version: rec.benchmarkVersion ?? null,
      source: rec.source ?? null,
      partner_ref: rec.partnerRef ?? null,
      ip_hash: hashIp(rec.ip),
    });
    if (error) console.warn("[sba-check-runs] insert failed:", error.message);
  } catch (e) {
    console.warn("[sba-check-runs] persist error:", e);
  }
}
