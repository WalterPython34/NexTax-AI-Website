"use client";

import { useState } from "react";
import { Competitor } from "@/types/marketview";

interface CompetitorTableProps {
  competitors: Competitor[];
}

const TYPE_COLORS: Record<string, string> = {
  "Direct Competitor": "#ef4444",
  "Indirect Competitor": "#eab308",
  "Franchise Sibling": "#8b5cf6",
  "Adjacent Service": "#64748b",
};

const TIER_COLORS: Record<string, string> = {
  Premium: "#f59e0b",
  "Mid-Market": "#3b82f6",
  Value: "#22c55e",
  Budget: "#64748b",
};

type SortField = "distance" | "rating" | "reviewCount" | "estRevenue";

export function CompetitorTable({ competitors }: CompetitorTableProps) {
  const [sortBy, setSortBy] = useState<SortField>("distance");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = [...competitors].sort((a, b) => {
    const mod = sortDir === "asc" ? 1 : -1;
    const aVal =
      sortBy === "estRevenue"
        ? a.estimatedRevenue?.mid || 0
        : (a as any)[sortBy] || 0;
    const bVal =
      sortBy === "estRevenue"
        ? b.estimatedRevenue?.mid || 0
        : (b as any)[sortBy] || 0;
    return (aVal - bVal) * mod;
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir(field === "rating" || field === "reviewCount" || field === "estRevenue" ? "desc" : "asc");
    }
  };

  const arrow = (field: SortField) =>
    sortBy === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>Business</Th>
            <Th sortable active={sortBy === "distance"} onClick={() => handleSort("distance")}>
              Dist{arrow("distance")}
            </Th>
            <Th sortable active={sortBy === "rating"} onClick={() => handleSort("rating")}>
              Rating{arrow("rating")}
            </Th>
            <Th sortable active={sortBy === "reviewCount"} onClick={() => handleSort("reviewCount")}>
              Reviews{arrow("reviewCount")}
            </Th>
            <Th>Classification</Th>
            <Th>Tier</Th>
            <Th sortable active={sortBy === "estRevenue"} onClick={() => handleSort("estRevenue")}>
              Est. Rev{arrow("estRevenue")}
            </Th>
            <Th>Source</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, 30).map((c, i) => (
            <tr
              key={i}
              className="border-b transition-colors hover:bg-white/[0.03]"
              style={{ borderColor: "rgba(255,255,255,0.03)" }}
            >
              <td className="px-3 py-2.5 text-sm font-medium text-slate-200">
                {c.name}
                {c.isFranchise && (
                  <span className="ml-1.5 mono text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                    FRAN
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 mono text-sm text-white/60">
                {c.distance} mi
              </td>
              <td className="px-3 py-2.5 mono text-sm">
                <span
                  style={{
                    color:
                      c.rating >= 4.5
                        ? "#22c55e"
                        : c.rating >= 4.0
                        ? "#eab308"
                        : c.rating >= 3.5
                        ? "#f97316"
                        : "#ef4444",
                  }}
                >
                  {"★".repeat(Math.round(c.rating))} {c.rating}
                </span>
              </td>
              <td className="px-3 py-2.5 mono text-sm text-white/60">
                {c.reviewCount.toLocaleString()}
              </td>
              <td className="px-3 py-2.5">
                <Tag color={TYPE_COLORS[c.classification || ""] || "#64748b"}>
                  {c.classification || "Unknown"}
                </Tag>
              </td>
              <td className="px-3 py-2.5">
                <Tag color={TIER_COLORS[c.tier || ""] || "#64748b"}>
                  {c.tier || "N/A"}
                </Tag>
              </td>
              <td className="px-3 py-2.5 mono text-sm text-slate-200">
                {c.estimatedRevenue
                  ? `$${(c.estimatedRevenue.mid / 1000).toFixed(0)}K`
                  : "—"}
              </td>
              <td className="px-3 py-2.5">
                <Tag
                  color={
                    c.source === "both"
                      ? "#22c55e"
                      : c.source === "google"
                      ? "#3b82f6"
                      : "#ef4444"
                  }
                >
                  {c.source === "both" ? "G+Y" : c.source === "google" ? "G" : "Y"}
                </Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {competitors.length > 30 && (
        <div className="py-3 text-center mono text-xs text-white/20">
          Showing 30 of {competitors.length} competitors
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function Th({
  children,
  sortable,
  active,
  onClick,
}: {
  children: React.ReactNode;
  sortable?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <th
      className={`px-3 py-2.5 text-left mono text-[10px] uppercase tracking-widest whitespace-nowrap ${
        sortable ? "cursor-pointer select-none" : ""
      }`}
      style={{
        color: active ? "#60a5fa" : "rgba(255,255,255,0.35)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
      onClick={onClick}
    >
      {children}
    </th>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="mono text-[10px] px-2 py-0.5 rounded font-semibold whitespace-nowrap"
      style={{
        background: color + "15",
        color: color,
      }}
    >
      {children}
    </span>
  );
}
