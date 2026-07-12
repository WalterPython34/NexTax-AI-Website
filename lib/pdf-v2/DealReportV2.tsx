// lib/pdf-v2/DealReportV2.tsx
// REACT-PDF SPIKE — proves the render chain on deployed Vercel.
// Deliberately minimal: built-in Helvetica only (zero network font deps).
// Brand font registration (Spectral/Inter/JetBrains Mono via Font.register)
// is step 2 AFTER the chain is proven — one variable at a time.

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page:    { padding: 48, fontFamily: "Helvetica", fontSize: 10, color: "#1a2332" },
  brand:   { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#3d5443" },
  tagline: { fontSize: 9, color: "#a06940", marginTop: 2, marginBottom: 24 },
  h1:      { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  sub:     { fontSize: 9, color: "#6b7280", marginBottom: 20 },
  section: { marginTop: 18, paddingTop: 10, borderTop: "1 solid #e5e0d5" },
  label:   { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 },
  row:     { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  cell:    { width: "23%" },
  metric:  { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 },
  body:    { marginTop: 6, lineHeight: 1.5 },
  badge:   { marginTop: 10, padding: 8, backgroundColor: "#faf7f0", border: "1 solid #e5e0d5" },
  footer:  { position: "absolute", bottom: 28, left: 48, right: 48, fontSize: 7,
             color: "#9ca3af", borderTop: "1 solid #e5e0d5", paddingTop: 6 },
});

export interface SpikeDeal {
  id: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  revenue: number | null;
  sde: number | null;
  asking_price: number | null;
  dscr: number | null;
  overall_score: number | null;
  verdict: string | null;            // v2.0 rows only — drives the conditional section
  confidence_grade: string | null;
  divergence_band: string | null;
}

const money = (v: number | null) =>
  v == null ? "—" : `$${Math.round(v).toLocaleString()}`;

export function DealReportV2({ deal }: { deal: SpikeDeal }) {
  return (
    <Document title={`AcquiFlow Deal Report v2 — ${deal.industry ?? "Deal"}`}>
      {/* Page 1 — cover + key metrics (the "real data section") */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.brand}>AcquiFlow</Text>
        <Text style={s.tagline}>REPORT ENGINE V2 — RENDER SPIKE</Text>

        <Text style={s.h1}>
          {(deal.industry ?? "Unknown Industry")} {deal.city ? `· ${deal.city}, ${deal.state ?? ""}` : ""}
        </Text>
        <Text style={s.sub}>Deal {deal.id.slice(0, 8)} · Generated {new Date().toLocaleDateString("en-US")}</Text>

        <View style={s.section}>
          <Text style={s.label}>Key Metrics</Text>
          <View style={s.row}>
            <View style={s.cell}><Text style={s.label}>Asking</Text><Text style={s.metric}>{money(deal.asking_price)}</Text></View>
            <View style={s.cell}><Text style={s.label}>Revenue</Text><Text style={s.metric}>{money(deal.revenue)}</Text></View>
            <View style={s.cell}><Text style={s.label}>SDE</Text><Text style={s.metric}>{money(deal.sde)}</Text></View>
            <View style={s.cell}><Text style={s.label}>DSCR</Text><Text style={s.metric}>{deal.dscr != null ? `${deal.dscr.toFixed(2)}x` : "—"}</Text></View>
          </View>
        </View>

        {/* Conditional section — renders ONLY for v2.0 rows with a persisted verdict.
            This is the spike's proof that trigger-based sections are one boolean,
            not a page of Y-coordinate math. */}
        {deal.verdict && (
          <View style={s.section}>
            <Text style={s.label}>Server-Authoritative Verdict (v2.0)</Text>
            <View style={s.badge}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>
                {deal.verdict.replace(/_/g, " ").toUpperCase()}
              </Text>
              <Text style={s.body}>
                Confidence grade: {deal.confidence_grade ?? "n/a"} · Divergence: {deal.divergence_band ?? "n/a"}
              </Text>
            </View>
          </View>
        )}

        <Text style={s.footer} fixed>
          AcquiFlow render spike — not a client deliverable. Parallel engine at /api/reports-v2; legacy generator untouched.
        </Text>
      </Page>

      {/* Page 2 — flow test: proves multi-page + wrapped text reflow */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.label}>Page 2 — Layout Reflow Test</Text>
        <Text style={s.body}>
          This page exists to prove pagination and text flow. In the legacy jsPDF
          generator, every conditional section requires manual Y-coordinate
          re-derivation for all content below it. In this engine, the verdict
          section on page one appears or disappears based on a single condition,
          and layout resolves itself. That difference is the entire migration case:
          the Verification Case, investigation checklist, tax sections, and P&L
          benchmarking all become conditional components instead of coordinate math.
        </Text>
      </Page>
    </Document>
  );
}
