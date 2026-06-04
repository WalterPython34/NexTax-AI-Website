// Orchestrates: classify -> enrich -> score -> route -> icebreaker -> store -> push.

import { classify } from "./classify";
import { enrich } from "./enrich";
import { scoreBuyer, deriveRoute } from "./score";
import { generateIcebreaker } from "./icebreaker";
import { storeLead } from "./store";
import { pushToSmartLead } from "./smartlead";
import { SCORE } from "./config";
import type { RawSignal, BuyerLead } from "./types";

export interface PipelineResult {
  seen: number;
  buyers: number;
  stored: number;
  pushed: number;
}

export async function processSignal(
  signal: RawSignal,
): Promise<{ stored: boolean; pushed: boolean }> {
  const c = await classify(signal);
  if (!c) return { stored: false, pushed: false };

  const e = await enrich(signal);
  const signalCapturedAt = new Date().toISOString();
  const route = deriveRoute(c, e);
  const buyer_score = scoreBuyer({ c, source: signal.source, signalCapturedAt, email: e.email });

  const lead: BuyerLead = {
    first_name: e.first_name,
    last_name: e.last_name,
    full_name: e.full_name ?? signal.author_name,
    email: e.email,
    linkedin_url: e.linkedin_url,
    x_handle: signal.source === "x" ? signal.author_handle : undefined,
    company: e.company ?? signal.company,
    company_url: e.company_url,
    source: signal.source,
    source_url: signal.source_url,
    signal_text: c.signal_text,
    is_buyer: true,
    confidence: c.confidence,
    intent_tier: c.intent_tier,
    buyer_type: c.buyer_type,
    qoe_signal: c.qoe_signal,
    target_industry: c.target_industry,
    target_size: c.target_size,
    target_geo: c.target_geo,
    buyer_score,
    route,
    enriched: Boolean(e.email),
    status: "new",
  };

  // Only spend an icebreaker call + outreach on contactable, high-score leads.
  let pushed = false;
  if (route !== "hold" && lead.email && buyer_score >= SCORE.pushThreshold) {
    lead.icebreaker = await generateIcebreaker(lead);
    const ok = await pushToSmartLead(lead);
    lead.pushed_to_smartlead = ok;
    lead.status = ok ? "queued" : "enriched";
    pushed = ok;
  }

  const saved = await storeLead(lead, signal.source_url);
  return { stored: Boolean(saved), pushed };
}

export async function runPipeline(signals: RawSignal[]): Promise<PipelineResult> {
  const result: PipelineResult = { seen: signals.length, buyers: 0, stored: 0, pushed: 0 };
  // Sequential keeps you under API rate limits; batch if you outgrow it.
  for (const s of signals) {
    const { stored, pushed } = await processSignal(s);
    if (stored) { result.buyers += 1; result.stored += 1; }
    if (pushed) result.pushed += 1;
  }
  return result;
}
