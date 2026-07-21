// lib/slack.ts
// Slack notification layer. Same contract as lib/pipelineLogger.ts:
// NEVER throws, NEVER blocks the request that calls it. A Slack outage or
// misconfig degrades to a console line — it cannot affect a save, signup,
// or send.
//
// Channels are per-webhook-URL (Slack incoming webhooks are channel-bound).
// Set these in Vercel env (Production; add Preview only if you want preview
// traffic in Slack, which you usually don't):
//   SLACK_WEBHOOK_SIGNALS  → #signals   (signups, Pro subs, QoE referrals, attributions)
//   SLACK_WEBHOOK_ERRORS   → #errors    (fallback benchmarks, send failures)
//
// Founder-watch posts to SIGNALS with a tag; no separate webhook needed unless
// you want one.

export type SlackChannel = "signals" | "errors";

const WEBHOOKS: Record<SlackChannel, string | undefined> = {
  signals: process.env.SLACK_WEBHOOK_SIGNALS,
  errors:  process.env.SLACK_WEBHOOK_ERRORS,
};

/**
 * Post a message to a Slack channel. Never throws. Returns nothing useful by
 * design — callers should not depend on the result.
 *
 * `text` supports Slack mrkdwn (*bold*, `code`, <url|label>).
 */
export async function postToSlack(channel: SlackChannel, text: string): Promise<void> {
  try {
    const url = WEBHOOKS[channel];
    if (!url) {
      // Unconfigured channel is a no-op, not an error — lets you ship the code
      // before the webhook exists, or run locally without Slack.
      return;
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.error(`[slack] ${channel} post failed: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.error(`[slack] ${channel} post threw:`, e instanceof Error ? e.message : String(e));
  }
}

// ── Founder / VIP watch list ─────────────────────────────────────────────────
// Entries may be Supabase auth user_ids OR email addresses (lowercase).
// Emails are resolved by the caller (record-deal looks up the saver's email
// via the auth admin API when the list contains any entry).
export const WATCHED_USER_IDS: ReadonlySet<string> = new Set<string>([
  "bill@smbdealhunter.xyz",
  // "helen-user-id-here",
]);

export function isWatchedUser(idOrEmail: string | null | undefined): boolean {
  return idOrEmail != null && WATCHED_USER_IDS.has(idOrEmail.toLowerCase());
}

// ── Formatting helpers (keep messages readable and consistent) ───────────────
const money = (v: number | null | undefined) =>
  typeof v === "number" && isFinite(v) ? `$${Math.round(v).toLocaleString()}` : "n/a";

/** New Pro subscriber (call from your Stripe webhook's subscription-created path). */
export function fmtNewPro(email: string | null, partnerRef: string | null): string {
  const who = email ?? "a user";
  const tag = partnerRef ? ` _(via ${partnerRef})_` : "";
  return `:tada: *New Pro subscriber:* ${who}${tag}`;
}

/** New signup / attribution (call from the attribution write path). */
export function fmtNewSignup(email: string | null, partnerRef: string | null): string {
  const who = email ?? "a new user";
  return partnerRef
    ? `:wave: *New ${partnerRef} member:* ${who}`
    : `:wave: *New signup:* ${who}`;
}

/** QoE referral sent (call from the qoe-handoff route on success). */
export function fmtQoeReferral(
  providerName: string,
  industry: string | null,
  revenue: number | null,
  sde: number | null,
  askingPrice: number | null,
  partnerRef: string | null,
): string {
  const tag = partnerRef ? ` _(${partnerRef} member)_` : "";
  return (
    `:handshake: *QoE referral → ${providerName}*${tag}\n` +
    `${industry ?? "Business"} · rev ${money(revenue)} · SDE ${money(sde)} · ask ${money(askingPrice)}`
  );
}

/** Founder/VIP ran a deal (call from record-deal when isWatchedUser). */
export function fmtFounderDeal(
  email: string | null,
  industry: string | null,
  verdict: string | null,
  confidenceGrade: string | null,
): string {
  const who = email ?? "a founder account";
  const v = verdict ? verdict.replace(/_/g, " ") : "n/a";
  const g = confidenceGrade ? ` · grade ${confidenceGrade}` : "";
  return `:eyes: *Founder deal:* ${who} ran ${industry ?? "a deal"} → *${v}*${g}`;
}

/** Benchmark fallback fired (call from record-deal's fallback branch). */
export function fmtBenchmarkFallback(industry: string | null): string {
  return `:warning: *Benchmark fallback:* \`${industry ?? "unknown"}\` resolved to fallback — check coverage. (The pharmacy early-warning.)`;
}

/** A send failed (call from qoe-handoff / any Resend send on failure). */
export function fmtSendFailed(context: string, error: string): string {
  return `:rotating_light: *Send failed* (${context}): ${error.slice(0, 300)}`;
}

/** Renewal / invoice payment failed — the churn early-warning. → #errors */
export function fmtPaymentFailed(email: string | null, amount: number | null): string {
  const who = email ?? "a subscriber";
  const amt = amount != null ? ` (${money(amount)})` : "";
  return `:credit_card: *Payment failed:* ${who}${amt} — card declined or renewal failed. Reach out before churn.`;
}

/** Subscription canceled/deleted — churn notice. → #signals */
export function fmtSubscriptionCanceled(email: string | null, partnerRef: string | null): string {
  const who = email ?? "a subscriber";
  const tag = partnerRef ? ` _(${partnerRef} member)_` : "";
  return `:x: *Subscription canceled:* ${who}${tag}`;
}

/** Optional: successful payment. Route to a muted #revenue channel if wired;
 *  do NOT put this in #signals — monthly renewals are noise. Provided for
 *  completeness; most setups skip it. */
export function fmtPaymentSucceeded(email: string | null, amount: number | null): string {
  const who = email ?? "a subscriber";
  const amt = amount != null ? ` ${money(amount)}` : "";
  return `:moneybag: Payment${amt}: ${who}`;
}
