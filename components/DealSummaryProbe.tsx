// components/DealSummaryProbe.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 data-contract probe.
//
// PURPOSE: prove the /api/deals/[id]/summary route end-to-end by rendering the
// engine-shaped payload faithfully. This is NOT a designed dashboard view —
// layout, copy, and visual treatment are deliberately minimal and will be
// decided in a later phase against the frozen API response.
//
// Per API-CONTRACT-PRINCIPLES.md Principle 3, this component renders the
// engine's categorical truth VERBATIM:
//   - readiness classification shown as its literal enum value
//   - the four impact counts shown as distinct numbers (not merged)
//   - NO traffic-light flattening, NO invented health score
//
// When we build the real dashboard view, presentation transforms (colors,
// friendly labels, collapsing) live HERE in the component layer — never in
// the API or the engine.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import React from "react";
import { useDealSummary } from "@/lib/api-client/useDealSummary";

export function DealSummaryProbe({
  dealId,
  snapshotId,
  thresholdManifestId,
}: {
  dealId: string;
  snapshotId?: string;
  thresholdManifestId?: string;
}) {
  const { loading, report, manifestId, generatedAt, error, httpStatus } =
    useDealSummary(dealId, { snapshotId, thresholdManifestId });

  // ── Loading ──
  if (loading) {
    return (
      <div style={box}>
        <div style={muted}>Loading operational summary…</div>
      </div>
    );
  }

  // ── Error (operational or transport) ──
  if (error) {
    return (
      <div style={box}>
        <div style={{ ...label, color: "#F59E0B" }}>
          Summary unavailable
        </div>
        <div style={mono}>error_kind: {error.kind}</div>
        <div style={muted}>{error.reason}</div>
        {httpStatus != null && (
          <div style={{ ...muted, marginTop: 6 }}>HTTP {httpStatus}</div>
        )}
      </div>
    );
  }

  // ── Empty (shouldn't happen on success, defensive) ──
  if (!report) {
    return (
      <div style={box}>
        <div style={muted}>No summary data.</div>
      </div>
    );
  }

  // ── Success — render engine shape verbatim ──
  const r = report.readiness;
  const ir = report.impact_ranking;
  const sp = report.stalled_paths;
  const st = report.structural_trajectories;
  const mc = report.material_changes;

  return (
    <div style={box}>
      {/* Provenance line */}
      <div style={{ ...muted, marginBottom: 12 }}>
        manifest: <span style={monoInline}>{manifestId}</span>
        {"  ·  "}
        computed: <span style={monoInline}>{generatedAt}</span>
        {"  ·  "}
        snapshot: <span style={monoInline}>{report.snapshot_id}</span>
      </div>

      {/* Readiness — categorical truth, verbatim */}
      <div style={section}>
        <div style={label}>Readiness Classification</div>
        <div style={mono}>{r.classification}</div>
        <div style={muted}>
          interested {r.interested_personality_count} · cautious{" "}
          {r.cautious_personality_count} · declined{" "}
          {r.declined_personality_count} · blocking structural concerns{" "}
          {r.blocking_structural_concern_count} · missing evidence{" "}
          {r.missing_evidence_count}
        </div>
        {r.contributing_factors.length > 0 && (
          <div style={{ ...muted, marginTop: 6 }}>
            factors:{" "}
            {r.contributing_factors
              .map((f) => `${f.axis_or_dimension}/${f.state}`)
              .join(", ")}
          </div>
        )}
      </div>

      {/* Impact ranking — four distinct counts, NOT merged */}
      <div style={section}>
        <div style={label}>Impact Ranking</div>
        <div style={mono}>
          critical {ir.critical_count} · high {ir.high_count} · moderate{" "}
          {ir.moderate_count} · low {ir.low_count}
        </div>
        <div style={muted}>
          {ir.ranked_items.length} ranked items ·{" "}
          {ir.workflow_groups.length} workflow groups
        </div>
      </div>

      {/* Stalled paths */}
      <div style={section}>
        <div style={label}>Stalled Paths</div>
        <div style={mono}>{sp.stalled_path_count} stalled</div>
      </div>

      {/* Structural trajectories — six distinct counts */}
      <div style={section}>
        <div style={label}>Structural Trajectories</div>
        <div style={mono}>
          worsening {st.worsening_count} · improving {st.improving_count} ·
          persistent {st.persistent_stable_count} · intermittent{" "}
          {st.intermittent_count} · emerging {st.emerging_count} · resolved{" "}
          {st.resolved_count}
        </div>
      </div>

      {/* Material changes — null when no parent snapshot */}
      <div style={section}>
        <div style={label}>Material Changes</div>
        {mc === null ? (
          <div style={muted}>
            No parent snapshot — material changes not computable for the
            first evaluation.
          </div>
        ) : (
          <div style={mono}>{mc.material_change_count} material changes</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal inline styles — intentionally undesigned
// ─────────────────────────────────────────────────────────────────────────────

const box: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "16px 18px",
  background: "rgba(255,255,255,0.02)",
  fontFamily: "'Inter Tight', system-ui, sans-serif",
};
const section: React.CSSProperties = {
  paddingTop: 10,
  marginTop: 10,
  borderTop: "1px solid rgba(255,255,255,0.06)",
};
const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#7C8593",
  marginBottom: 4,
};
const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13,
  color: "#E2E8F0",
  marginBottom: 3,
};
const monoInline: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  color: "#A5B4FC",
};
const muted: React.CSSProperties = {
  fontSize: 11,
  color: "#94A3B8",
  lineHeight: 1.5,
};
