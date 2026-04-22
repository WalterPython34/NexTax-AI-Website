// lib/dealOutcomes.ts
//
// Deal Outcome tracking — proprietary data layer.
// Every outcome recorded is training data that no competitor has.
//
// Data model (in Supabase):
//   deal_outcomes (
//     id uuid primary key default gen_random_uuid(),
//     deal_run_id uuid references deal_runs(id) on delete cascade,
//     user_id uuid not null references auth.users(id),
//     outcome text not null check (outcome in ('closed','in_loi','walked','stale')),
//     final_price bigint,
//     financing_types text[] default '{}',
//     notes text,
//     created_at timestamptz default now(),
//     updated_at timestamptz default now()
//   )
//   -- index for fast user-level lookup
//   create index idx_deal_outcomes_user on deal_outcomes(user_id);
//   create index idx_deal_outcomes_deal on deal_outcomes(deal_run_id);
//   -- one outcome per deal_run (users can update, not duplicate)
//   create unique index idx_deal_outcomes_unique on deal_outcomes(deal_run_id);

import { supabase } from "@/lib/supabase";

export type DealOutcomeStatus = "closed" | "in_loi" | "walked" | "stale";

export type FinancingType =
  | "sba_7a"
  | "conventional"
  | "seller_note"
  | "all_cash"
  | "sba_plus_seller"
  | "sba_plus_conventional";

export interface DealOutcome {
  id?:              string;
  deal_run_id:      string;
  user_id:          string;
  outcome:          DealOutcomeStatus;
  final_price:      number | null;
  financing_types:  FinancingType[];
  notes:            string | null;
  created_at?:      string;
  updated_at?:      string;
}

export const FINANCING_LABELS: Record<FinancingType, string> = {
  sba_7a:                 "SBA 7(a)",
  conventional:           "Conventional",
  seller_note:            "Seller note",
  all_cash:               "All cash",
  sba_plus_seller:        "SBA + seller note",
  sba_plus_conventional:  "SBA + conventional",
};

export const OUTCOME_LABELS: Record<DealOutcomeStatus, string> = {
  closed:    "Closed",
  in_loi:    "In LOI",
  walked:    "Walked away",
  stale:     "Stale / expired",
};

export const OUTCOME_COLORS: Record<DealOutcomeStatus, { text: string; bg: string; border: string }> = {
  closed:  { text: "#10B981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)"  },
  in_loi:  { text: "#60A5FA", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.25)"  },
  walked:  { text: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)"  },
  stale:   { text: "#94A3B8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

/** Fetch outcome for a single deal (null if not recorded yet) */
export async function fetchOutcome(deal_run_id: string): Promise<DealOutcome | null> {
  const { data, error } = await supabase
    .from("deal_outcomes")
    .select("*")
    .eq("deal_run_id", deal_run_id)
    .maybeSingle();
  if (error || !data) return null;
  return data as DealOutcome;
}

/** Fetch all outcomes for the current user (for the deal list) */
export async function fetchOutcomesForUser(user_id: string): Promise<Map<string, DealOutcome>> {
  const { data, error } = await supabase
    .from("deal_outcomes")
    .select("*")
    .eq("user_id", user_id);
  if (error || !data) return new Map();
  const map = new Map<string, DealOutcome>();
  for (const row of data) map.set(row.deal_run_id, row as DealOutcome);
  return map;
}

/** Upsert outcome (insert if new, update if existing) */
export async function saveOutcome(outcome: Omit<DealOutcome, "id" | "created_at" | "updated_at">): Promise<DealOutcome | null> {
  const { data, error } = await supabase
    .from("deal_outcomes")
    .upsert(
      { ...outcome, updated_at: new Date().toISOString() },
      { onConflict: "deal_run_id" }
    )
    .select()
    .single();
  if (error) {
    console.error("saveOutcome error:", error);
    return null;
  }
  return data as DealOutcome;
}

/** Remove an outcome (e.g., user records in error) */
export async function deleteOutcome(deal_run_id: string): Promise<boolean> {
  const { error } = await supabase
    .from("deal_outcomes")
    .delete()
    .eq("deal_run_id", deal_run_id);
  return !error;
}
