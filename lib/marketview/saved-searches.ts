// ===========================================
// Saved Searches Manager
// ===========================================
// Stores analysis results in localStorage for quick recall.
// Supports save, load, delete, and comparison.

import { AnalysisResult } from "@/types/marketview";

export interface SavedSearch {
  id: string;
  name: string;
  address: string;
  category: string;
  radius: number;
  saturationScore: number;
  riskBand: string;
  riskColor: string;
  totalCompetitors: number;
  directCompetitors: number;
  densityPer10k: number;
  avgRating: number;
  totalEstRevenue: number;
  savedAt: string;
  // Full result stored separately to keep list lightweight
  hasFullData: boolean;
}

const STORAGE_KEY = "msa_saved_searches";
const DATA_PREFIX = "msa_data_";
const MAX_SAVED = 50;

// ─── Save a search ───

export function saveSearch(result: AnalysisResult, customName?: string): SavedSearch {
  const id = `search_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const { metrics, metadata } = result;

  const entry: SavedSearch = {
    id,
    name: customName || `${metadata.category} — ${metadata.address.split(",")[0]}`,
    address: metadata.address,
    category: metadata.category,
    radius: metadata.radius,
    saturationScore: metrics.saturationScore,
    riskBand: metrics.riskBand,
    riskColor: metrics.riskColor,
    totalCompetitors: metrics.totalCompetitors,
    directCompetitors: metrics.directCompetitors,
    densityPer10k: metrics.densityPer10k,
    avgRating: metrics.avgRating,
    totalEstRevenue: metrics.totalEstRevenue,
    savedAt: new Date().toISOString(),
    hasFullData: true,
  };

  // Save summary to list
  const searches = getSavedSearches();
  searches.unshift(entry);

  // Limit total saved
  if (searches.length > MAX_SAVED) {
    const removed = searches.splice(MAX_SAVED);
    removed.forEach((s) => {
      try { localStorage.removeItem(DATA_PREFIX + s.id); } catch {}
    });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));

  // Save full data
  try {
    localStorage.setItem(DATA_PREFIX + id, JSON.stringify(result));
  } catch {
    // Storage full — remove oldest full data entries
    console.warn("localStorage full, cleaning old data");
    for (let i = searches.length - 1; i >= 10; i--) {
      try {
        localStorage.removeItem(DATA_PREFIX + searches[i].id);
        searches[i].hasFullData = false;
      } catch {}
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
    try {
      localStorage.setItem(DATA_PREFIX + id, JSON.stringify(result));
    } catch {}
  }

  return entry;
}

// ─── Get all saved searches ───

export function getSavedSearches(): SavedSearch[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// ─── Load full result data ───

export function loadSearchData(id: string): AnalysisResult | null {
  try {
    const data = localStorage.getItem(DATA_PREFIX + id);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ─── Delete a search ───

export function deleteSearch(id: string): void {
  const searches = getSavedSearches().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  try {
    localStorage.removeItem(DATA_PREFIX + id);
  } catch {}
}

// ─── Clear all ───

export function clearAllSearches(): void {
  const searches = getSavedSearches();
  searches.forEach((s) => {
    try { localStorage.removeItem(DATA_PREFIX + s.id); } catch {}
  });
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Rename a search ───

export function renameSearch(id: string, newName: string): void {
  const searches = getSavedSearches();
  const search = searches.find((s) => s.id === id);
  if (search) {
    search.name = newName;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  }
}
