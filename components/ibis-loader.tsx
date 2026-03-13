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

    try {
      // Use Claude to extract data from pasted text
      extractWithAI();
    } catch {
      setError("Failed to parse data. Try the AI extraction.");
    }
  };

  const extractWithAI = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "", // Will be proxied through our API
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: `Extract IBISWorld industry data from the following pasted text. The industry is "${ibisName}" (code: ${ibisCode || "unknown"}).

For each year of data found, return a JSON array. Each object should have:
{
  "data_year": 2025,
  "revenue_millions": number or null,
  "enterprises": number or null,
  "establishments": number or null,
  "employment": number or null,
  "wages_millions": number or null,
  "iva_millions": number or null,
  "revenue_growth_pct": number or null,
  "enterprise_growth_pct": number or null,
  "establishment_growth_pct": number or null,
  "employment_growth_pct": number or null,
  "wage_growth_pct": number or null,
  "revenue_per_employee": number or null,
  "revenue_per_enterprise_millions": number or null,
  "employees_per_establishment": number or null,
  "employees_per_enterprise": number or null,
  "average_wage": number or null,
  "wages_to_revenue_pct": number or null,
  "establishments_per_enterprise": number or null,
  "iva_to_revenue_pct": number or null
}

Parse all numeric values. Remove commas from numbers. Convert percentages to decimal form (e.g., 3.5% = 3.5, not 0.035).

ONLY return the JSON array. No other text.

Data to parse:
${pastedData}` }],
        }),
      });

      // If direct API fails (no key in browser), use our proxy
      if (!res.ok) {
        const proxyRes = await fetch("/api/extract-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Extract IBISWorld industry data from the following pasted text. The industry is "${ibisName}".

For each year of data found, return a JSON array with objects containing: data_year, revenue_millions, enterprises, establishments, employment, wages_millions, iva_millions, revenue_growth_pct, enterprise_growth_pct, establishment_growth_pct, employment_growth_pct, wage_growth_pct, revenue_per_employee, revenue_per_enterprise_millions, employees_per_establishment, employees_per_enterprise, average_wage, wages_to_revenue_pct, establishments_per_enterprise, iva_to_revenue_pct.

Parse all numbers (remove commas). Percentages as plain numbers (3.5% = 3.5). ONLY return JSON array.

Data:
${pastedData}`,
          }),
        });

        const proxyData = await proxyRes.json();
        const text = proxyData.content || proxyData.text || "";
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          const mapped = parsed.map((r: Record<string, unknown>) => ({
            ...r,
            industry_key: industryKey,
            ibis_industry_name: ibisName,
            ibis_industry_code: ibisCode,
          }));
          setRecords(mapped);
        } else {
          setError("Could not parse AI response");
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const mapped = parsed.map((r: Record<string, unknown>) => ({
          ...r,
          industry_key: industryKey,
          ibis_industry_name: ibisName,
          ibis_industry_code: ibisCode,
        }));
        setRecords(mapped);
      } else {
        setError("Could not parse AI response");
      }
    } catch {
      setError("AI extraction failed. Check your data format.");
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
            <input type="text" placeholder="e.g., Plumbing Services in the US" value={ibisName} onChange={(e) => setIbisName(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Source Industry Code (optional)</div>
            <input type="text" placeholder="e.g., 23822" value={ibisCode} onChange={(e) => setIbisCode(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13 }} />
          </div>
        </div>

        {/* Data Input */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Paste Industry Data Tables</div>
            <div style={{ fontSize: 10, color: "#4B5563" }}>{pastedData.length} chars</div>
          </div>
          <textarea
            placeholder={"Paste industry data tables here...\n\nYou can paste:\n• The full Datatables & Glossary section\n• Industry Data table (Year, Revenue, Enterprises, etc.)\n• Annual Change table\n• Key Ratios table\n\nPaste all tables at once — AI will extract everything."}
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
                  {["Year", "Revenue ($M)", "Enterprises", "Employment", "Rev/Employee", "Rev Growth", "Wages/Rev %", "IVA/Rev %"].map((h) => (
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
            2. Navigate to the <strong style={{ color: "#94A3B8" }}>Datatables & Glossary</strong> section<br />
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
          <a href="/intelligence" style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.08)", color: "#818CF8", fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>← Intelligence Dashboard</a>
          <a href="/admin/import" style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#6B7280", fontSize: 13, fontWeight: 500, textAlign: "center", textDecoration: "none" }}>Deal Import Tool →</a>
        </div>
      </div>
    </div>
  );
}
