// Shared types for the buyer-lead engine.

export type Source = "x" | "reddit" | "searchfunder" | "axial" | "podcast" | "manual";
export type IntentTier = "hot" | "warm" | "cold" | "not_buyer";
export type BuyerType =
  | "searcher" | "indie_sponsor" | "holdco" | "first_time"
  | "operator" | "family_office" | "unknown";
export type Route = "services" | "saas" | "both" | "hold";

// What a collector emits before classification.
export interface RawSignal {
  source: Source;
  source_url?: string;
  author_handle?: string;   // @handle, u/username, or display name
  author_name?: string;
  company?: string;
  text: string;             // the post / profile body to classify
}

// What the Claude classifier returns (mirrors the prompt's JSON contract).
export interface Classification {
  is_buyer: boolean;
  confidence: number;       // 0.0 - 1.0
  intent_tier: IntentTier;
  buyer_type: BuyerType;
  qoe_signal: boolean;
  target_industry: string | null;
  target_size: string | null;
  target_geo: string | null;
  signal_text: string;
  route_hint: Route;
}

// What enrichment adds (email + profile resolution).
export interface Enrichment {
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  linkedin_url?: string;
  company?: string;
  company_url?: string;
}

// A fully-processed row, shaped to the buyer_leads table.
export interface BuyerLead {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  linkedin_url?: string;
  x_handle?: string;
  company?: string;
  company_url?: string;

  source: Source;
  source_url?: string;
  signal_text: string;

  is_buyer: boolean;
  confidence: number;
  intent_tier: IntentTier;
  buyer_type: BuyerType;
  qoe_signal: boolean;
  target_industry: string | null;
  target_size: string | null;
  target_geo: string | null;

  buyer_score: number;
  route: Route;

  status?: string;
  enriched?: boolean;
  pushed_to_smartlead?: boolean;
  icebreaker?: string;
}
