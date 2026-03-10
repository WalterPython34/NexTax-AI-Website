"use client";

import React, { useState, useRef } from "react";

const TRACKED_INDUSTRIES = [
  "Laundromat", "HVAC", "Landscaping", "Car Wash", "Dental Practice", "Gym/Fitness",
  "Restaurant", "Auto Repair", "Cleaning Service", "Ecommerce", "SaaS", "Insurance Agency",
  "Plumbing", "Roofing", "Pet Care", "Pharmacy", "Daycare", "Med Spa",
];

const SOURCE_PLATFORMS = ["BizBuySell", "Flippa", "Empire Flippers", "Acquire.com", "BizQuest", "BusinessBroker.net", "Other"];

// Column mapping presets per marketplace
const COLUMN_MAPS: Record<string, Record<string, string>> = {
  BizBuySell: { title: "Title", industry: "Category", location: "Location", revenue: "Gross Revenue", sde: "Cash Flow", price: "Asking Price", employees: "Employees", year_established: "Year Established" },
  Flippa: { title: "Title", industry: "Type", revenue: "Revenue", sde: "Profit", price: "Asking Price" },
  "Empire Flippers": { title: "Title", industry: "Niche", revenue: "Revenue", sde: "Net Profit", price: "List Price" },
  "Acquire.com": { title: "Title", industry: "Type", revenue: "Net Revenue", sde: "Net Revenue", price: "Asking Price" },
};

interface ImportResult {
  total: number;
  imported: number;
  skipped_industry: number;
  skipped_threshold: number;
  skipped_missing: number;
  duplicates: number;
  estimated_sde: number;
  errors: number;
  confidence: { high: number; medium: number; low: number };
  rejections: { row: number; reason: string; details: string; industry?: string }[];
}

export default function DealImportTool() {
  const [source, setSource] = useState("BizBuySell");
  const [batchName, setBatchName] = useState("");
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [parsedCount, setParsedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(/[,\t]/).map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const values = line.split(/[,\t]/).map((v) => v.trim().replace(/^"|"$/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return obj;
    }).filter((row) => Object.values(row).some((v) => v.length > 0));
  };

  const handleFileUpload = async (f: File) => {
    setFile(f);
    if (f.name.endsWith(".csv") || f.name.endsWith(".tsv") || f.name.endsWith(".txt")) {
      const text = await f.text();
      setRawText(text);
      setParsedCount(parseCSV(text).length);
    } else if (f.name.endsWith(".xlsx") || f.name.endsWith(".xls")) {
      setError("Please export your spreadsheet as CSV first, then upload the CSV file.");
    }
  };

  const handlePasteChange = (text: string) => {
    setRawText(text);
    try { setParsedCount(parseCSV(text).length); } catch { setParsedCount(0); }
  };

  const handleImport = async () => {
    setImporting(true); setError(""); setResult(null);

    try {
      const listings = parseCSV(rawText);
      if (listings.length === 0) { setError("No valid data found. Check your CSV format."); setImporting(false); return; }

      // Map columns based on source platform
      const colMap = COLUMN_MAPS[source] || {};
      const normalized = listings.map((row) => {
        const mapped: Record<string, string> = {};
        // Try mapped column names first, then fall back to standard names
        for (const [standard, marketplace] of Object.entries(colMap)) {
          mapped[standard] = row[marketplace] || row[standard] || "";
        }
        // Also pass through any unmapped fields
        Object.entries(row).forEach(([k, v]) => { if (!mapped[k]) mapped[k] = v; });
        return mapped;
      });

      const res = await fetch("/api/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listings: normalized, source_platform: source, batch_name: batchName.trim() || null }),
      });

      const data = await res.json();
      if (data.success) { setResult(data.results); }
      else { setError(data.error || "Import failed."); }
    } catch (err) {
      setError("Import failed: " + String(err));
    }
    setImporting(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}select,input,textarea{font-family:'DM Sans',sans-serif}
        select:focus,input:focus,textarea:focus{border-color:rgba(99,102,241,0.5)!important;outline:none}
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>N</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#E2E8F0" }}>Deal Data Import</h1>
            <span style={{ fontSize: 12, color: "#6B7280" }}>Bulk import marketplace listings into NexTax Deal Intelligence</span>
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          {/* Source Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Source Marketplace</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SOURCE_PLATFORMS.map((s) => (
                <button key={s} onClick={() => setSource(s)} style={{
                  padding: "8px 16px", borderRadius: 8, border: source === s ? "1.5px solid #6366F1" : "1px solid rgba(255,255,255,0.08)",
                  background: source === s ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                  color: source === s ? "#818CF8" : "#6B7280", fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Batch Name</label>
            <input
              type="text" value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder={`${new Date().toISOString().split("T")[0]}-${source.toLowerCase().replace(/[.\s]/g, "")}-industry`}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: "none" }}
            />
            <div style={{ fontSize: 10, color: "#4B5563", marginTop: 4 }}>Used for tracking, debugging, and undoing imports. Example: 2026-03-10-bizbuysell-hvac</div>
          </div>

          {/* Download Template */}
          <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 10, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#818CF8" }}>Download Import Template</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Excel template with per-marketplace sheets and column mapping</div>
              </div>
              <a href="/NexTax-Deal-Import-Template.xlsx" download style={{
                padding: "8px 16px", borderRadius: 8, background: "rgba(99,102,241,0.15)", color: "#818CF8",
                fontSize: 12, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(99,102,241,0.2)",
              }}>
                📥 Download .xlsx
              </a>
            </div>
          </div>

          {/* Input Methods */}
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "22px 22px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", marginBottom: 14 }}>Paste CSV Data or Upload File</div>

            {/* Paste area */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase" }}>
                Paste CSV / Tab-Separated Data
              </label>
              <textarea
                value={rawText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={"Title,Location,Category,Asking Price,Gross Revenue,Cash Flow,Employees\nHVAC Company,Dallas TX,HVAC,850000,1200000,320000,15\nCleaning Service,Austin TX,Cleaning,475000,520000,145000,12"}
                style={{
                  width: "100%", minHeight: 180, padding: "12px 14px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)",
                  color: "#E2E8F0", fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                  resize: "vertical", outline: "none", lineHeight: 1.6,
                }}
              />
              {parsedCount > 0 && (
                <div style={{ fontSize: 11, color: "#10B981", marginTop: 4 }}>✓ {parsedCount} rows detected</div>
              )}
            </div>

            {/* File upload */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontSize: 11, color: "#4B5563" }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            <label style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 16px", borderRadius: 10, border: "1.5px dashed rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.02)", cursor: "pointer",
            }}>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              {file ? (
                <span style={{ fontSize: 13, color: "#10B981", fontWeight: 500 }}>📄 {file.name} ({parsedCount} rows)</span>
              ) : (
                <span style={{ fontSize: 13, color: "#6B7280" }}>📤 Upload CSV file</span>
              )}
            </label>
          </div>

          {/* Industry Filter Info */}
          <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, fontWeight: 500 }}>
              Only these industries will be imported
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TRACKED_INDUSTRIES.map((ind) => (
                <span key={ind} style={{
                  padding: "3px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)",
                  fontSize: 11, color: "#94A3B8",
                }}>{ind}</span>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: 13, color: "#FCA5A5" }}>
              {error}
            </div>
          )}

          {/* Import Button */}
          <button onClick={handleImport} disabled={importing || !rawText.trim()}
            style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none",
              background: rawText.trim() && !importing ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : "rgba(255,255,255,0.08)",
              color: rawText.trim() ? "#fff" : "#6B7280", fontSize: 15, fontWeight: 700,
              cursor: rawText.trim() && !importing ? "pointer" : "not-allowed",
              fontFamily: "'DM Sans', sans-serif", opacity: importing ? 0.7 : 1,
            }}>
            {importing ? "Importing..." : `🚀 Import ${parsedCount > 0 ? parsedCount + " Listings" : "Data"} from ${source}`}
          </button>

          {/* Results */}
          {result && (
            <div style={{ marginTop: 20, padding: "20px 22px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", margin: "0 0 14px" }}>Import Results</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "Total Rows", value: result.total, color: "#94A3B8" },
                  { label: "Imported", value: result.imported, color: "#10B981" },
                  { label: "Bad Industry", value: result.skipped_industry, color: "#F59E0B" },
                  { label: "Too Small", value: result.skipped_threshold, color: "#F97316" },
                  { label: "Missing Data", value: result.skipped_missing, color: "#EF4444" },
                  { label: "Duplicates", value: result.duplicates, color: "#6B7280" },
                ].map((m) => (
                  <div key={m.label} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
                    <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase" }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Confidence Breakdown */}
              {result.imported > 0 && (
                <div style={{ marginBottom: 14, padding: "12px 16px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>Data Confidence</div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ fontSize: 12, color: "#10B981" }}>High: <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{result.confidence.high}</span></div>
                    <div style={{ fontSize: 12, color: "#F59E0B" }}>Medium: <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{result.confidence.medium}</span></div>
                    <div style={{ fontSize: 12, color: "#F97316" }}>Low: <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{result.confidence.low}</span></div>
                  </div>
                  {result.estimated_sde > 0 && (
                    <div style={{ fontSize: 11, color: "#F59E0B", marginTop: 6 }}>
                      ⚠ {result.estimated_sde} listings had SDE estimated from revenue × industry margin
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Log */}
              {result.rejections.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>Rejection Log ({result.rejections.length} items)</div>
                  <div style={{ maxHeight: 200, overflowY: "auto", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                    {result.rejections.slice(0, 50).map((r, i) => (
                      <div key={i} style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", gap: 8, alignItems: "baseline" }}>
                        <span style={{ fontSize: 10, color: "#4B5563", fontFamily: "'JetBrains Mono', monospace", minWidth: 36 }}>Row {r.row}</span>
                        <span style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 500,
                          background: r.reason === "unknown_industry" ? "rgba(245,158,11,0.1)" : r.reason === "below_threshold" ? "rgba(249,115,22,0.1)" : r.reason === "duplicate" ? "rgba(107,114,128,0.1)" : "rgba(239,68,68,0.1)",
                          color: r.reason === "unknown_industry" ? "#F59E0B" : r.reason === "below_threshold" ? "#F97316" : r.reason === "duplicate" ? "#6B7280" : "#EF4444",
                        }}>{r.reason}</span>
                        <span style={{ fontSize: 11, color: "#8896A6" }}>{r.details}</span>
                      </div>
                    ))}
                    {result.rejections.length > 50 && (
                      <div style={{ padding: "8px 12px", fontSize: 11, color: "#4B5563" }}>...and {result.rejections.length - 50} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
