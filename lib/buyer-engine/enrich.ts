// Email + profile enrichment.
//
// Two paths:
//   1. Apollo people-match (reuses the pattern from your existing n8n workflow).
//   2. Clay (recommended for waterfall enrichment — higher hit-rate). Stubbed below.
//
// Pseudonymous sources (Reddit) usually won't resolve; that's expected and is
// what routes them to "hold".

import type { RawSignal, Enrichment } from "./types";

export async function enrich(signal: RawSignal): Promise<Enrichment> {
  // No name/company to work with -> nothing to enrich (e.g. pseudonymous Reddit).
  if (!signal.author_name && !signal.company) return {};

  // --- Apollo people-match -------------------------------------------------
  try {
    const res = await fetch("https://api.apollo.io/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": process.env.APOLLO_API_KEY!,
      },
      body: JSON.stringify({
        name: signal.author_name,
        organization_name: signal.company,
        reveal_personal_emails: true,
      }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const p = data.person;
    if (!p) return {};
    return {
      email: p.email,
      first_name: p.first_name,
      last_name: p.last_name,
      full_name: p.name,
      linkedin_url: p.linkedin_url,
      company: p.organization?.name ?? signal.company,
      company_url: p.organization?.website_url,
    };
  } catch {
    return {};
  }

  // --- Clay alternative ----------------------------------------------------
  // Replace the block above with a POST to your Clay table webhook and read
  // the enriched row back, if you'd rather lean on Clay's waterfall.
}
