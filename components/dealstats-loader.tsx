"use client";

import React, { useState, useRef } from "react";

const INDUSTRIES: Record<string, string> = {
  plumbing: "Plumbing", hvac: "HVAC", landscaping: "Landscaping", carwash: "Car Wash",
  dental: "Dental Practice", gym: "Gym / Fitness", restaurant: "Restaurant", autorepair: "Auto Repair",
  cleaning: "Cleaning Service", ecommerce: "Ecommerce", saas: "SaaS", insurance: "Insurance",
  roofing: "Roofing", petcare: "Pet Care", pharmacy: "Pharmacy", daycare: "Daycare",
  medspa: "Med Spa", accounting: "Accounting", electrical: "Electrical",
  healthcare: "Healthcare", transportation: "Transportation", printing: "Printing",
  storage: "Self-Storage", painting: "Painting", security: "Security", laundromat: "Laundromat",
};

function mapColumn(header: string): string | null {
  // Strip BOM, whitespace, special chars, and normalize
  const h = header.replace(/[\ufeff\u200b\u00a0]/g, "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!h) return null;
  // MVIC Price
  if (h.includes("mvic") || h === "saleprice" || h === "sellingprice" || h === "price") return "mvic_price";
  // Revenue (check before "operating" since both contain common letters)
  if (h === "revenue" || h === "sales" || h === "totalrevenue" || h === "annualrevenue" || h === "grossrevenue") return "revenue";
  // SDE Margin (must check before SDE)
  if (h === "sdemargin" || h === "demargin" || h === "discretionarymargin") return "sde_margin_pct";
  // SDE
  if (h === "sde" || h === "discretionaryearnings" || h === "sellersdiscretionaryearnings" || h === "de" || h === "cashflow") return "sde";
  // EBITDA Margin (must check before EBITDA)
  if (h === "ebitdamargin") return "ebitda_margin_pct";
  // EBITDA
  if (h === "ebitda" || h === "ebitda") return "ebitda";
  // Operating Margin (must check before Operating Profit)
  if (h === "operatingmargin" || h === "opmargin") return "operating_margin_pct";
  // Operating Profit
  if (h === "operatingprofit" || h === "operatingincome" || h === "opincome" || h === "ebit") return "operating_profit";
  // Assets
  if (h === "assets" || h === "totalassets") return "assets";
  // Transaction Date
  if (h === "transactiondate" || h === "saledate" || h === "closedate" || h === "date" || h === "solddate") return "sale_date";
  // NAICS
  if (h === "naics" || h === "naicscode" || h === "industrycode") return "naics_code";
  // Description
  if (h === "description" || h === "naicsdescription" || h === "industry" || h === "businesstype") return "naics_description";
  // Deal type
  if (h === "dealtype" || h === "transactiontype" || h === "saletype") return "deal_type";
  return null;
}

function parseNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  let s = String(val).trim();
  if (s === "" || s === "N/A" || s === "n/a" || s === "-" || s === "--" || s === "NA" || s === "null" || s === "undefined") return null;
  // Handle parenthetical negatives: ($1,234) or (1234)
  const isNeg = /^\(.*\)$/.test(s);
  // Strip everything except digits, dots, and minus signs
  s = s.replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "." || s === "-") return null;
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return isNeg ? -Math.abs(n) : n;
}

function parseYear(val: unknown): number | null {
  if (!val) return null;
  if (typeof val === "number") {
    // Excel serial date
    if (val > 30000 && val < 60000) {
      const d = new Date((val - 25569) * 86400000);
      return d.getFullYear();
    }
    if (val >= 1990 && val <= 2030) return val;
    return null;
  }
  const s = String(val);
  // Try to parse date string
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.getFullYear();
  // Try extracting 4-digit year
  const match = s.match(/(20\d{2}|19\d{2})/);
  return match ? parseInt(match[1]) : null;
}

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
  sale_year: number | null;
  sale_date: string | null;
  naics_code: string | null;
  naics_description: string | null;
  deal_type: string | null;
}

export default function DealStatsLoader() {
  const [industryKey, setIndustryKey] = useState("");
  const [naicsCode, setNaicsCode] = useState("");
  const [batchName, setBatchName] = useState("");
  const [records, setRecords] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: number } | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [mappedCols, setMappedCols] = useState<Record<string, string>>({});
  const [unmappedCols, setUnmappedCols] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setRecords([]);
    setFileName(file.name);

    try {
      let rows: Record<string, unknown>[] = [];

      // Always try text-based parsing first (handles CSV, TSV, and text exports)
      let text = await file.text();
      // Strip BOM
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      
      const allLines = text.split(/\r?\n/);
      
      // Skip empty rows at top to find actual header row
      let headerIdx = 0;
      for (let i = 0; i < allLines.length; i++) {
        const stripped = allLines[i].replace(/[,\t;"\s]/g, "");
        if (stripped.length > 0) { headerIdx = i; break; }
      }
      
      const lines = allLines.slice(headerIdx).filter((l) => l.trim());
      
      if (lines.length < 2) {
        setError("File has no data rows.");
        setLoading(false);
        return;
      }
      
      // Auto-detect delimiter: tab, comma, or semicolon
      const firstLine = lines[0];
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semiCount = (firstLine.match(/;/g) || []).length;
      const delimiter = tabCount >= commaCount && tabCount >= semiCount ? "\t" : commaCount >= semiCount ? "," : ";";
      
      const csvHeaders = firstLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, "").replace(/^\uFEFF/, ""));
      
      // Proper CSV line parser that handles commas inside quoted values
      function parseCsvLine(line: string, delim: string): string[] {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let c = 0; c < line.length; c++) {
          const ch = line[c];
          if (inQuotes) {
            if (ch === '"' && line[c + 1] === '"') { current += '"'; c++; }
            else if (ch === '"') { inQuotes = false; }
            else { current += ch; }
          } else {
            if (ch === '"') { inQuotes = true; }
            else if (ch === delim) { result.push(current); current = ""; }
            else { current += ch; }
          }
        }
        result.push(current);
        return result;
      }
      
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCsvLine(lines[i], delimiter);
        const row: Record<string, unknown> = {};
        csvHeaders.forEach((h, j) => {
          const v = (vals[j] || "").trim();
          row[h] = v === "" ? null : v;
        });
        rows.push(row);
      }

      if (rows.length === 0) {
        setError("No data rows found in file");
        setLoading(false);
        return;
      }

      // Map columns
      const fileHeaders = Object.keys(rows[0]);
      const colMap: Record<string, string> = {};
      const unmapped: string[] = [];

      fileHeaders.forEach((h) => {
        const mapped = mapColumn(h);
        if (mapped) {
          colMap[h] = mapped;
        } else {
          unmapped.push(h);
        }
      });

      setMappedCols(colMap);
      setUnmappedCols(unmapped);

      // Parse records
      const parsed: DealRecord[] = [];
      for (const row of rows) {
        const rec: Record<string, unknown> = {};
        for (const [origCol, mappedCol] of Object.entries(colMap)) {
          rec[mappedCol] = row[origCol];
        }

        const mvic = parseNum(rec.mvic_price);
        const revenue = parseNum(rec.revenue);
        const sde = parseNum(rec.sde);
        const ebitda = parseNum(rec.ebitda);
        const opProfit = parseNum(rec.operating_profit);
        const assets = parseNum(rec.assets);

        // Skip rows with no financial data
        if (mvic === null && revenue === null && sde === null) continue;

        // Parse margins - if they look like decimals (0-1), convert to percentage
        let opMargin = parseNum(rec.operating_margin_pct);
        let sdeMargin = parseNum(rec.sde_margin_pct);
        let ebitdaMargin = parseNum(rec.ebitda_margin_pct);

        if (opMargin !== null && opMargin > -1 && opMargin < 1) opMargin = +(opMargin * 100).toFixed(1);
        if (sdeMargin !== null && sdeMargin > -1 && sdeMargin < 1) sdeMargin = +(sdeMargin * 100).toFixed(1);
        if (ebitdaMargin !== null && ebitdaMargin > -1 && ebitdaMargin < 1) ebitdaMargin = +(ebitdaMargin * 100).toFixed(1);

        parsed.push({
          mvic_price: mvic,
          revenue,
          sde,
          ebitda,
          operating_profit: opProfit,
          assets,
          operating_margin_pct: opMargin,
          sde_margin_pct: sdeMargin,
          ebitda_margin_pct: ebitdaMargin,
          sale_year: parseYear(rec.sale_date) || parseYear(rec.sale_year),
          sale_date: rec.sale_date ? String(rec.sale_date) : null,
          naics_code: rec.naics_code ? String(rec.naics_code) : null,
          naics_description: rec.naics_description ? String(rec.naics_description) : null,
          deal_type: rec.deal_type ? String(rec.deal_type) : null,
        });
      }

      if (parsed.length === 0) {
        // Show sample row for debugging
        const sampleRow = rows[0];
        const sampleVals = Object.entries(colMap).map(([orig, mapped]) => `${mapped}: "${sampleRow[orig]}"`).join(", ");
        setError(`File parsed ${rows.length} rows but no valid transactions found. Sample row values: ${sampleVals}`);
        setLoading(false);
        return;
      }

      // Auto-detect NAICS from first row
      if (parsed[0]?.naics_code && !naicsCode) {
        setNaicsCode(parsed[0].naics_code);
      }

      setRecords(parsed);
    } catch (err) {
      setError("Failed to parse file: " + (err instanceof Error ? err.message : "Unknown error"));
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!industryKey) { setError("Please select an industry"); return; }
    setUploading(true);
    setResult(null);
    setError("");
    try {
      const res = await fetch("/api/load-dstats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records, naicsCode, industryKey, batchName: batchName || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.results);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    }
    setUploading(false);
  };

  const fmt = (v: number | null) => v != null ? `$${Math.round(v).toLocaleString()}` : "—";
  const pct = (v: number | null) => v != null ? `${v.toFixed(1)}%` : "—";
  const mult = (a: number | null, b: number | null) => a && b && b > 0 ? `${(a / b).toFixed(2)}x` : "—";

  return (
    <div style={{ minHeight: "100vh", background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        select:focus{outline:none;border-color:rgba(99,102,241,0.4)!important}
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 60px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>📈 DStats Transaction Loader</h1>
        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 24px" }}>
          Upload individual closed transaction data from Excel/CSV files. Each transaction becomes a data point in your proprietary benchmark engine.
        </p>

        {/* Config Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>NexTax Industry *</div>
            <select value={industryKey} onChange={(e) => setIndustryKey(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#E2E8F0", fontSize: 13 }}>
              <option value="">Select industry...</option>
              {Object.entries(INDUSTRIES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>NAICS Code (auto-detected)</div>
            <input type="text" placeholder="e.g., 238220" value={naicsCode} onChange={(e) => setNaicsCode(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Batch Name (optional)</div>
            <input type="text" placeholder="e.g., plumbing-q1-2026" value={batchName} onChange={(e) => setBatchName(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13 }} />
          </div>
        </div>

        {/* File Upload */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            padding: "40px 24px", borderRadius: 14, border: "2px dashed rgba(99,102,241,0.25)",
            background: "rgba(99,102,241,0.03)", textAlign: "center", cursor: "pointer",
            marginBottom: 16, transition: "border-color 0.2s",
          }}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)"; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)";
            const file = e.dataTransfer.files[0];
            if (file && fileRef.current) {
              const dt = new DataTransfer();
              dt.items.add(file);
              fileRef.current.files = dt.files;
              fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }}
        >
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
          {loading ? (
            <div style={{ fontSize: 15, color: "#818CF8" }}>🔄 Parsing file...</div>
          ) : fileName ? (
            <div>
              <div style={{ fontSize: 15, color: "#10B981", fontWeight: 600 }}>✓ {fileName}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>Click to upload a different file</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 15, color: "#E2E8F0", fontWeight: 600 }}>Drop CSV file here or click to browse</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>Save Excel as CSV first (File → Save As → CSV UTF-8)</div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>✕ {error}</div>
        )}

        {/* Column Mapping Display */}
        {(Object.keys(mappedCols).length > 0 || unmappedCols.length > 0) && (
          <div style={{ padding: "12px 16px", borderRadius: 8, background: Object.keys(mappedCols).length > 0 ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${Object.keys(mappedCols).length > 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)"}`, marginBottom: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 600, color: Object.keys(mappedCols).length > 0 ? "#10B981" : "#EF4444", marginBottom: 4 }}>
              {Object.keys(mappedCols).length > 0 ? `✓ Column Mapping (${Object.keys(mappedCols).length} mapped)` : "✕ No columns mapped"}
            </div>
            {Object.keys(mappedCols).length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: unmappedCols.length > 0 ? 6 : 0 }}>
                {Object.entries(mappedCols).map(([orig, mapped]) => (
                  <span key={orig} style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(16,185,129,0.1)", color: "#10B981", fontSize: 10 }}>
                    {orig} → {mapped}
                  </span>
                ))}
              </div>
            )}
            {unmappedCols.length > 0 && (
              <div style={{ color: "#F59E0B", fontSize: 10 }}>
                Unmapped (skipped): {unmappedCols.join(", ")}
              </div>
            )}
          </div>
        )}

        {/* Preview Table */}
        {records.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#10B981", margin: 0 }}>✓ Parsed {records.length} transactions</h3>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6B7280" }}>
                <span>Years: {[...new Set(records.map((r) => r.sale_year).filter(Boolean))].sort().join(", ") || "—"}</span>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  {["#", "Year", "MVIC Price", "Revenue", "SDE", "EBITDA", "Op Profit", "Assets", "MVIC/Rev", "MVIC/SDE", "SDE Margin"].map((h) => (
                    <th key={h} style={{ padding: "6px 8px", fontSize: 9, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {records.slice(0, 50).map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#6B7280", textAlign: "center" }}>{i + 1}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", textAlign: "center" }}>{r.sale_year || "—"}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.mvic_price)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.revenue)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.sde)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.ebitda)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.operating_profit)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{fmt(r.assets)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#818CF8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{mult(r.mvic_price, r.revenue)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#818CF8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{mult(r.mvic_price, r.sde)}</td>
                      <td style={{ padding: "5px 8px", fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{pct(r.sde_margin_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length > 50 && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 8, textAlign: "center" }}>Showing 50 of {records.length} transactions</div>}
            </div>

            {/* Summary Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 14, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { label: "Median MVIC", value: fmt(median(records.map((r) => r.mvic_price))) },
                { label: "Median Revenue", value: fmt(median(records.map((r) => r.revenue))) },
                { label: "Median SDE", value: fmt(median(records.map((r) => r.sde))) },
                { label: "Median MVIC/SDE", value: medianMult(records) },
                { label: "Transactions", value: String(records.length) },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#818CF8", fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <button onClick={handleUpload} disabled={uploading || !industryKey} style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none", marginTop: 14,
              background: uploading || !industryKey ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #10B981, #059669)",
              color: uploading || !industryKey ? "#6B7280" : "#fff",
              fontSize: 15, fontWeight: 700, cursor: uploading || !industryKey ? "not-allowed" : "pointer",
            }}>
              {uploading ? "Uploading..." : !industryKey ? "Select an industry first" : `📤 Load ${records.length} Transactions into Supabase`}
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

// Utility functions
function median(vals: (number | null)[]): number | null {
  const sorted = vals.filter((v): v is number => v !== null && v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function medianMult(records: DealRecord[]): string {
  const mults = records
    .filter((r) => r.mvic_price && r.sde && r.mvic_price > 0 && r.sde > 0)
    .map((r) => r.mvic_price! / r.sde!);
  const m = median(mults);
  return m ? `${m.toFixed(2)}x` : "—";
}
