// lib/qoeEmailTemplate.ts
// QoE handoff email — HTML + plain-text builders.
// Wire-in: in the qoe-handoff route's Resend send, pass
//   html: buildQoeEmailHtml(params), text: buildQoeEmailText(params)
// (keep text — multipart improves deliverability and some firms read plain).
//
// Content rules (locked): ONLY the four deal facts in the body — no scores,
// verdicts, or grades (the attached report carries the analysis). The lane
// sentence renders as the visual centerpiece. Partner line appears only when
// the referral is attributed. No em dashes inside sentence prose.

export interface QoeEmailParams {
  industryLabel: string;            // e.g. "Veterinary"
  revenue: number;
  sde: number;
  askingPrice: number;
  city?: string | null;
  state?: string | null;
  buyerEmail: string;
  partnerDisplayName?: string | null;  // e.g. "SMB Deal Hunter" when attributed
}

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function buildQoeEmailText(p: QoeEmailParams): string {
  const loc = p.city ? ` (${p.city}${p.state ? `, ${p.state}` : ""})` : "";
  const partnerLine = p.partnerDisplayName
    ? `\nThis referral originated through the ${p.partnerDisplayName} member program.\n`
    : "";
  return (
    `Attached is AcquiFlow's pre-LOI underwriting screen for a deal one of our users is evaluating.\n\n` +
    `Deal facts: ${p.industryLabel}${loc} · Revenue ${money(p.revenue)} · Reported SDE ${money(p.sde)} · Asking ${money(p.askingPrice)}\n\n` +
    `This screen is underwriting context only. Quality of earnings scope is yours. ` +
    `The buyer is copied on this email and can share source documents directly.\n` +
    partnerLine +
    `\nAcquiFlow by NexTax.AI\n`
  );
}

export function buildQoeEmailHtml(p: QoeEmailParams): string {
  const loc = p.city ? `${p.city}${p.state ? `, ${p.state}` : ""}` : null;
  const partnerBlock = p.partnerDisplayName
    ? `<tr><td style="padding:14px 32px 0;">
         <p style="margin:0;font-size:12px;color:#8a8f98;font-family:Arial,Helvetica,sans-serif;">
           Referral originated through the <strong style="color:#3d5443;">${p.partnerDisplayName}</strong> member program.
         </p>
       </td></tr>`
    : "";

  const factRow = (label: string, value: string) =>
    `<td style="padding:12px 16px;border:1px solid #e5e0d5;border-radius:6px;background:#faf7f0;">
       <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8a8f98;font-family:Arial,Helvetica,sans-serif;">${label}</div>
       <div style="font-size:17px;font-weight:bold;color:#1a2332;font-family:Georgia,serif;margin-top:3px;">${value}</div>
     </td>`;

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f2f0ea;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0ea;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e0d5;border-radius:10px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:22px 32px;border-bottom:1px solid #e5e0d5;">
          <span style="font-size:19px;font-weight:bold;color:#3d5443;font-family:Georgia,serif;">AcquiFlow</span>
          <span style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#a06940;font-family:Arial,Helvetica,sans-serif;padding-left:10px;">Underwriting Referral</span>
        </td></tr>

        <!-- Intro -->
        <tr><td style="padding:24px 32px 6px;">
          <p style="margin:0;font-size:14px;line-height:1.65;color:#1a2332;font-family:Arial,Helvetica,sans-serif;">
            Attached is AcquiFlow's pre-LOI underwriting screen for a deal one of our users is evaluating.
          </p>
        </td></tr>

        <!-- Deal facts -->
        <tr><td style="padding:18px 32px 4px;">
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#8a8f98;font-family:Arial,Helvetica,sans-serif;padding-bottom:8px;">
            Deal Facts${loc ? ` · ${loc}` : ""}
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="6">
            <tr>
              ${factRow("Industry", p.industryLabel)}
              ${factRow("Revenue", money(p.revenue))}
            </tr>
            <tr>
              ${factRow("Reported SDE", money(p.sde))}
              ${factRow("Asking", money(p.askingPrice))}
            </tr>
          </table>
        </td></tr>

        <!-- Lane statement: the centerpiece -->
        <tr><td style="padding:20px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-left:3px solid #3d5443;background:#faf7f0;padding:14px 18px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#1a2332;font-family:Georgia,serif;">
                This screen is underwriting context only.
                <strong>Quality of earnings scope is yours.</strong>
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Buyer note -->
        <tr><td style="padding:16px 32px 0;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#4b5563;font-family:Arial,Helvetica,sans-serif;">
            The buyer is copied on this email and can share source documents directly.
            Replies reach the buyer at <a href="mailto:${p.buyerEmail}" style="color:#3d5443;">${p.buyerEmail}</a>.
          </p>
        </td></tr>

        ${partnerBlock}

        <!-- Footer -->
        <tr><td style="padding:22px 32px 24px;">
          <hr style="border:none;border-top:1px solid #e5e0d5;margin:0 0 14px;" />
          <p style="margin:0;font-size:11px;color:#8a8f98;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
            AcquiFlow by NexTax.AI · Pre-LOI acquisition underwriting<br/>
            The attached report is an underwriting screen, not a lender credit decision or a valuation opinion.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
