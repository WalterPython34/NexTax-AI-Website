import { ImageResponse } from "next/og";
import { ZONE_HEADLINE } from "@/lib/sba/zone-copy";
import type { VerdictZone } from "@/lib/sba/sba-engine";

// Share/OG image for the SBA Deal Check.
// Input is a zone enum ONLY — the server renders the locked headline for that
// zone, so a shared image can never be spoofed into a different claim.
// No PII and no dollar figures are ever baked into the image.

export const runtime = "edge";

const ZONE_STYLE: Record<VerdictZone, { tag: string; color: string }> = {
  PASS: { tag: "PASS", color: "#10B981" },
  BUBBLE: { tag: "ON THE BUBBLE", color: "#F59E0B" },
  FAIL: { tag: "FAIL", color: "#EF4444" },
};

function parseZone(raw: string | null): VerdictZone | null {
  if (raw === "PASS" || raw === "BUBBLE" || raw === "FAIL") return raw;
  return null;
}

export function GET(request: Request): ImageResponse {
  const { searchParams } = new URL(request.url);
  const zone = parseZone(searchParams.get("zone"));

  const tag = zone ? ZONE_STYLE[zone].tag : "SBA DEAL CHECK";
  const color = zone ? ZONE_STYLE[zone].color : "#F59E0B";
  const headline = zone
    ? ZONE_HEADLINE[zone]
    : "Will this deal clear an SBA lender screen?";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0F17",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "10px 24px",
              borderRadius: 12,
              border: `2px solid ${color}`,
              color,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "0.06em",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {tag}
          </div>
          <div
            style={{
              display: "flex",
              color: "#F1F5F9",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 960,
            }}
          >
            {headline}
          </div>
          <div style={{ display: "flex", color: "#94A3B8", fontSize: 30, lineHeight: 1.4 }}>
            A deterministic 1.25&times; DSCR underwriting screen &mdash; the first test an SBA lender runs.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex", color: "#F59E0B", fontSize: 32, fontWeight: 700 }}>
            AcquiFlow
          </div>
          <div style={{ display: "flex", color: "#64748B", fontSize: 26 }}>
            Free SBA Deal Check
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
