// components/OutcomeModal.tsx
//
// Compact outcome-recording modal. Captures the minimum viable outcome data
// that compounds into proprietary training data over time.

"use client";

import React, { useState, useEffect } from "react";
import {
  DealOutcome, DealOutcomeStatus, FinancingType,
  FINANCING_LABELS, OUTCOME_LABELS,
  fetchOutcome, saveOutcome,
} from "@/lib/dealOutcomes";

interface OutcomeModalProps {
  dealRunId:      string;
  userId:         string;
  dealSummary:    string;       // e.g. "Specialty Trade · TX · $2.45M"
  askingPrice:    number;        // for default final_price
  onClose:        () => void;
  onSaved:        (outcome: DealOutcome) => void;
}

const STATUS_CONFIG: Record<DealOutcomeStatus, { color: string; bg: string; bd: string }> = {
  closed:  { color: "#10B981", bg: "rgba(16,185,129,0.08)",  bd: "rgba(16,185,129,0.4)"  },
  in_loi:  { color: "#60A5FA", bg: "rgba(96,165,250,0.08)",  bd: "rgba(96,165,250,0.4)"  },
  walked:  { color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  bd: "rgba(245,158,11,0.4)"  },
  stale:   { color: "#94A3B8", bg: "rgba(148,163,184,0.08)", bd: "rgba(148,163,184,0.4)" },
};

const FINANCING_ORDER: FinancingType[] = [
  "sba_7a", "conventional", "seller_note", "all_cash", "sba_plus_seller", "sba_plus_conventional",
];

export function OutcomeModal({
  dealRunId, userId, dealSummary, askingPrice, onClose, onSaved,
}: OutcomeModalProps) {
  const [outcome, setOutcome]         = useState<DealOutcomeStatus>("closed");
  const [finalPrice, setFinalPrice]   = useState<string>("");
  const [financing, setFinancing]     = useState<Set<FinancingType>>(new Set());
  const [notes, setNotes]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [error, setError]             = useState("");

  // Load existing outcome if it exists
  useEffect(() => {
    let cancelled = false;
    fetchOutcome(dealRunId).then((existing) => {
      if (cancelled) return;
      if (existing) {
        setOutcome(existing.outcome);
        setFinalPrice(existing.final_price ? String(existing.final_price) : "");
        setFinancing(new Set(existing.financing_types as FinancingType[]));
        setNotes(existing.notes ?? "");
      }
      setLoadingExisting(false);
    });
    return () => { cancelled = true; };
  }, [dealRunId]);

  // Default final_price to asking_price for "closed" if not set
  useEffect(() => {
    if (outcome === "closed" && !finalPrice && askingPrice) {
      setFinalPrice(String(askingPrice));
    }
  }, [outcome, askingPrice]);  // eslint-disable-line

  const toggleFinancing = (f: FinancingType) => {
    const next = new Set(financing);
    next.has(f) ? next.delete(f) : next.add(f);
    setFinancing(next);
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    const priceNum = finalPrice.replace(/[^\d]/g, "");
    const saved = await saveOutcome({
      deal_run_id:     dealRunId,
      user_id:         userId,
      outcome,
      final_price:     priceNum ? parseInt(priceNum, 10) : null,
      financing_types: Array.from(financing),
      notes:           notes.trim() || null,
    });
    setLoading(false);
    if (!saved) {
      setError("Failed to save. Please try again.");
      return;
    }
    onSaved(saved);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 300,
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(90vw, 440px)",
        maxHeight: "90vh",
        overflowY: "auto",
        background: "#0D1117",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        padding: 22,
        zIndex: 301,
        fontFamily: "'Inter Tight', sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 4 }}>
              Record Deal Outcome
            </div>
            <div style={{ fontSize: 14, color: "#F1F5F9", fontWeight: 500 }}>
              {dealSummary}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none", border: "none", color: "#7C8593",
              fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 0,
              width: 24, height: 24,
            }}
          >×</button>
        </div>

        {loadingExisting ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#7C8593", fontSize: 12 }}>
            Loading…
          </div>
        ) : (
          <>
            {/* Status selector */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 9 }}>
                What happened?
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {(Object.keys(OUTCOME_LABELS) as DealOutcomeStatus[]).map(key => {
                  const active = outcome === key;
                  const cfg    = STATUS_CONFIG[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setOutcome(key)}
                      style={{
                        padding: "9px 4px",
                        borderRadius: 7,
                        border: `1px solid ${active ? cfg.bd : "rgba(255,255,255,0.08)"}`,
                        background: active ? cfg.bg : "rgba(255,255,255,0.02)",
                        color: active ? cfg.color : "#7C8593",
                        fontSize: 11, fontWeight: active ? 600 : 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "background 140ms ease",
                      }}
                    >
                      {OUTCOME_LABELS[key]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Final price (only when closed) */}
            {outcome === "closed" && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 7 }}>
                  Final Price
                </div>
                <div style={{
                  display: "flex", alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 7,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                }}>
                  <span style={{ color: "#7C8593", fontSize: 13, marginRight: 6 }}>$</span>
                  <input
                    type="text"
                    value={finalPrice ? parseInt(finalPrice.replace(/[^\d]/g, ""), 10).toLocaleString() : ""}
                    onChange={(e) => setFinalPrice(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="2,180,000"
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      color: "#E2E8F0", fontSize: 13,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Financing (multi-select chips) */}
            {(outcome === "closed" || outcome === "in_loi") && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 7 }}>
                  Financing {outcome === "in_loi" && "(planned)"}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {FINANCING_ORDER.map(ft => {
                    const active = financing.has(ft);
                    return (
                      <button
                        key={ft}
                        onClick={() => toggleFinancing(ft)}
                        style={{
                          padding: "5px 11px",
                          borderRadius: 20,
                          border: `1px solid ${active ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}`,
                          background: active ? "rgba(96,165,250,0.08)" : "transparent",
                          color: active ? "#60A5FA" : "#7C8593",
                          fontSize: 10, fontWeight: active ? 600 : 500,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "background 140ms ease",
                        }}
                      >
                        {FINANCING_LABELS[ft]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 7 }}>
                Notes <span style={{ color: "#7C8593", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(optional)</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  outcome === "walked"  ? "Why you walked — e.g. QoE issues, customer concentration…"
                  : outcome === "closed" ? "Any surprises — e.g. closed 12% below ask after QoE…"
                  :                        "Anything worth remembering about this deal"
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 7,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#E2E8F0",
                  fontSize: 12,
                  lineHeight: 1.5,
                  resize: "vertical" as const,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: "8px 11px", borderRadius: 7, marginBottom: 12,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                fontSize: 11, color: "#F87171",
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 7,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  color: "#94A3B8",
                  fontSize: 12, fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  flex: 2,
                  padding: 10,
                  borderRadius: 7,
                  border: "none",
                  background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366F1,#8B5CF6)",
                  color: "#fff",
                  fontSize: 12, fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  transition: "opacity 140ms ease",
                }}
              >
                {loading ? "Saving…" : "Save outcome"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default OutcomeModal;
