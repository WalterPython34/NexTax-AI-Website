// Classify a raw signal into a Classification via Claude.

import { anthropic, CLASSIFIER_MODEL, parseJsonResponse, textOf } from "./anthropic";
import { CLASSIFIER_SYSTEM, classifierUser } from "./prompts";
import { clusterHits } from "./config";
import type { RawSignal, Classification } from "./types";

export async function classify(signal: RawSignal): Promise<Classification | null> {
  // Cheap pre-filter: drop obvious noise before spending a model call.
  const hits = clusterHits(signal.text);
  if (hits.suppress && !hits.qoe && !hits.hot && !hits.warm) return null;

  const msg = await anthropic.messages.create({
    model: CLASSIFIER_MODEL,
    max_tokens: 400,
    system: CLASSIFIER_SYSTEM,
    messages: [{ role: "user", content: classifierUser(signal) }],
  });

  let c: Classification;
  try {
    c = parseJsonResponse<Classification>(textOf(msg));
  } catch {
    return null; // unparseable -> skip rather than poison the table
  }

  if (!c.is_buyer || c.intent_tier === "not_buyer") return null;

  // Belt-and-suspenders: the keyword override the prompt is told to apply,
  // enforced in code too.
  if (hits.qoe) {
    c.qoe_signal = true;
    c.intent_tier = "hot";
    if (c.route_hint === "saas" || c.route_hint === "hold") c.route_hint = "both";
  }
  return c;
}
