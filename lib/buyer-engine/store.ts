// Persist a processed lead into Supabase (upsert on email; dedupe on source_url).
//
// The client is created LAZILY on first use — not at import time — so that
// `next build` page-data collection doesn't instantiate it before env vars
// exist. Creating it at the top level throws "supabaseUrl is required" at build.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { BuyerLead } from "./types";

let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-side only
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    _client = createClient(url, key);
  }
  return _client;
}

// Backward-compatible lazy proxy: existing `supabase.from(...)` calls work
// unchanged, but the real client is only built on first property access
// (i.e. at request time, never at build time).
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = client() as any;
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});

export async function storeLead(lead: BuyerLead, sourceUrl?: string) {
  const row = { ...lead, source_url: sourceUrl };
  const { data, error } = lead.email
    ? await supabase
        .from("buyer_leads")
        .upsert(row, { onConflict: "email", ignoreDuplicates: false })
        .select()
    : await supabase.from("buyer_leads").insert(row).select();

  if (error) {
    if ((error as any).code === "23505") return null; // dupe post -> fine
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
