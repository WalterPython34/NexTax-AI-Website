"use client";

import React, { useState } from "react";

const INDUSTRY_MAP: Record<string, string> = {
  "Plumbing": "plumbing", "HVAC": "hvac", "Landscaping": "landscaping", "Car Wash": "carwash",
  "Dental": "dental", "Gym": "gym", "Restaurant": "restaurant", "Auto Repair": "autorepair",
  "Cleaning": "cleaning", "Ecommerce": "ecommerce", "SaaS": "saas", "Insurance": "insurance",
  "Roofing": "roofing", "Pet Care": "petcare", "Pharmacy": "pharmacy", "Daycare": "daycare",
  "Med Spa": "medspa", "Accounting": "accounting", "Electrical": "electrical",
  "Healthcare": "healthcare", "Transportation": "transportation", "Printing": "printing",
  "Self-Storage": "storage", "Painting": "painting", "Security": "security", "Laundromat": "laundromat",
};

interface IBISRecord {
  industry_key: string;
  ibis_industry_name: string;
  ibis_industry_code: string;
  data_year: number;
  revenue_millions: number | null;
  enterprises: number | null;
  establishments: number | null;
  employment: number | null;
  wages_millions: number | null;
  iva_millions: number | null;
  revenue_growth_pct: number | null;
  enterprise_growth_pct: number | null;
  establishment_growth_pct: number | null;
  employment_growth_pct: number | null;
  wage_growth_pct: number | null;
  revenue_per_employee: number | null;
  revenue_per_enterprise_millions: number | null;
  employees_per_establishment: number | null;
  employees_per_enterprise: number | null;
  average_wage: number | null;
  wages_to_revenue_pct: number | null;
  establishments_per_enterprise: number | null;
  iva_to_revenue_pct: number | null;
}

export default function IBISLoader() {
  const [industryKey, setIndustryKey] = useState("");
  const [ibisName, setIbisName] = useState("");
  const [ibisCode, setIbisCode] = useState("");
  const [pastedData, setPastedData] = useState("");
  const [records, setRecords] = useState<IBISRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: number } | null>(null);
  const [error, setError] = useState("");

  const parseData = () => {
    setError("");
    setRecords([]);
    if (!industryKey || !ibisName) {
      setError("Please select an industry and enter the source industry name");
      return;
    }
    extractWithAI();
  };

  const extractWithAI = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/extract-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You are extracting structured data from an industry report (IBISWorld format).

The pasted content contains THREE tables that must be joined by Year:
1. "Industry Data" — Year, Revenue ($M), Enterprises, Establishments, Employment, Wages ($M), IVA ($M)
2. "Annual Change" — Year, Revenue%, Enterprises%, Establishments%, Employment%, Wages%, IVA%
3. "Key Ratios" — Year, Revenue/Employee, Revenue/Enterprise ($M), Employees/Establishment, Employees/Enterprise, Avg Wage, Wages/Revenue%, Establishments/Enterprise, IVA/Revenue%

Instructions:
- Parse ALL three tables and join them on Year into one record per year
- Include ALL years (historical and forecast)
- "N/A" values become null
- Revenue and Wages are already in millions — keep as-is
- Average Wage is in full dollars (e.g. 22023 not 22.023)
- Revenue per Employee is in full dollars (e.g. 59000 not 59)
- Percentages stay as plain numbers (3.5% = 3.5, not 0.035)
- Return ONLY a valid JSON array, no markdown, no explanation

JSON structure — one object per year:
[{"data_year":2024,"revenue_millions":14936,"enterprises":8860,"establishments":181513,"employment":176894,"wages_millions":335.243,"iva_millions":7383,"revenue_growth_pct":2.46,"enterprise_growth_pct":3.65,"establishment_growth_pct":5.34,"employment_growth_pct":5.27,"wage_growth_pct":4.15,"iva_growth_pct":3.82,"revenue_per_employee":59000,"revenue_per_enterprise_millions":44.552,"employees_per_establishment":49,"employees_per_enterprise":2,"average_wage":22023,"wages_to_revenue_pct":2.24,"establishments_per_enterprise":2,"iva_to_revenue_pct":1.0}]

PASTED DATA:
${pastedData.slice(0, 8000)}`,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Proxy error:", res.status, errText);
        setError(`Extraction failed (${res.status}). Check that /api/extract-proxy is deployed.`);
        setLoading(false);
        return;
      }

      const proxyData = await res.json();
      const text = proxyData.content || proxyData.text || proxyData.result || "";

      if (!text) {
        console.error("Empty proxy response:", proxyData);
        setError("AI returned empty response. Try pasting all three tables.");
        setLoading(false);
        return;
      }

      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const arrMatch = cleaned.match(/\[[\s\S]*\]/);

      if (!arrMatch) {
        console.error("No JSON array in response:", text.slice(0, 400));
        setError("Could not parse AI response. Make sure all three tables are pasted (Industry Data, Annual Change, Key Ratios).");
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(arrMatch[0]);
      const mapped = parsed
        .filter((r: Record<string, unknown>) => r.data_year && Number(r.data_year) > 2000)
        .map((r: Record<string, unknown>) => ({
          ...r,
          industry_key: industryKey,
          ibis_industry_name: ibisName,
          ibis_industry_code: ibisCode,
        }));

      if (mapped.length === 0) {
        setError("No valid year records extracted. Ensure you pasted the Industry Data table.");
        setLoading(false);
        return;
      }

      setRecords(mapped);
    } catch (err: unknown) {
      console.error("Extraction error:", err);
      setError("AI extraction failed. Check the browser console for details.");
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    setUploading(true);
    setResult(null);
    try {
      const res = await fetch("/api/load-isbenchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
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

  return (
    <div style={{ minHeight: "100vh", background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        textarea:focus,input:focus,select:focus{outline:none;border-color:rgba(99,102,241,0.4)!important}
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 60px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>📊 ISBenchmark Data Loader</h1>
        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 24px" }}>
          Load industry benchmark data into NexTax. Paste data tables from industry reports for AI extraction.
        </p>

        {/* Industry Selection */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>NexTax Industry</div>
            <select value={industryKey} onChange={(e) => setIndustryKey(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#E2E8F0", fontSize: 13 }}>
              <option value="">Select industry...</option>
              {Object.entries(INDUSTRY_MAP).map(([label, key]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Source Industry Name</div>
            <input type="text" placeholder="e.g., Pet Grooming & Care" value={ibisName} onChange={(e) => setIbisName(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Source Industry Code (optional)</div>
            <input type="text" placeholder="e.g., 812910" value={ibisCode} onChange={(e) => setIbisCode(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13 }} />
          </div>
        </div>

        {/* Data Input */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Paste Industry Data Tables</div>
            <div style={{ fontSize: 10, color: "#4B5563" }}>{pastedData.length} chars</div>
          </div>
          <textarea
            placeholder={"Paste industry data tables here...\n\nPaste all three tables at once:\n• Industry Data (Year, Revenue, Enterprises...)\n• Annual Change (Year, Revenue%, Enterprises%...)\n• Key Ratios (Revenue/Employee, Avg Wage...)\n\nAI will extract and join everything automatically."}
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
            style={{ width: "100%", minHeight: 250, padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 12, lineHeight: 1.6, resize: "vertical", fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>

        {/* Extract Button */}
        <button onClick={parseData} disabled={loading || !pastedData || !industryKey || !ibisName} style={{
          width: "100%", padding: "14px", borderRadius: 10, border: "none",
          background: loading || !pastedData || !industryKey ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
          color: loading || !pastedData || !industryKey ? "#6B7280" : "#fff",
          fontSize: 15, fontWeight: 700, cursor: loading || !pastedData || !industryKey ? "not-allowed" : "pointer", marginBottom: 16,
        }}>
          {loading ? "🔄 Extracting with AI..." : "📊 Extract Data from Paste"}
        </button>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>✕ {error}</div>
        )}

        {/* Extracted Records Preview */}
        {records.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#10B981", margin: "0 0 12px" }}>✓ Extracted {records.length} year(s) of data for {ibisName}</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  {["Year","Revenue ($M)","Enterprises","Employment","Rev/Employee","Rev Growth","Wages/Rev %","IVA/Rev %"].map((h) => (
                    <th key={h} style={{ padding: "6px 10px", fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.data_year} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "6px 10px", fontSize: 13, fontWeight: 600, color: "#E2E8F0", textAlign: "center" }}>{r.data_year}</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{r.revenue_millions?.toLocaleString() || "—"}</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{r.enterprises?.toLocaleString() || "—"}</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{r.employment?.toLocaleString() || "—"}</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{r.revenue_per_employee ? `$${r.revenue_per_employee.toLocaleString()}` : "—"}</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 600, color: (r.revenue_growth_pct || 0) > 0 ? "#10B981" : "#EF4444", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{r.revenue_growth_pct != null ? `${r.revenue_growth_pct > 0 ? "+" : ""}${r.revenue_growth_pct}%` : "—"}</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{r.wages_to_revenue_pct != null ? `${r.wages_to_revenue_pct}%` : "—"}</td>
                      <td style={{ padding: "6px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>{r.iva_to_revenue_pct != null ? `${r.iva_to_revenue_pct}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={handleUpload} disabled={uploading} style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none", marginTop: 14,
              background: uploading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #10B981, #059669)",
              color: "#fff", fontSize: 15, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer",
            }}>
              {uploading ? "Uploading..." : `📤 Load ${records.length} Records into Supabase`}
            </button>
          </div>
        )}

        {/* Upload Result */}
        {result && (
          <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#10B981", marginBottom: 6 }}>✓ Upload Complete</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>
              Inserted: {result.inserted} • Updated: {result.updated} • Errors: {result.errors}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 8 }}>📋 How to Load Industry Benchmark Data</div>
          <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.7 }}>
            1. Open an industry report (e.g., "Plumbing Services in the US")<br />
            2. Navigate to the <strong style={{ color: "#94A3B8" }}>Datatables &amp; Glossary</strong> section<br />
            3. Select and copy ALL three tables: Industry Data, Annual Change, and Key Ratios<br />
            4. Select the matching NexTax industry from the dropdown<br />
            5. Enter the industry name and code<br />
            6. Paste the data and click Extract — AI will parse all fields automatically<br />
            7. Review the preview table and click Load to save to Supabase
          </div>
        </div>

        {/* What This Data Powers */}
        <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.1)", marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#818CF8", marginBottom: 8 }}>🔌 What This Data Powers</div>
          <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.7 }}>
            • <strong style={{ color: "#94A3B8" }}>Revenue per employee:</strong> Replaces hardcoded estimates in Deal Risk Analyzer benchmarks<br />
            • <strong style={{ color: "#94A3B8" }}>Revenue growth rate:</strong> Powers real Industry Risk scoring (replaces static "Growing"/"Stable" labels)<br />
            • <strong style={{ color: "#94A3B8" }}>Number of enterprises:</strong> Enables TAM calculations ("47,000 HVAC businesses in the US")<br />
            • <strong style={{ color: "#94A3B8" }}>Wages/Revenue %:</strong> Real labor cost ratios for benchmarking<br />
            • <strong style={{ color: "#94A3B8" }}>IVA/Revenue %:</strong> Industry value-add for profitability assessment<br />
            • <strong style={{ color: "#94A3B8" }}>Annual transactions estimate:</strong> Feeds the Market Intelligence Engine heatmap
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
