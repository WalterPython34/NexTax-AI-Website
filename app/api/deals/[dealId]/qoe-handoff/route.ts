// app/api/deals/[dealId]/qoe-handoff/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow — QoE provider handoff
//
// GET  → the provider picker list for THIS user (key/name/blurb only; emails
//        never leave the server). Empty list → the client hides the button.
// POST → { providerKey }: generates the deal's underwriting screen PDF (the
//        same band-aware report the user downloads) and emails it to the
//        provider with the buyer CC'd and reply-to set to the buyer.
//
// Auth matches the committee-route pattern: Bearer token (header or Supabase
// cookie) → supabaseAdmin.auth.getUser → explicit ownership gate (admin client
// bypasses RLS, so the ownership check is load-bearing).
//
// The email body carries ONLY the four deal facts — no scores or verdicts.
// The attached report carries the analysis. Every send attempt is logged to
// qoe_referrals ('sent' with resend_message_id, 'send_failed' with detail);
// the route returns success/failure honestly.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildQoeEmailHtml, buildQoeEmailText } from "@/lib/qoeEmailTemplate";
import { getPartner, getQoeProviders } from "@/lib/partnerConfig";
import { postToSlack, fmtQoeReferral, fmtSendFailed } from "@/lib/slack";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PRIMARY_AUTH_COOKIE = "sb-sgrosezedxunoicmglpj-auth-token";

function extractToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (h) {
    const m = /^Bearer\s+(.+)$/i.exec(h.trim());
    if (m && m[1]) return m[1].trim();
  }
  const raw = req.cookies.get(PRIMARY_AUTH_COOKIE)?.value;
  if (raw) {
    try {
      let v = raw;
      if (v.startsWith("base64-")) v = Buffer.from(v.slice(7), "base64").toString("utf8");
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p[0]?.access_token ?? (typeof p[0] === "string" ? p[0] : null);
      if (p?.access_token) return p.access_token;
    } catch {
      if (raw.split(".").length === 3) return raw;
    }
  }
  return null;
}

async function authAndPartnerRef(req: NextRequest): Promise<
  | { ok: true; userId: string; userEmail: string | null; partnerRef: string | null }
  | { ok: false; res: NextResponse }
> {
  const token = extractToken(req);
  if (!token) {
    return { ok: false, res: NextResponse.json({ success: false, error: "No bearer token." }, { status: 401 }) };
  }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { ok: false, res: NextResponse.json({ success: false, error: "Session token did not verify." }, { status: 401 }) };
  }
  let partnerRef: string | null = null;
  try {
    const { data: attribution } = await supabaseAdmin
      .from("partner_attributions")
      .select("partner_ref")
      .eq("user_id", user.id)
      .maybeSingle();
    partnerRef = attribution?.partner_ref ?? null;
  } catch {
    partnerRef = null; // defaults list
  }
  return { ok: true, userId: user.id, userEmail: user.email ?? null, partnerRef };
}

// ── GET: picker list (no emails) ─────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> },
) {
  await params; // dealId not needed for the list; route shape keeps one URL
  const auth = await authAndPartnerRef(req);
  if (!auth.ok) return auth.res;

  const providers = getQoeProviders(auth.partnerRef).map((p) => ({
    key: p.key,
    name: p.name,
    blurb: p.blurb,
  }));
  return NextResponse.json({ success: true, providers });
}

// ── POST: generate report and send ───────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> },
) {
  const { dealId } = await params;
  if (!dealId) {
    return NextResponse.json({ success: false, error: "Missing dealId." }, { status: 400 });
  }

  const auth = await authAndPartnerRef(req);
  if (!auth.ok) return auth.res;
  if (!auth.userEmail) {
    return NextResponse.json({ success: false, error: "Your account has no email address to copy on the handoff." }, { status: 400 });
  }

  let providerKey: string | null = null;
  try {
    const body = await req.json();
    providerKey = typeof body?.providerKey === "string" ? body.providerKey : null;
  } catch { /* falls through to the 400 below */ }
  if (!providerKey) {
    return NextResponse.json({ success: false, error: "providerKey required." }, { status: 400 });
  }

  // 1. Deal + ownership gate
  const { data: deal, error: dealErr } = await supabaseAdmin
    .from("deal_runs")
    .select("id, user_id, industry, revenue, sde, asking_price, city, state")
    .eq("id", dealId)
    .maybeSingle();
  if (dealErr || !deal) {
    return NextResponse.json({ success: false, error: "Deal not found." }, { status: 404 });
  }
  if (deal.user_id !== auth.userId) {
    return NextResponse.json({ success: false, error: "You do not have access to this deal." }, { status: 403 });
  }

  // 2. Resolve provider
  const provider = getQoeProviders(auth.partnerRef).find((p) => p.key === providerKey);
  if (!provider || !provider.email) {
    return NextResponse.json({ success: false, error: "Unknown or unconfigured provider." }, { status: 400 });
  }

  const logReferral = async (
    status: "sent" | "send_failed",
    resendMessageId: string | null,
    detail: Record<string, unknown> | null,
  ) => {
    try {
      await supabaseAdmin.from("qoe_referrals").insert({
        user_id: auth.userId,
        deal_run_id: dealId,
        provider_key: provider.key,
        provider_email: provider.email,
        partner_ref: auth.partnerRef,
        status,
        resend_message_id: resendMessageId,
        detail,
      });
    } catch (e) {
      console.error("[qoe-handoff] referral log insert failed:", e);
    }
  };

  // 3. Generate the report via the existing reports route (same band-aware
  //    PDF the user downloads; same internal-fetch pattern the committee
  //    route uses for the CP summary).
  let pdfBytes: Buffer;
  try {
    const origin = new URL(req.url).origin;
    const pdfRes = await fetch(`${origin}/api/reports/${dealId}?uid=${auth.userId}`);
    if (!pdfRes.ok) {
      const errBody = await pdfRes.json().catch(() => ({}));
      const reason = (errBody as { error?: string })?.error ?? `reports route ${pdfRes.status}`;
      await logReferral("send_failed", null, { stage: "pdf_generation", error: reason });
      await postToSlack("errors", fmtSendFailed("qoe-handoff", reason));
      return NextResponse.json({ success: false, error: `Report generation failed: ${reason}` }, { status: 502 });
    }
    pdfBytes = Buffer.from(await pdfRes.arrayBuffer());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logReferral("send_failed", null, { stage: "pdf_generation", error: msg });
    await postToSlack("errors", fmtSendFailed("qoe-handoff", msg));
    return NextResponse.json({ success: false, error: `Report generation failed: ${msg}` }, { status: 502 });
  }

  // 4. Send via Resend — buyer CC'd, reply-to the buyer, PDF attached.
  const industryLabel = deal.industry
    ? deal.industry.charAt(0).toUpperCase() + deal.industry.slice(1).replace(/_/g, " ")
    : "Business";
  const place = [deal.city, deal.state].filter(Boolean).join(", ");
  const subject = `AcquiFlow Deal Referral: ${industryLabel} Acquisition${place ? `, ${place}` : ""}`;

  let bodyText: string, bodyHtml: string;
  try {
    const emailParams = {
      industryLabel,
      revenue: deal.revenue ?? 0,
      sde: deal.sde ?? 0,
      askingPrice: deal.asking_price ?? 0,
      city: deal.city,
      state: deal.state,
      buyerEmail: auth.userEmail,
      partnerDisplayName: getPartner(auth.partnerRef)?.displayName ?? null,
    };
    bodyText = buildQoeEmailText(emailParams);
    bodyHtml = buildQoeEmailHtml(emailParams);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logReferral("send_failed", null, { stage: "template", error: msg });
    await postToSlack("errors", fmtSendFailed("qoe-handoff", msg));
    return NextResponse.json({ success: false, error: `Email template failed: ${msg}` }, { status: 502 });
  }
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: "AcquiFlow <support@nextax.ai>",
      to: provider.email,
      cc: auth.userEmail,
      replyTo: auth.userEmail,
      subject,
      text: bodyText,
      html: bodyHtml,
      attachments: [
        {
          filename: `AcquiFlow-Deal-Report-${dealId.slice(0, 8)}.pdf`,
          content: pdfBytes,
        },
      ],
    });
    if (error) {
      await logReferral("send_failed", null, { stage: "resend", error: JSON.stringify(error) });
      await postToSlack("errors", fmtSendFailed("qoe-handoff", JSON.stringify(error)));
      return NextResponse.json({ success: false, error: `Email send failed: ${JSON.stringify(error)}` }, { status: 502 });
    }
    await logReferral("sent", data?.id ?? null, null);
    await postToSlack("signals", fmtQoeReferral(provider.name, deal.industry, deal.revenue, deal.sde, deal.asking_price, auth.partnerRef));
    return NextResponse.json({ success: true, provider: provider.name });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logReferral("send_failed", null, { stage: "resend", error: msg });
    await postToSlack("errors", fmtSendFailed("qoe-handoff", msg));
    return NextResponse.json({ success: false, error: `Email send failed: ${msg}` }, { status: 502 });
  }
}
