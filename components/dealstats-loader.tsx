"use client";

import React, { useState } from "react";

const INDUSTRIES: Record<string, string> = {
  plumbing: "Plumbing", hvac: "HVAC", landscaping: "Landscaping", carwash: "Car Wash",
  dental: "Dental Practice", gym: "Gym / Fitness", restaurant: "Restaurant", autorepair: "Auto Repair",
  cleaning: "Cleaning Service", ecommerce: "Ecommerce", saas: "SaaS", insurance: "Insurance",
  roofing: "Roofing", petcare: "Pet Care", pharmacy: "Pharmacy", daycare: "Daycare",
  medspa: "Med Spa", accounting: "Accounting", electrical: "Electrical",
  healthcare: "Healthcare", transportation: "Transportation", printing: "Printing",
  storage: "Self-Storage", painting: "Painting", security: "Security", laundromat: "Laundromat",
};

interface DealRecord {
  mvic_price: number | null;
  revenue: number | null;
  sde: number | null;
  ebitda: number | null;
  operating_profit: number | null;
  assets: number | null;
  operating_margin_pct: number | null;
  sde_margin_pct: number | null;
  ebitda_margin_pct: number | null;
  sale_year: number;
}

export default function DealStatsLoader() {
  const [industryKey, setIndustryKey] = useState("");
  const [naicsCode, setNaicsCode] = useState("");
  const [batchName, setBatchName] = useState("");
  const [pastedData, setPastedData] = useState("");
  const [records, setRecords] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: number } | null>(null);
  const [error, setError] = useState("");

  const extractData = async () => {
    setLoading(true);
    setError("");
    setRecords([]);

    if (!industryKey) { setError("Please select an industry"); setLoading(false); return; }
    if (!pastedData.trim()) { setError("Please paste transaction data"); setLoading(false); return; }

    try {
      const res = await fetch("/api/extract-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Extract individual transaction data from this DealStats NAICS report. Each row represents a single closed business sale.

The data should include these fields for each transaction:
- mvic_price: Market Value of Invested Capital (the sale price)
- revenue: Annual revenue
- sde: Seller's Discretionary Earnings
- ebitda: EBITDA
- operating_profit: Operating profit
- assets: Total assets
- operating_margin_pct: Operating margin as a percentage (e.g., 15.2)
- sde_margin_pct: SDE margin as a percentage
- ebitda_margin_pct: EBITDA margin as a percentage
- sale_year: Year of the transaction

Return a JSON array of objects. Parse all numbers (remove $, commas, %). Convert "N/A" or blank to null. If margins are provided as percentages, keep as plain numbers (15.2% = 15.2).

ONLY return the JSON array. No other text.

Data to parse:
${pastedData}`,
        }),
      });

      const data = await res.json();
      const text = data.content || data.text || "";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const match = cleaned.match(/\[[\s\S]*\]/);

      if (match) {
        const parsed = JSON.parse(match[0]);
        setRecords(parsed);
      } else {
        setError("Could not parse AI response. Try reformatting the pasted data.");
      }
    } catch {
      setError("Extraction failed. Check your data format.");
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    setUploading(true);
    setResult(null);
    try {
      const res = await fetch("/api/load-dstats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records, naicsCode, industryKey, batchName: batchName || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.results);
        setRecords([]);
        setPastedData("");
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    }
    setUploading(false);
  };

  const fmt = (v: number | null) => v != null ? `$${v.toLocaleString()}` : "—";
  const pct = (v: number | null) => v != null ? `${v.toFixed(1)}%` : "—";

  return (
    <div style={{ minHeight: "100vh", background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        textarea:focus,input:focus,select:focus{outline:none;border-color:rgba(99,102,241,0.4)!important}
      `}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 60px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>📈 DStats Transaction Loader</h1>
        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 24px" }}>
          Load individual closed transaction data from NAICS reports. Each transaction becomes a data point in your proprietary benchmark engine.
        </p>

        {/* Config */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>NexTax Industry</div>
            <select value={industryKey} onChange={(e) => setIndustryKey(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#E2E8F0", fontSize: 13 }}>
              <option value="">Select industry...</option>
              {Object.entries(INDUSTRIES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>NAICS Code</div>
            <input type="text" placeholder="e.g., 238220" value={naicsCode} onChange={(e) => setNaicsCode(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Batch Name (optional)</div>
            <input type="text" placeholder="e.g., dealstats-plumbing-2026" value={batchName} onChange={(e) => setBatchName(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13 }} />
          </div>
        </div>

        {/* Data Input */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Paste Transaction Report Data</div>
            <div style={{ fontSize: 10, color: "#4B5563" }}>{pastedData.length} chars</div>
          </div>
          <textarea
            placeholder={"Paste the transaction report data here...\n\nYou can paste:\n• Individual transaction rows from a transaction report\n• A full NAICS summary table with MVIC, Revenue, SDE, EBITDA, margins\n• Multiple transactions at once\n\nAI will extract and parse each transaction automatically."}
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
            style={{ width: "100%", minHeight: 220, padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 12, lineHeight: 1.6, resize: "vertical", fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>

        <button onClick={extractData} disabled={loading || !pastedData || !industryKey} style={{
          width: "100%", padding: "14px", borderRadius: 10, border: "none",
          background: loading || !pastedData || !industryKey ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
          color: loading || !pastedData || !industryKey ? "#6B7280" : "#fff",
          fontSize: 15, fontWeight: 700, cursor: loading || !pastedData || !industryKey ? "not-allowed" : "pointer", marginBottom: 16,
        }}>
          {loading ? "🔄 Extracting Transactions..." : "📈 Extract Transactions from Paste"}
        </button>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>✕ {error}</div>
        )}

        {/* Preview Table */}
        {records.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#10B981", margin: "0 0 12px" }}>✓ Extracted {records.length} transactions for {INDUSTRIES[industryKey] || industryKey}</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  {["#", "MVIC Price", "Revenue", "SDE", "EBITDA", "Op Profit", "Assets", "SDE Margin", "EBITDA Margin", "Year"].map((h) => (
                    <th key={h} style={{ padding: "6px 8px", fontSize: 9, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {records.slice(0, 50).map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#6B7280", textAlign: "center" }}>{i + 1}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.mvic_price)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.revenue)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.sde)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.ebitda)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.operating_profit)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.assets)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{pct(r.sde_margin_pct)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{pct(r.ebitda_margin_pct)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#6B7280", textAlign: "center" }}>{r.sale_year || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length > 50 && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 8, textAlign: "center" }}>Showing 50 of {records.length} transactions</div>}
            </div>

            <button onClick={handleUpload} disabled={uploading} style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none", marginTop: 14,
              background: uploading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #10B981, #059669)",
              color: "#fff", fontSize: 15, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer",
            }}>
              {uploading ? "Uploading..." : `📤 Load ${records.length} Transactions into Supabase`}
            </button>
          </div>
        )}

        {result && (
          <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#10B981", marginBottom: 6 }}>✓ Upload Complete</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>
              Inserted: {result.inserted} • Skipped: {result.skipped} • Errors: {result.errors} • Benchmarks auto-computed
            </div>
          </div>
        )}

        {/* What This Powers */}
        <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.1)", marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#818CF8", marginBottom: 8 }}>🔌 What Transaction Data Powers</div>
          <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.7 }}>
            • <strong style={{ color: "#94A3B8" }}>Transaction multiples:</strong> Real MVIC/SDE and MVIC/EBITDA ratios from closed deals<br />
            • <strong style={{ color: "#94A3B8" }}>Size-band benchmarks:</strong> Median multiples segmented by revenue band<br />
            • <strong style={{ color: "#94A3B8" }}>Margin benchmarks:</strong> Real SDE, EBITDA, and operating margins from completed transactions<br />
            • <strong style={{ color: "#94A3B8" }}>Three-lens scoring upgrade:</strong> Precise transaction-level data enhances scoring accuracy<br />
            • <strong style={{ color: "#94A3B8" }}>Confidence boost:</strong> Individual transactions increase sample size for confidence scoring
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <a href="/admin/isbenchmark" style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.08)", color: "#818CF8", fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>← ISBenchmark Loader</a>
          <a href="/admin/import" style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#6B7280", fontSize: 13, fontWeight: 500, textAlign: "center", textDecoration: "none" }}>Deal Import Tool →</a>
        </div>
      </div>
    </div>
  );
}
