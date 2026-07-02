import { createClient } from "@supabase/supabase-js";
import type { Confidence, VerdictZone } from "./sba-engine";

export interface SbaLead {
  email: string;
  industryKey: string;
  zone: VerdictZone;
  verdictConfidence: Confidence;
  inputConfidence: Confidence;
  deal: {
    reportedSde: number;
    annualRevenue: number;
    askingPrice: number;
    debtPercent: number;
    ratePercent: number;
    termYears: number;
  };
  source?: string;
  createdAt: string;
}

export type PersistResult =
  | { ok: true }
  | { ok: false; reason: string };

// Best-effort lead capture. A DB/config failure is logged but never blocks the
// user's breakdown — they gave an email and should get the value regardless.
export async function persistLead(lead: SbaLead): Promise<PersistResult> {
  // Matches the repo convention used by every other server route
  // (record-deal, bulk-import, benchmark-lookup): NEXT_PUBLIC_SUPABASE_URL +
  // SUPABASE_SERVICE_ROLE_KEY. SUPABASE_URL is accepted as a fallback.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[sba-leads] persistence skipped: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
    return { ok: false, reason: "not_configured" };
  }
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from("sba_leads").insert({
      email: lead.email,
      industry_key: lead.industryKey,
      zone: lead.zone,
      verdict_confidence: lead.verdictConfidence,
      input_confidence: lead.inputConfidence,
      deal: lead.deal,
      source: lead.source ?? null,
      created_at: lead.createdAt,
    });
    if (error) {
      console.error("[sba-leads] insert failed:", error.message);
      return { ok: false, reason: "insert_failed" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[sba-leads] insert threw:", e instanceof Error ? e.message : String(e));
    return { ok: false, reason: "exception" };
  }
}
