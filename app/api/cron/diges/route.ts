// Daily digest: top new buyer leads from the last 24h, emailed/Slacked to you.

import { NextResponse } from "next/server";
import { newLeadsSince } from "@/lib/buyer-engine/store";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const leads = await newLeadsSince(24, 40);
  const top = leads.slice(0, 15);

  const lines = top.map(
    (l) =>
      `• [${l.buyer_score}] ${l.full_name ?? l.x_handle ?? "unknown"} ` +
      `(${l.route}/${l.intent_tier}) — ${l.target_industry ?? "?"} — ` +
      `"${(l.signal_text ?? "").slice(0, 100)}" ${l.source_url ?? ""}`,
  );
  const body =
    `${top.length} new buyer leads (24h), top by score:\n\n${lines.join("\n")}`;

  // Slack webhook (simplest). Swap for SendGrid if you prefer email.
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: body }),
    });
  }
  return NextResponse.json({ ok: true, count: top.length });
}
