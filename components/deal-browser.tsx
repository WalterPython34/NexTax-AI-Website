"use client";

import React, { useState, useEffect, useCallback } from "react";

function fmt(v: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v); }
function sc(s: number) { return s >= 70 ? "#10B981" : s >= 50 ? "#F59E0B" : s >= 30 ? "#F97316" : "#EF4444"; }
function rl(s: number) { return s >= 70 ? "Low Risk" : s >= 50 ? "Moderate" : s >= 30 ? "High Risk" : "Critical"; }

const INDUSTRY_LABELS: Record<string, string> = {
  laundromat: "Laundromat", hvac: "HVAC", landscaping: "Landscaping", carwash: "Car Wash",
  dental: "Dental Practice", gym: "Gym / Fitness", restaurant: "Restaurant", autorepair: "Auto Repair",
  cleaning: "Cleaning Service", ecommerce: "Ecommerce", saas: "SaaS", insurance: "Insurance",
  plumbing: "Plumbing", roofing: "Roofing", petcare: "Pet Care", pharmacy: "Pharmacy",
  daycare: "Daycare", medspa: "Med Spa", accounting: "Accounting", electrical: "Electrical",
  healthcare: "Healthcare", transportation: "Transportation", printing: "Printing",
  storage: "Self-Storage", painting: "Painting", security: "Security",
};

const PRICE_RANGES = [
  { label: "All Prices", min: "", max: "" },
  { label: "Under $250K", min: "", max: "250000" },
  { label: "$250K – $500K", min: "250000", max: "500000" },
  { label: "$500K – $1M", min: "500000", max: "1000000" },
  { label: "$1M – $3M", min: "1000000", max: "3000000" },
  { label: "$3M+", min: "3000000", max: "" },
];

const SORT_OPTIONS = [
  { label: "Newest", value: "created_at", order: "desc" },
  { label: "Highest Score", value: "overall_score", order: "desc" },
  { label: "Lowest Price", value: "asking_price", order: "asc" },
  { label: "Highest Price", value: "asking_price", order: "desc" },
  { label: "Highest Revenue", value: "revenue", order: "desc" },
  { label: "Lowest Multiple", value: "valuation_multiple", order: "asc" },
];

// DRI color for the gap percentage display
function driColor(dri: number | null) {
  if (dri === null) return "#6B7280";
  if (dri < 0.85) return "#10B981";
  if (dri < 1.0)  return "#34D399";
  if (dri <= 1.15) return "#3B82F6";
  if (dri <= 1.30) return "#F59E0B";
  return "#EF4444";
}

// Confidence dot color
function confColor(conf: string | null) {
  if (conf === "HIGH") return "#10B981";
  if (conf === "MEDIUM") return "#F59E0B";
  if (conf === "LOW") return "#F97316";
  return "#4B5563";
}

interface Deal {
  id: string;
  industry: string;
  state: string | null;
  city: string | null;
  revenue: number;
  sde: number;
  asking_price: number;
  valuation_multiple: number;
  overall_score: number;
  risk_level: string;
  valuation_score: number;
  debt_score: number;
  source_platform: string;
  data_source_type: string;
  created_at: string;
  slug: string | null;

  // Valuation engine enrichments
  fairValue: number | null;
  fairValueP25: number | null;
  fairValueP75: number | null;
  benchmarkMultiple: number | null;
  benchmarkSource: string | null;
  benchmarkConfidence: string | null;
  dri: number | null;
  driGapPct: number | null;
  driCondition: string | null;
  pricingStatus: string;
  pricingStatusColor: string;
  pricingStatusBg: string;
}

export default function DealBrowser() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [industryCounts, setIndustryCounts] = useState<Record<string, number>>({});

  const [industry, setIndustry] = useState("all");
  const [priceRange, setPriceRange] = useState(0);
  const [minScore, setMinScore] = useState("");
  const [sortIdx, setSortIdx] = useState(0);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const pr = PRICE_RANGES[priceRange];
    const sort = SORT_OPTIONS[sortIdx];
    const params = new URLSearchParams();
    if (industry !== "all") params.set("industry", industry);
    if (pr.min) params.set("minPrice", pr.min);
    if (pr.max) params.set("maxPrice", pr.max);
    if (minScore) params.set("minScore", minScore);
    params.set("sort", sort.value);
    params.set("order", sort.order);
    params.set("page", page.toString());

    try {
      const res = await fetch(`/api/deals?${params}`);
      const data = await res.json();
      if (data.success) {
        setDeals(data.deals);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (Object.keys(data.industryCounts).length > 0) setIndustryCounts(data.industryCounts);
      }
    } catch { /* */ }
    setLoading(false);
  }, [industry, priceRange, minScore, sortIdx, page]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);
  useEffect(() => { setPage(1); }, [industry, priceRange, minScore, sortIdx]);

  const sortedIndustries = Object.entries(industryCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ minHeight: "100vh", background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .3s ease-out forwards}
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", color: "#E2E8F0" }}>Deal Database</h1>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
            {total.toLocaleString()} analyzed deals across {Object.keys(industryCounts).length} industries
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
          {/* ── SIDEBAR ── unchanged layout */}
          <div>
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Industry</div>
              <div onClick={() => setIndustry("all")} style={{ padding: "6px 10px", borderRadius: 6, marginBottom: 2, cursor: "pointer", fontSize: 12, background: industry === "all" ? "rgba(99,102,241,0.15)" : "transparent", color: industry === "all" ? "#818CF8" : "#94A3B8", fontWeight: industry === "all" ? 600 : 400, display: "flex", justifyContent: "space-between" }}>
                <span>All Industries</span>
                <span style={{ color: "#4B5563", fontSize: 11 }}>{total}</span>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {sortedIndustries.map(([key, count]) => (
                  <div key={key} onClick={() => setIndustry(key)} style={{ padding: "6px 10px", borderRadius: 6, marginBottom: 1, cursor: "pointer", fontSize: 12, background: industry === key ? "rgba(99,102,241,0.15)" : "transparent", color: industry === key ? "#818CF8" : "#94A3B8", fontWeight: industry === key ? 600 : 400, display: "flex", justifyContent: "space-between" }}>
                    <span>{INDUSTRY_LABELS[key] || key}</span>
                    <span style={{ color: "#4B5563", fontSize: 11 }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Price Range</div>
              {PRICE_RANGES.map((pr, i) => (
                <div key={pr.label} onClick={() => setPriceRange(i)} style={{ padding: "6px 10px", borderRadius: 6, marginBottom: 1, cursor: "pointer", fontSize: 12, background: priceRange === i ? "rgba(99,102,241,0.15)" : "transparent", color: priceRange === i ? "#818CF8" : "#94A3B8", fontWeight: priceRange === i ? 600 : 400 }}>
                  {pr.label}
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Min Deal Score</div>
              {["", "50", "60", "70", "80"].map((s) => (
                <div key={s} onClick={() => setMinScore(s)} style={{ padding: "6px 10px", borderRadius: 6, marginBottom: 1, cursor: "pointer", fontSize: 12, background: minScore === s ? "rgba(99,102,241,0.15)" : "transparent", color: minScore === s ? "#818CF8" : "#94A3B8", fontWeight: minScore === s ? 600 : 400 }}>
                  {s ? `${s}+` : "Any Score"}
                </div>
              ))}
            </div>

            <a href="/deal-reality-check" style={{ display: "block", padding: "12px", borderRadius: 10, background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#fff", fontSize: 13, fontWeight: 700, textAlign: "center", textDecoration: "none" }}>
              + Analyze a New Deal
            </a>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#6B7280" }}>
                Showing {deals.length} of {total.toLocaleString()} deals
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {SORT_OPTIONS.map((s, i) => (
                  <button key={s.label} onClick={() => setSortIdx(i)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: sortIdx === i ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)", color: sortIdx === i ? "#818CF8" : "#6B7280", fontSize: 11, fontWeight: sortIdx === i ? 600 : 400, cursor: "pointer" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#6B7280" }}>Loading deals...</div>
            ) : deals.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 14, color: "#6B7280" }}>No deals match your filters</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deals.map((deal) => {
                  const ind = INDUSTRY_LABELS[deal.industry] || deal.industry;
                  const location = [deal.city, deal.state].filter(Boolean).join(", ");
                  const margin = deal.revenue > 0 ? ((deal.sde / deal.revenue) * 100).toFixed(0) : "—";
                  const gapSign = deal.driGapPct !== null && deal.driGapPct !== undefined
                    ? deal.driGapPct > 0 ? `+${deal.driGapPct}%` : `${deal.driGapPct}%`
                    : null;

                  return (
                    <div
                      key={deal.id}
                      className="fu"
                      onClick={() => deal.slug && window.open(`/deal/${deal.slug}`, "_blank")}
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        padding: "14px 18px",
                        cursor: deal.slug ? "pointer" : "default",
                        display: "grid",
                        gridTemplateColumns: "52px 1fr auto",
                        gap: 14,
                        alignItems: "center",
                      }}
                    >
                      {/* Score Ring */}
                      <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                        <svg width={52} height={52} style={{ transform: "rotate(-90deg)" }}>
                          <circle cx={26} cy={26} r={22} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
                          <circle cx={26} cy={26} r={22} fill="none" stroke={sc(deal.overall_score)} strokeWidth={4}
                            strokeDasharray={138}
                            strokeDashoffset={138 - (deal.overall_score / 100) * 138}
                            strokeLinecap="round" />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: sc(deal.overall_score), fontFamily: "'JetBrains Mono', monospace" }}>
                          {deal.overall_score}
                        </div>
                      </div>

                      {/* Center: deal info + metrics */}
                      <div>
                        {/* Row 1: industry + location + badges */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0" }}>{ind}</span>
                          {location && <span style={{ fontSize: 11, color: "#6B7280" }}>{location}</span>}
                          <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, background: `${sc(deal.overall_score)}15`, color: sc(deal.overall_score), fontWeight: 600 }}>
                            {rl(deal.overall_score)}
                          </span>
                          {/* Pricing status badge — new, from valuation engine */}
                          {deal.pricingStatus && deal.pricingStatus !== "Unrated" && (
                            <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, background: deal.pricingStatusBg, color: deal.pricingStatusColor, fontWeight: 600 }}>
                              {deal.pricingStatus}
                            </span>
                          )}
                          {deal.source_platform && (
                            <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, background: "rgba(99,102,241,0.08)", color: "#818CF8" }}>
                              {deal.source_platform}
                            </span>
                          )}
                        </div>

                        {/* Row 2: financial metrics grid */}
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                          {/* Asking / Revenue */}
                          <div>
                            <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", marginBottom: 1 }}>Asking / Rev</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(deal.asking_price)}</div>
                            <div style={{ fontSize: 10, color: "#6B7280", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(deal.revenue)}</div>
                          </div>

                          {/* SDE */}
                          <div>
                            <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", marginBottom: 1 }}>SDE</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(deal.sde)}</div>
                            <div style={{ fontSize: 10, color: "#6B7280" }}>{margin}% margin</div>
                          </div>

                          {/* Multiple */}
                          <div>
                            <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", marginBottom: 1 }}>Multiple</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>
                              {deal.valuation_multiple ? deal.valuation_multiple.toFixed(2) + "x" : "—"}
                            </div>
                            {deal.benchmarkMultiple && (
                              <div style={{ fontSize: 10, color: "#6B7280" }}>Mkt: {deal.benchmarkMultiple.toFixed(2)}x</div>
                            )}
                          </div>

                          {/* Fair Value — new from engine */}
                          {deal.fairValue && (
                            <div>
                              <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", marginBottom: 1 }}>Fair Value</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#C4B5FD", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(deal.fairValue)}</div>
                              {deal.fairValueP25 && deal.fairValueP75 && (
                                <div style={{ fontSize: 10, color: "#6B7280" }}>{fmt(deal.fairValueP25)}–{fmt(deal.fairValueP75)}</div>
                              )}
                            </div>
                          )}

                          {/* DRI gap — new from engine */}
                          {gapSign && (
                            <div>
                              <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", marginBottom: 1 }}>vs Market</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: driColor(deal.dri), fontFamily: "'JetBrains Mono', monospace" }}>
                                {gapSign}
                              </div>
                              <div style={{ fontSize: 10, color: "#6B7280" }}>
                                {deal.benchmarkConfidence && (
                                  <span style={{ color: confColor(deal.benchmarkConfidence) }}>● </span>
                                )}
                                {deal.benchmarkConfidence || ""}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: arrow */}
                      {deal.slug && (
                        <div style={{ fontSize: 16, color: "#4B5563", flexShrink: 0 }}>→</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination — unchanged */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: page === 1 ? "#374151" : "#94A3B8", fontSize: 12, cursor: page === 1 ? "default" : "pointer" }}>
                  ← Prev
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6B7280" }}>
                  Page {page} of {totalPages}
                </div>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: page === totalPages ? "#374151" : "#94A3B8", fontSize: 12, cursor: page === totalPages ? "default" : "pointer" }}>
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24, padding: "14px 18px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#6B7280" }}>
            Data from {Object.keys(industryCounts).length} industries • Fair value powered by NexTax Market Intelligence • Updated continuously
          </div>
        </div>
      </div>
    </div>
  );
}
