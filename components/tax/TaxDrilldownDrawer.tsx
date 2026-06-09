"use client";

// components/tax/TaxDrilldownDrawer.tsx
// ═════════════════════════════════════════════════════════════════════════════
// TAX FACT DRILLDOWN — side drawer.
//
// Renders a DrilldownViewModel as three stacked layers in constitutional order:
//   Layer 1 · Facts        — value + provenance (FACT/ASSUMPTION/DERIVED) +
//                            honest source + evidence quality + honest absence.
//   Layer 2 · Computation  — formula, inputs (each with provenance), computability,
//                            assumption basis, and a visible Analysis-Only firewall.
//   Layer 3 · Implication  — institutional read; conditional language; no verdict.
//
// The drawer DISPLAYS ONLY. It never computes or re-labels — the adapter is the
// single source of truth. `focus` scrolls the opening layer into view.
// ═════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from "react";
import { SeamBadge, type SeamKind } from "@/components/tax/SeamBadge";
import type {
  DrilldownViewModel,
  DrilldownFact,
  DrilldownComputation,
  DrilldownImplication,
  Provenance,
  ComputabilityStatus,
} from "@/lib/acquiflow/tax-drilldown-adapter";

// Tokens mirror TaxAssumptionsTab (kept local to avoid coupling to the tab file).
const INK = "#E2E8F0", MUTE = "#7C8593", MUTE2 = "#94A3B8", FAINT = "#6B7280";
const VIOLET = "#C4B5FD", AMBER_FG = "#FBBF24";
const PANEL = "#0F1729";
const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const PROV_AS_SEAM: Record<Provenance, SeamKind | null> = {
  FACT: "FACT", ASSUMPTION: "ASSUMPTION", DERIVED: "DERIVED", EXTRACTED: null,
};

const STATUS_LABEL: Record<ComputabilityStatus, string> = {
  computable: "Computable",
  assumption_bound: "Assumption-bound",
  not_computable: "Not computable",
};
const STATUS_COLOR: Record<ComputabilityStatus, string> = {
  computable: "#34D399", assumption_bound: AMBER_FG, not_computable: MUTE2,
};

const SECTION_LABEL = { fontSize: 10, fontWeight: 700 as const, color: MUTE, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10 };

function ProvBadge({ provenance }: { provenance: Provenance }) {
  const kind = PROV_AS_SEAM[provenance];
  if (!kind) return null; // EXTRACTED reserved — never rendered in v1
  return <SeamBadge kind={kind} />;
}

function FactBlock({ f }: { f: DrilldownFact }) {
  return (
    <div style={{ padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 5 }}>
        <span style={{ fontSize: 11.5, color: MUTE }}>{f.label}</span>
        <span style={{ fontSize: 13, color: f.missing ? AMBER_FG : INK, fontWeight: 600, textAlign: "right" }}>{f.value}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <ProvBadge provenance={f.provenance} />
        <span style={{ fontSize: 10, color: FAINT }}>Source: {f.sourceLabel}</span>
        <span style={{ fontSize: 10, color: FAINT }}>· Evidence: {f.evidenceQuality}</span>
      </div>
      {f.missing && f.missingReason && (
        <div style={{ marginTop: 6, fontSize: 11, color: AMBER_FG, fontStyle: "italic", lineHeight: 1.45 }}>
          {f.missingReason}
        </div>
      )}
    </div>
  );
}

function ComputationBlock({ c }: { c: DrilldownComputation }) {
  return (
    <div>
      {/* Firewall — visible seam between operational dollars and the institutional read */}
      {c.analysisOnly && (
        <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 7, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: AMBER_FG, textTransform: "uppercase", letterSpacing: "0.05em" }}>Analysis only</span>
          <span style={{ fontSize: 10.5, color: MUTE, marginLeft: 8 }}>Operational preview — does not enter the institutional read.</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: INK }}>{c.label}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: STATUS_COLOR[c.computabilityStatus], textTransform: "uppercase", letterSpacing: "0.04em", padding: "1px 6px", borderRadius: 3, background: "rgba(255,255,255,0.04)" }}>
          {STATUS_LABEL[c.computabilityStatus]}
        </span>
      </div>

      <div style={{ fontSize: 11, color: MUTE2, fontFamily: MONO, lineHeight: 1.5, padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6, marginBottom: 10 }}>
        {c.formulaDisplay}
      </div>

      {c.inputsUsed.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9.5, color: FAINT, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Inputs used</div>
          {c.inputsUsed.map((inp, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "4px 0" }}>
              <span style={{ fontSize: 11, color: MUTE }}>
                {inp.name}
                <span style={{ marginLeft: 7 }}><ProvBadge provenance={inp.source} /></span>
              </span>
              <span style={{ fontSize: 11.5, color: INK, fontFamily: MONO }}>{inp.value}</span>
            </div>
          ))}
        </div>
      )}

      {c.notComputableReason && (
        <div style={{ fontSize: 11, color: MUTE2, fontStyle: "italic", lineHeight: 1.5, marginBottom: 8 }}>
          {c.notComputableReason}
        </div>
      )}

      <div style={{ fontSize: 10.5, color: FAINT, lineHeight: 1.55, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ fontWeight: 600, color: MUTE }}>Assumption basis: </span>{c.assumptionBasis}
      </div>
    </div>
  );
}

function ImplicationBlock({ im }: { im: DrilldownImplication }) {
  return (
    <div style={{ padding: "12px 14px", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 8 }}>
      <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.6 }}>{im.text}</div>
      {im.conditions && im.conditions.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {im.conditions.map((cond, i) => (
            <div key={i} style={{ fontSize: 11, color: MUTE2, fontStyle: "italic", lineHeight: 1.5, marginBottom: 3 }}>· {cond}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaxDrilldownDrawer({ vm, onClose }: { vm: DrilldownViewModel | null; onClose: () => void }) {
  const factsRef = useRef<HTMLDivElement>(null);
  const compRef = useRef<HTMLDivElement>(null);
  const implRef = useRef<HTMLDivElement>(null);

  // Esc to close.
  useEffect(() => {
    if (!vm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vm, onClose]);

  // Scroll the focused layer into view on open.
  useEffect(() => {
    if (!vm) return;
    const target = vm.focus === "computation" ? compRef.current
      : vm.focus === "implication" ? implRef.current
      : factsRef.current;
    target?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [vm]);

  if (!vm) return null;

  const hl = (layer: DrilldownViewModel["focus"]) =>
    vm.focus === layer ? { boxShadow: "inset 2px 0 0 " + VIOLET, paddingLeft: 12 } : {};

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Evidence drilldown: ${vm.title}`}
      style={{ position: "fixed", inset: 0, zIndex: 1000, fontFamily: FONT }}
    >
      {/* overlay */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(2,6,16,0.55)" }} />

      {/* panel */}
      <div style={{
        position: "absolute", top: 0, right: 0, height: "100%", width: "min(440px, 92vw)",
        background: PANEL, borderLeft: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column",
      }}>
        {/* header */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: VIOLET, textTransform: "uppercase", letterSpacing: "0.09em", padding: "2px 7px", borderRadius: 4, background: "rgba(196,181,253,0.10)", border: "1px solid rgba(196,181,253,0.25)" }}>
                Evidence Drilldown
              </span>
              {vm.analysisOnlyBadge && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: AMBER_FG, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 7px", borderRadius: 4, background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.3)" }}>
                  Analysis Only
                </span>
              )}
            </div>
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: MUTE, fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 2 }}>×</button>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>{vm.title}</div>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 28px" }}>
          {/* Layer 1 — Facts */}
          {vm.facts.length > 0 && (
            <div ref={factsRef} style={{ marginBottom: 22, ...hl("facts") }}>
              <div style={SECTION_LABEL}>Facts</div>
              {vm.facts.map((f, i) => <FactBlock key={i} f={f} />)}
            </div>
          )}

          {/* Layer 2 — Computation */}
          {vm.computation && (
            <div ref={compRef} style={{ marginBottom: 22, ...hl("computation") }}>
              <div style={SECTION_LABEL}>Computation</div>
              <ComputationBlock c={vm.computation} />
            </div>
          )}

          {/* Layer 3 — Implication */}
          {vm.implication && (
            <div ref={implRef} style={{ marginBottom: 8, ...hl("implication") }}>
              <div style={SECTION_LABEL}>Implication</div>
              <ImplicationBlock im={vm.implication} />
            </div>
          )}

          {vm.facts.length === 0 && !vm.computation && !vm.implication && (
            <div style={{ fontSize: 12, color: MUTE, fontStyle: "italic" }}>
              No detail is available for this item in the current view model.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
