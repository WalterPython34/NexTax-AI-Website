"use client";

import React, { useState, useEffect, useCallback } from "react";

function fmt(v: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v); }
function sc(s: number) { return s >= 70 ? "#10B981" : s >= 50 ? "#F59E0B" : s >= 30 ? "#F97316" : "#EF4444"; }
function rl(s: number) { return s >= 70 ? "Low Risk" : s >= 50 ? "Moderate" : s >= 30 ? "High Risk" : "Critical"; }

const INDUSTRY_LABELS: Record<string, string> = {
  // ── Original 26 ──────────────────────────────────────────────────────────
  laundromat: "Laundromat", hvac: "HVAC", landscaping: "Landscaping", carwash: "Car Wash",
  dental: "Dental Practice", gym: "Gym / Fitness", restaurant: "Restaurant", autorepair: "Auto Repair",
  cleaning: "Cleaning Service", ecommerce: "Ecommerce", saas: "SaaS", insurance: "Insurance",
  plumbing: "Plumbing", roofing: "Roofing", petcare: "Pet Care", pharmacy: "Pharmacy",
  daycare: "Daycare", medspa: "Med Spa", accounting: "Accounting", electrical: "Electrical",
  healthcare: "Healthcare", transportation: "Transportation", printing: "Printing",
  storage: "Self-Storage", painting: "Painting", security: "Security",
  // ── New 15 ───────────────────────────────────────────────────────────────
  signmaking: "Sign Manufacturing", hairsalon: "Hair Salon",
  clothing: "Clothing & Accessories", construction: "Other Construction",
  grocery: "Grocery Store", pestcontrol: "Pest Control",
  marketing: "Marketing Agency", engineering: "Engineering Services",
  veterinary: "Veterinary Practice", realestatebrok: "Real Estate Brokerage",
  propertymanage: "Property Management", seniorcare: "Senior Care / Home Health",
  physicaltherapy: "Physical Therapy / Chiropractic",
  remodeling: "Home Remodeling & Restoration", staffing: "Staffing / Recruiting",
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

function driColor(dri: number | null) {
  if (dri === null) return "#6B7280";
  if (dri < 0.85)  return "#10B981";
  if (dri < 1.0)   return "#34D399";
  if (dri <= 1.15) return "#3B82F6";
  if (dri <= 1.30) return "#F59E0B";
  return "#EF4444";
}
function confColor(conf: string | null) {
  if (conf === "HIGH")   return "#10B981";
  if (conf === "MEDIUM") return "#F59E0B";
  if (conf === "LOW")    return "#F97316";
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

// ── Fixed column widths — every card uses identical layout regardless of data availability
const COL = {
  score:   52,
  info:   200,   // industry + location + badges
  asking: 120,   // asking / revenue
  sde:    100,   // sde + margin
  mult:   100,   // multiple + mkt multiple
  fv:     150,   // fair value + range
  vsm:     90,   // vs market % + confidence
  arrow:   18,
} as const;

// ── Stat cell — always renders, shows "—" when no data
function StatCell({ label, primary, secondary, primaryColor }: {
  label: string;
  primary: string;
  secondary?: string;
  primaryColor?: string;
}) {
  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: primaryColor || "#E2E8F0", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{primary}</div>
      {secondary !== undefined && (
        <div style={{ fontSize: 10, color: "#6B7280", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{secondary}</div>
      )}
    </div>
  );
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
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fu { animation: fadeUp .3s ease-out forwards; }
      `}</style>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 24px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", color: "#E2E8F0" }}>Deal Database</h1>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
            {total.toLocaleString()} analyzed deals across {Object.keys(industryCounts).length} industries
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
          {/* ── SIDEBAR ── */}
          <div>
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Industry</div>
              <div onClick={() => setIndustry("all")} style={{ padding: "6px 10px", borderRadius: 6, marginBottom: 2, cursor: "pointer", fontSize: 12, background: industry === "all" ? "rgba(99,102,241,0.15)" : "transparent", color: industry === "all" ? "#818CF8" : "#94A3B8", fontWeight: industry === "all" ? 600 : 400, display: "flex", justifyContent: "space-between" }}>
                <span>All Industries</span><span style={{ color: "#4B5563", fontSize: 11 }}>{total}</span>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {sortedIndustries.map(([key, count]) => (
                  <div key={key} onClick={() => setIndustry(key)} style={{ padding: "6px 10px", borderRadius: 6, marginBottom: 1, cursor: "pointer", fontSize: 12, background: industry === key ? "rgba(99,102,241,0.15)" : "transparent", color: industry === key ? "#818CF8" : "#94A3B8", fontWeight: industry === key ? 600 : 400, display: "flex", justifyContent: "space-between" }}>
                    <span>{INDUSTRY_LABELS[key] || key}</span><span style={{ color: "#4B5563", fontSize: 11 }}>{count}</span>
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

          {/* ── MAIN ── */}
          <div style={{ minWidth: 0 }}>
            {/* Sort bar + column headers */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: "#6B7280" }}>Showing {deals.length} of {total.toLocaleString()} deals</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {SORT_OPTIONS.map((s, i) => (
                    <button key={s.label} onClick={() => setSortIdx(i)} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: sortIdx === i ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)", color: sortIdx === i ? "#818CF8" : "#6B7280", fontSize: 11, fontWeight: sortIdx === i ? 600 : 400, cursor: "pointer" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column header row — always visible, sets alignment expectation */}
              <div style={{
                display: "grid",
                gridTemplateColumns: `${COL.score}px ${COL.info}px ${COL.asking}px ${COL.sde}px ${COL.mult}px ${COL.fv}px ${COL.vsm}px ${COL.arrow}px`,
                gap: "0 12px",
                padding: "0 18px 6px",
                alignItems: "end",
              }}>
                <div />
                <div style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Deal</div>
                <div style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Asking / Rev</div>
                <div style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>SDE</div>
                <div style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Multiple</div>
                <div style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>Fair Value ↗</div>
                <div style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>vs Market</div>
                <div />
              </div>
            </div>

            {/* Deal list */}
            {loading ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#6B7280" }}>Loading deals...</div>
            ) : deals.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 14, color: "#6B7280" }}>No deals match your filters</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {deals.map((deal) => {
                  const ind = INDUSTRY_LABELS[deal.industry] || deal.industry;
                  const location = [deal.city, deal.state].filter(Boolean).join(", ");
                  const margin = deal.revenue > 0 ? ((deal.sde / deal.revenue) * 100).toFixed(0) + "%" : "—";
                  const gapStr = deal.driGapPct !== null && deal.driGapPct !== undefined
                    ? (deal.driGapPct > 0 ? `+${deal.driGapPct}%` : `${deal.driGapPct}%`)
                    : "—";

                  return (
                    <div
                      key={deal.id}
                      className="fu"
                      onClick={() => deal.slug && window.open(`/deal/${deal.slug}`, "_blank")}
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 10,
                        padding: "12px 18px",
                        cursor: deal.slug ? "pointer" : "default",
                        // Fixed grid — every column always present, never collapses
                        display: "grid",
                        gridTemplateColumns: `${COL.score}px ${COL.info}px ${COL.asking}px ${COL.sde}px ${COL.mult}px ${COL.fv}px ${COL.vsm}px ${COL.arrow}px`,
                        gap: "0 12px",
                        alignItems: "center",
                      }}
                    >
                      {/* Col 1: Score ring */}
                      <div style={{ position: "relative", width: 48, height: 48 }}>
                        <svg width={48} height={48} style={{ transform: "rotate(-90deg)" }}>
                          <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
                          <circle cx={24} cy={24} r={20} fill="none" stroke={sc(deal.overall_score)} strokeWidth={4}
                            strokeDasharray={125.7}
                            strokeDashoffset={125.7 - (deal.overall_score / 100) * 125.7}
                            strokeLinecap="round" />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: sc(deal.overall_score), fontFamily: "'JetBrains Mono', monospace" }}>
                          {deal.overall_score}
                        </div>
                      </div>

                      {/* Col 2: Deal info */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ind}</div>
                        <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{location || "Location N/A"}</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <span style={{ padding: "1px 5px", borderRadius: 3, fontSize: 9, background: `${sc(deal.overall_score)}15`, color: sc(deal.overall_score), fontWeight: 600, whiteSpace: "nowrap" }}>
                            {rl(deal.overall_score)}
                          </span>
                          {deal.pricingStatus && deal.pricingStatus !== "Unrated" && (
                            <span style={{ padding: "1px 5px", borderRadius: 3, fontSize: 9, background: deal.pricingStatusBg, color: deal.pricingStatusColor, fontWeight: 600, whiteSpace: "nowrap" }}>
                              {deal.pricingStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Col 3: Asking / Revenue */}
                      <StatCell
                        label="Asking"
                        primary={fmt(deal.asking_price)}
                        secondary={fmt(deal.revenue) + " rev"}
                      />

                      {/* Col 4: SDE */}
                      <StatCell
                        label="SDE"
                        primary={fmt(deal.sde)}
                        secondary={margin + " margin"}
                      />

                      {/* Col 5: Multiple */}
                      <StatCell
                        label="Multiple"
                        primary={deal.valuation_multiple ? deal.valuation_multiple.toFixed(2) + "x" : "—"}
                        secondary={deal.benchmarkMultiple ? "Mkt: " + deal.benchmarkMultiple.toFixed(2) + "x" : undefined}
                      />

                      {/* Col 6: Fair Value — always rendered, "—" when unavailable */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Fair Value</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: deal.fairValue ? "#C4B5FD" : "#4B5563", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
                          {deal.fairValue ? fmt(deal.fairValue) : "—"}
                        </div>
                        <div style={{ fontSize: 9, color: "#4B5563", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {deal.fairValueP25 && deal.fairValueP75
                            ? fmt(deal.fairValueP25) + "–" + fmt(deal.fairValueP75)
                            : "\u00A0" /* non-breaking space keeps row height consistent */
                          }
                        </div>
                      </div>

                      {/* Col 7: VS Market — always rendered */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>vs Market</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: gapStr === "—" ? "#4B5563" : driColor(deal.dri), fontFamily: "'JetBrains Mono', monospace" }}>
                          {gapStr}
                        </div>
                        <div style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3 }}>
                          {deal.benchmarkConfidence && deal.benchmarkConfidence !== "INSUFFICIENT" ? (
                            <>
                              <span style={{ color: confColor(deal.benchmarkConfidence), lineHeight: 1 }}>●</span>
                              <span style={{ color: "#4B5563" }}>{deal.benchmarkConfidence}</span>
                            </>
                          ) : (
                            <span style={{ color: "#374151" }}>no data</span>
                          )}
                        </div>
                      </div>

                      {/* Col 8: Arrow */}
                      <div style={{ fontSize: 14, color: deal.slug ? "#4B5563" : "transparent" }}>→</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: page === 1 ? "#374151" : "#94A3B8", fontSize: 12, cursor: page === 1 ? "default" : "pointer" }}>← Prev</button>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6B7280" }}>Page {page} of {totalPages}</div>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: page === totalPages ? "#374151" : "#94A3B8", fontSize: 12, cursor: page === totalPages ? "default" : "pointer" }}>Next →</button>
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
