// Push an enriched lead into the correct SmartLead campaign based on route.
//
// COMPLIANCE: ignore_unsubscribe_list and ignore_global_block_list are FALSE.
// Honoring unsubscribes/blocks is required (CAN-SPAM) and protects deliverability.

import type { BuyerLead, Route } from "./types";

const CAMPAIGNS: Record<Exclude<Route, "hold">, string> = {
  services: process.env.SMARTLEAD_CAMPAIGN_SERVICES!, // QoE-Lite (Hot)
  saas: process.env.SMARTLEAD_CAMPAIGN_SAAS!,          // AcquiFlow (Warm)
  both: process.env.SMARTLEAD_CAMPAIGN_SERVICES!,      // lead w/ services; mention platform in F3
};

export async function pushToSmartLead(lead: BuyerLead): Promise<boolean> {
  if (lead.route === "hold" || !lead.email) return false; // social engagement instead
  const campaignId = CAMPAIGNS[lead.route];
  if (!campaignId) return false;

  const url =
    `https://server.smartlead.ai/api/v1/campaigns/${campaignId}/leads` +
    `?api_key=${process.env.SMARTLEAD_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lead_list: [
        {
          first_name: lead.first_name ?? "",
          last_name: lead.last_name ?? "",
          email: lead.email,
          company_name: lead.company ?? "",
          website: lead.company_url ?? "",
          linkedin_profile: lead.linkedin_url ?? "",
          custom_fields: {
            First_Line: lead.icebreaker ?? "",
            Target_Industry: lead.target_industry ?? "",
            Target_Size: lead.target_size ?? "",
          },
        },
      ],
      settings: {
        ignore_global_block_list: false,
        ignore_unsubscribe_list: false,
        ignore_duplicate_leads_in_other_campaign: false,
      },
    }),
  });
  return res.ok;
}
