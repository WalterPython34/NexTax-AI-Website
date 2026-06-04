// Generate the personalized opening line from the captured signal.

import { anthropic, ICEBREAKER_MODEL, textOf } from "./anthropic";
import { ICEBREAKER_SYSTEM, icebreakerUser } from "./prompts";
import type { BuyerLead } from "./types";

export async function generateIcebreaker(lead: BuyerLead): Promise<string> {
  const msg = await anthropic.messages.create({
    model: ICEBREAKER_MODEL,
    max_tokens: 120,
    system: ICEBREAKER_SYSTEM,
    messages: [{ role: "user", content: icebreakerUser(lead) }],
  });
  return textOf(msg).replace(/^["']|["']$/g, "").slice(0, 240);
}
