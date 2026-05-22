"use client";

// ═══════════════════════════════════════════════════════════════════════════
// app/acquiflow-intel/page.tsx
//
// AcquiFlow — Institutional Read · Index
//
// READ-ONLY. Lists the user's deals that have a CP institutional read and links
// into each /acquiflow-intel/[dealId]. No mutations, no forms, no writes, no
// imports from the operational /buyer-dashboard.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { authedGet } from "./_lib/authedFetch";


const C = {
  ink: "#1a1d23", inkSoft: "#3d434e", faint: "#6b7280",
  paper: "#f4f1ea", card: "#fdfcfa", rule: "#d8d3c7", ruleSoft: "#e8e3d8",
  accent: "#2d4a3e", accentSoft: "#5a7464", binding: "#8a4b2d", blocking: "#6b3a4a",
};
const serif = "'Hoefler Text','Iowan Old Style','Palatino Linotype',Georgia,serif";
const sans = "'Helvetica Neue','Inter',system-ui,sans-serif";

const fmtMoney = (n: number | null) =>
  n == null ? "—" : "$" + (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : (n / 1e3).toFixed(0) + "K");
const titleCase = (s: string | null) =>
  !s ? "Deal" : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function IntelIndexPage() {
  const [state, setState] = useState<
    { status: "loading" } |
    { status: "error"; reason: string } |
    { status: "ok"; deals: any[] }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await authedGet("/api/deals/with-reads");
        if (cancelled) return;
        if (!json.success) setState({ status: "error", reason: json.reason ?? "Unable to load." });
        else setState({ status: "ok", deals: json.deals ?? [] });
      } catch (e) {
        if (!cancelled) setState({ status: "error", reason: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ background: C.paper, minHeight: "100vh", paddingBottom: 80, color: C.ink }}>
      <div style={{ borderBottom: `1px solid ${C.rule}`, background: C.card }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 40px" }}>
          <div style={{ fontFamily: serif, fontSize: 26, letterSpacing: "0.01em" }}>
            AcquiFlow
            <span style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accentSoft, marginLeft: 14, fontWeight: 600 }}>
              Institutional Read
            </span>
          </div>
          <div style={{ fontFamily: serif, fontSize: 13.5, fontStyle: "italic", color: C.faint, marginTop: 4 }}>
            Pre-LOI underwriting intelligence · select a deal to review
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 40px 0" }}>
        {state.status === "loading" && (
          <div style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: C.faint }}>Loading reviews…</div>
        )}
        {state.status === "error" && (
          <div style={{ borderLeft: `3px solid ${C.blocking}`, paddingLeft: 22 }}>
            <div style={{ fontFamily: serif, fontSize: 18 }}>Unable to load reviews.</div>
            <div style={{ fontFamily: sans, fontSize: 12, color: C.faint, marginTop: 8 }}>{state.reason}</div>
          </div>
        )}
        {state.status === "ok" && state.deals.length === 0 && (
          <div style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: C.faint }}>
            No institutional reads yet. Deals appear here once they have been evaluated.
          </div>
        )}
        {state.status === "ok" && state.deals.length > 0 && (
          <div style={{ border: `1px solid ${C.ruleSoft}`, background: C.card }}>
            {state.deals.map((d, idx) => (
              <a
                key={d.deal_id}
                href={`/acquiflow-intel/${d.deal_id}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "18px 22px", textDecoration: "none", color: C.ink,
                  borderTop: idx === 0 ? "none" : `1px solid ${C.ruleSoft}`,
                }}
              >
                <div>
                  <div style={{ fontFamily: serif, fontSize: 18 }}>{titleCase(d.industry)}</div>
                  <div style={{ fontFamily: sans, fontSize: 12, color: C.faint, marginTop: 3, letterSpacing: "0.03em" }}>
                    Revenue {fmtMoney(d.revenue)} · SDE {fmtMoney(d.sde)} · Asking {fmtMoney(d.asking_price)}
                  </div>
                </div>
                <div style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent }}>
                  Open read →
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
