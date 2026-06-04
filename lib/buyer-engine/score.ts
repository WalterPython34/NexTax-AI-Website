// Buyer-readiness scoring + route derivation.

import { SCORE, INDUSTRY_KEYS } from "./config";
import type { Classification, Enrichment, Route, Source } from "./types";

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

export function scoreBuyer(args: {
  c: Classification;
  source: Source;
  signalCapturedAt: string;
  email?: string;
}): number {
  const { c, source, signalCapturedAt, email } = args;
  let score = 0;

  score += SCORE.tier[c.intent_tier] ?? 0;

  const d = daysSince(signalCapturedAt);
  if (d <= 7) score += SCORE.recency.within7d;
  else if (d <= 30) score += SCORE.recency.within30d;

  if (c.target_industry && INDUSTRY_KEYS.includes(c.target_industry)) {
    score += SCORE.industryFit;
  }
  if (email) score += SCORE.hasEmail;
  score += SCORE.source[source] ?? 0;

  return Math.min(score, 100);
}

// Final route. Trust the classifier's hint, then sharpen with hard rules.
export function deriveRoute(c: Classification, enrich: Enrichment): Route {
  if (!enrich.email) return "hold"; // no email -> social engagement, not cold email
  if (c.qoe_signal) return "both";
  if (c.intent_tier === "hot") return "services";
  if (c.intent_tier === "warm") return "saas";
  return c.route_hint ?? "saas";
}
