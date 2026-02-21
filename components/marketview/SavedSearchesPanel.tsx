"use client";

import { useState, useEffect } from "react";
import {
  SavedSearch,
  getSavedSearches,
  deleteSearch,
  clearAllSearches,
  loadSearchData,
} from "@/lib/marketview/saved-searches";
import { AnalysisResult } from "@/types/marketview";

interface SavedSearchesPanelProps {
  onLoadSearch: (result: AnalysisResult) => void;
  onExportPdf: (result: AnalysisResult) => void;
}

export function SavedSearchesPanel({
  onLoadSearch,
  onExportPdf,
}: SavedSearchesPanelProps) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setSearches(getSavedSearches());
  }, []);

  const refresh = () => setSearches(getSavedSearches());

  const handleLoad = (search: SavedSearch) => {
    const data = loadSearchData(search.id);
    if (data) {
      onLoadSearch(data);
    }
  };

  const handleExport = (search: SavedSearch) => {
    const data = loadSearchData(search.id);
    if (data) {
      onExportPdf(data);
    }
  };

  const handleDelete = (id: string) => {
    deleteSearch(id);
    refresh();
  };

  const handleClearAll = () => {
    if (confirmClear) {
      clearAllSearches();
      refresh();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  if (searches.length === 0) {
    return (
      <div
        className="card text-center py-10"
        style={{ borderStyle: "dashed" }}
      >
        <div className="text-2xl mb-2" style={{ opacity: 0.2 }}>
          ◎
        </div>
        <div
          className="mono text-sm mb-1"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          No saved analyses yet
        </div>
        <div
          className="mono text-xs"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          Run an analysis and click &ldquo;Save&rdquo; to store it here
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="label-caps">
          Saved Analyses ({searches.length})
        </div>
        <button
          onClick={handleClearAll}
          className="mono text-[10px] px-3 py-1.5 rounded transition-colors"
          style={{
            background: confirmClear
              ? "rgba(239,68,68,0.15)"
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${
              confirmClear
                ? "rgba(239,68,68,0.3)"
                : "rgba(255,255,255,0.06)"
            }`,
            color: confirmClear ? "#fca5a5" : "rgba(255,255,255,0.35)",
            cursor: "pointer",
          }}
        >
          {confirmClear ? "Confirm Clear All" : "Clear All"}
        </button>
      </div>

      {/* Search Cards */}
      <div className="space-y-2">
        {searches.map((search) => (
          <div
            key={search.id}
            className="card card-hover flex items-center gap-4 !py-3 !px-4"
          >
            {/* Risk indicator */}
            <div
              className="w-2 h-10 rounded-full shrink-0"
              style={{ backgroundColor: search.riskColor }}
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">
                {search.name}
              </div>
              <div
                className="mono text-[10px] mt-0.5 flex items-center gap-2 flex-wrap"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                <span>{search.radius}mi</span>
                <span>•</span>
                <span>{search.totalCompetitors} competitors</span>
                <span>•</span>
                <span>
                  {new Date(search.savedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Score */}
            <div className="text-center shrink-0">
              <div
                className="mono text-lg font-bold"
                style={{ color: search.riskColor }}
              >
                {search.saturationScore}
              </div>
              <div
                className="mono text-[8px] font-bold"
                style={{
                  color: search.riskColor,
                  letterSpacing: "1px",
                }}
              >
                {search.riskBand}
              </div>
            </div>

            {/* Quick stats */}
            <div className="hidden sm:flex gap-3 shrink-0">
              <QuickStat label="Density" value={String(search.densityPer10k)} />
              <QuickStat label="Avg ★" value={String(search.avgRating)} />
              <QuickStat
                label="Mkt Rev"
                value={`$${(search.totalEstRevenue / 1000000).toFixed(1)}M`}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-1.5 shrink-0">
              <ActionButton onClick={() => handleLoad(search)} title="Load">
                ↗
              </ActionButton>
              <ActionButton onClick={() => handleExport(search)} title="Export PDF">
                ⤓
              </ActionButton>
              <ActionButton
                onClick={() => handleDelete(search.id)}
                title="Delete"
                danger
              >
                ✕
              </ActionButton>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison hint */}
      {searches.length >= 2 && (
        <div
          className="mt-4 text-center mono text-[10px]"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          Tip: Compare markets by running analyses on different addresses with
          the same category
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="mono text-xs font-semibold text-slate-300">{value}</div>
      <div
        className="mono text-[8px]"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        {label}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded transition-colors text-xs"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        color: danger ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.4)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.borderColor = danger
          ? "rgba(239,68,68,0.3)"
          : "rgba(255,255,255,0.15)";
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      {children}
    </button>
  );
}
