// components/InfoTooltip.tsx
//
// Reusable financial-metric tooltip. Looks like Stripe / Bloomberg.
//
// Usage:
//   <InfoTooltip term="dscr" />                         — default ⓘ icon
//   <InfoTooltip term="dscr"><strong>DSCR</strong></InfoTooltip>   — wrap a label
//   <InfoTooltip term="dscr" size="sm" />               — smaller icon
//
// Behavior:
//   - Hover (desktop) → opens after 100ms, closes on mouseleave
//   - Tap (mobile) or click → pins open, click outside to close
//   - Auto-flips position if near viewport edge
//   - Smooth 180ms fade
//   - ARIA-labeled for screen readers

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { TOOLTIP_CONTENT, TooltipEntry } from "@/lib/tooltipContent";

interface InfoTooltipProps {
  /** Key into TOOLTIP_CONTENT (e.g. "dscr", "sde"). */
  term:      string;
  /** Optional — wrap a label to make the whole label hoverable. If omitted, renders a ⓘ icon. */
  children?: React.ReactNode;
  /** Icon size. Default 12px. */
  size?:     "sm" | "md";
  /** Custom override content if the term isn't in the global config. */
  override?: TooltipEntry;
  /** Placement hint — defaults to auto with flipping. */
  placement?: "top" | "bottom" | "auto";
}

export function InfoTooltip({
  term, children, size = "md", override, placement = "auto",
}: InfoTooltipProps) {
  const [open, setOpen]     = useState(false);
  const [pinned, setPinned] = useState(false);        // click-to-pin
  const [pos, setPos]       = useState<"top" | "bottom">("bottom");
  const wrapperRef          = useRef<HTMLSpanElement>(null);
  const tooltipRef          = useRef<HTMLSpanElement>(null);
  const hoverTimerRef       = useRef<number | null>(null);

  const entry = override ?? TOOLTIP_CONTENT[term];
  if (!entry) {
    // In dev, this catches typos early; in prod, silently degrade to no-tooltip
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[InfoTooltip] Unknown term: "${term}"`);
    }
    return <>{children}</>;
  }

  // ── Position detection — flip to "top" if tooltip would clip the viewport bottom
  const computePosition = useCallback(() => {
    if (placement !== "auto") { setPos(placement); return; }
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const needed = 160;  // approx tooltip height + margin
    setPos(spaceBelow < needed ? "top" : "bottom");
  }, [placement]);

  // ── Open / close handlers
  const handleOpen = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      computePosition();
      setOpen(true);
    }, 100);
  }, [computePosition]);

  const handleClose = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    if (!pinned) setOpen(false);
  }, [pinned]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!open) {
      computePosition();
      setOpen(true);
      setPinned(true);
    } else {
      setPinned(p => !p);
      if (pinned) setOpen(false);
    }
  }, [open, pinned, computePosition]);

  // ── Click-outside handling (for pinned state)
  useEffect(() => {
    if (!pinned) return;
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPinned(false);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [pinned]);

  // ── Escape key to close when pinned
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPinned(false); setOpen(false); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const iconSize  = size === "sm" ? 10 : 12;
  const triggerId = `tt-trigger-${term}`;
  const tooltipId = `tt-content-${term}`;

  return (
    <span
      ref={wrapperRef}
      style={{
        position:      "relative",
        display:       "inline-flex",
        alignItems:    "center",
        gap:           children ? 5 : 0,
        verticalAlign: "baseline",
      }}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      {children}
      {/* Trigger icon */}
      <button
        id={triggerId}
        type="button"
        onClick={handleClick}
        aria-label={`More info about ${entry.title}`}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        tabIndex={0}
        onFocus={handleOpen}
        onBlur={handleClose}
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          justifyContent: "center",
          width:          iconSize + 4,
          height:         iconSize + 4,
          borderRadius:   "50%",
          border:         "1px solid rgba(148,163,184,0.4)",
          background:     "transparent",
          color:          "#94A3B8",
          fontSize:       iconSize - 1,
          fontWeight:     600,
          cursor:         "pointer",
          padding:        0,
          lineHeight:     1,
          fontFamily:     "inherit",
          transition:     "color 140ms ease, border-color 140ms ease, background 140ms ease",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color       = "#A5B4FC";
          e.currentTarget.style.borderColor = "rgba(165,180,252,0.6)";
          e.currentTarget.style.background  = "rgba(99,102,241,0.08)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color       = "#94A3B8";
          e.currentTarget.style.borderColor = "rgba(148,163,184,0.4)";
          e.currentTarget.style.background  = "transparent";
        }}
      >
        i
      </button>

      {/* Tooltip card */}
      {open && (
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          style={{
            position:       "absolute",
            zIndex:         500,
            [pos === "top" ? "bottom" : "top"]: "calc(100% + 8px)",
            left:           0,
            width:          240,
            maxWidth:       "min(240px, 85vw)",
            padding:        "11px 13px",
            borderRadius:   9,
            background:     "#0D1117",
            border:         "1px solid rgba(255,255,255,0.12)",
            boxShadow:      "0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
            fontFamily:     "'Inter Tight', -apple-system, sans-serif",
            textAlign:      "left",
            whiteSpace:     "normal",
            pointerEvents:  pinned ? "auto" : "none",
            animation:      "nxtax-tooltip-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          {/* Title */}
          <div style={{
            fontSize:   12,
            fontWeight: 700,
            color:      "#F1F5F9",
            lineHeight: 1.35,
            marginBottom: 5,
            letterSpacing: "-0.005em",
          }}>
            {entry.title}
          </div>

          {/* Description */}
          <div style={{
            fontSize:   11,
            color:      "#C4C8D1",
            lineHeight: 1.55,
            marginBottom: 6,
          }}>
            {entry.description}
          </div>

          {/* Insight — highlighted */}
          <div style={{
            fontSize:   11,
            color:      "#A5B4FC",
            lineHeight: 1.5,
            fontWeight: 500,
            paddingTop: 6,
            borderTop:  "1px solid rgba(255,255,255,0.06)",
          }}>
            {entry.insight}
          </div>

          {/* Good / Bad indicators (optional) */}
          {(entry.good || entry.bad) && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {entry.good && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 10, lineHeight: 1.5 }}>
                  <span style={{ color: "#10B981", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ color: "#94A3B8" }}>{entry.good}</span>
                </div>
              )}
              {entry.bad && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 10, lineHeight: 1.5 }}>
                  <span style={{ color: "#F87171", fontWeight: 700, flexShrink: 0 }}>✗</span>
                  <span style={{ color: "#94A3B8" }}>{entry.bad}</span>
                </div>
              )}
            </div>
          )}

          {/* Pinned-close hint (only when pinned) */}
          {pinned && (
            <div style={{
              marginTop: 8,
              paddingTop: 6,
              borderTop: "1px solid rgba(255,255,255,0.05)",
              fontSize: 9,
              color: "#64748B",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>
              Press Esc or click outside to close
            </div>
          )}
        </span>
      )}

      {/* Tooltip animation — scoped keyframes */}
      <style>{`
        @keyframes nxtax-tooltip-in {
          from { opacity: 0; transform: translateY(${pos === "top" ? "4px" : "-4px"}); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </span>
  );
}

export default InfoTooltip;
