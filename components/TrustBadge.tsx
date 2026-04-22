// components/TrustBadge.tsx
//
// Inline trust badge that sits next to the verdict label.
// Three states:
//   - Hidden     — trust ≥ 85 AND usableSDE === reportedSDE (clean deal)
//   - Adjusted   — trust 60-84 OR usableSDE ≠ reportedSDE (moderate)
//   - Flagged    — trust < 60 OR manual_review_required (severe)
//
// Hover reveals flags + adjustment magnitude.

"use client";

import React from "react";

interface TrustBadgeProps {
  trustScore:           number;
  reportedSDE:          number;
  usableSDE:            number;
  manualReviewRequired: boolean;
  flags?:               Array<{ text: string; severity?: "high" | "medium" | "low" }> | null;
}

function fmt(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function TrustBadge({
  trustScore, reportedSDE, usableSDE, manualReviewRequired, flags,
}: TrustBadgeProps) {
  const isAdjusted = Math.abs(reportedSDE - usableSDE) > 100;
  const severe     = trustScore < 60 || manualReviewRequired;
  const moderate   = !severe && (trustScore < 85 || isAdjusted);

  // Hidden state — clean deal, no badge needed
  if (!severe && !moderate) return null;

  const color = severe ? "#F87171" : "#F59E0B";
  const bg    = severe ? "rgba(239,68,68,0.1)"  : "rgba(245,158,11,0.1)";
  const bd    = severe ? "rgba(239,68,68,0.3)"  : "rgba(245,158,11,0.3)";
  const label = severe ? "Flagged" : "Adjusted";

  const hasTooltip = (flags && flags.length > 0) || isAdjusted;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 20,
        background: bg,
        border: `1px solid ${bd}`,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color,
        fontWeight: 500,
        cursor: hasTooltip ? "help" : "default",
        whiteSpace: "nowrap",
      }}
      className={hasTooltip ? "nxtax-trust-badge" : ""}
      data-has-tooltip={hasTooltip ? "true" : "false"}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label} · Trust {trustScore}

      {/* Tooltip — rendered as sibling via CSS hover */}
      {hasTooltip && (
        <span className="nxtax-trust-tooltip" style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 100,
          minWidth: 280,
          maxWidth: 340,
          padding: "12px 14px",
          borderRadius: 10,
          background: "#161B22",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 11,
          color: "#C4C8D1",
          fontWeight: 400,
          lineHeight: 1.5,
          textAlign: "left",
          whiteSpace: "normal",
          pointerEvents: "none",
          opacity: 0,
          transform: "translateY(-4px)",
          transition: "opacity 140ms ease, transform 140ms ease",
        }}>
          <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>
            Why the adjustment?
          </div>

          {flags && flags.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: isAdjusted ? 8 : 0 }}>
              {flags.slice(0, 4).map((f, i) => {
                const fc = f.severity === "high" ? "#F87171" : f.severity === "low" ? "#94A3B8" : "#F59E0B";
                return (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: fc, flexShrink: 0, fontSize: 8, marginTop: 3 }}>●</span>
                    <span>{f.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {isAdjusted && (
            <div style={{
              paddingTop: flags && flags.length > 0 ? 8 : 0,
              borderTop: flags && flags.length > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              fontSize: 10,
              color: "#7C8593",
              lineHeight: 1.5,
            }}>
              Using <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#A5B4FC", fontWeight: 600 }}>{fmt(usableSDE)}</span>
              {" "}adjusted SDE (reported: <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#94A3B8" }}>{fmt(reportedSDE)}</span>)
            </div>
          )}
        </span>
      )}
    </span>
  );
}

export default TrustBadge;
