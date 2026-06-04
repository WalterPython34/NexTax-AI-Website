// Persist a processed lead into Supabase (upsert on email; dedupe on source_url).

import { createClient } from "@supabase/supabase-js";
import type { BuyerLead } from "./types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-side only
);

export async function storeLead(lead: BuyerLead, sourceUrl?: string) {
  const row = { ...lead, source_url: sourceUrl };

  // Prefer upsert on email so re-detecting the same person updates rather
  // than duplicates. Falls back to plain insert (the source_url unique index
  // still guards post-level dupes) when there's no email.
  const { data, error } = lead.email
    ? await supabase
        .from("buyer_leads")
        .upsert(row, { onConflict: "email", ignoreDuplicates: false })
        .select()
    : await supabase.from("buyer_leads").insert(row).select();

  if (error) {
    // 23505 = unique violation (already have this post) -> not a real error
    if ((error as any).code === "23505") return null;
    throw error;
  }
  return data?.[0] ?? null;
}

export async function newLeadsSince(hours: number, minScore = 0) {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from("buyer_leads")
    .select("*")
    .gte("created_at", since)
    .gte("buyer_score", minScore)
    .order("buyer_score", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export { supabase };
