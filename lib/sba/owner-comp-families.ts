import type { Percentile } from "./ownerCompBenchmarks/index";

export type RevenueBand =
  | "under_500k"
  | "500k_1m"
  | "1m_3m"
  | "3m_10m"
  | "10m_plus";

export function getRevenueBand(annualRevenue: number): RevenueBand {
  if (annualRevenue < 500_000) return "under_500k";
  if (annualRevenue < 1_000_000) return "500k_1m";
  if (annualRevenue < 3_000_000) return "1m_3m";
  if (annualRevenue < 10_000_000) return "3m_10m";
  return "10m_plus";
}

export interface BandSelection {
  value: number;
  percentileLabel: string;
}

export function ownerCompForBand(
  p: Partial<Record<Percentile, number>>,
  band: RevenueBand,
): BandSelection | null {
  const effective: Exclude<RevenueBand, "10m_plus"> =
    band === "10m_plus" ? "3m_10m" : band;

  switch (effective) {
    case "under_500k":
      return p.p10 != null ? { value: p.p10, percentileLabel: "p10" } : null;
    case "500k_1m":
      if (p.p10 != null && p.p25 != null) {
        return { value: Math.round(p.p10 + (p.p25 - p.p10) / 3), percentileLabel: "p15 (interpolated)" };
      }
      return p.p10 != null ? { value: p.p10, percentileLabel: "p10" } : null;
    case "1m_3m":
      return p.p25 != null ? { value: p.p25, percentileLabel: "p25" } : null;
    case "3m_10m":
      return p.p50 != null ? { value: p.p50, percentileLabel: "p50" } : null;
  }
}

export interface OwnerCompFamily {
  id: string;
  label: string;
  soc: string;
}

export const FAMILIES: Record<string, OwnerCompFamily> = {
  general_ops: { id: "general_ops", label: "General & Operations Management", soc: "11-1021" },
  construction: { id: "construction", label: "Skilled Trades / Construction Management", soc: "11-9021" },
  food_service: { id: "food_service", label: "Food Service Management", soc: "11-9051" },
  health: { id: "health", label: "Medical & Health Services Management", soc: "11-9111" },
  education: { id: "education", label: "Education & Childcare Administration", soc: "11-9031" },
};

export const DEFAULT_FAMILY = "general_ops";

const INDUSTRY_FAMILY: Record<string, string> = {
  hvac: "construction",
  plumbing: "construction",
  electrical: "construction",
  roofing: "construction",
  construction: "construction",
  remodeling: "construction",
  painting: "construction",
  restaurant: "food_service",
  dental: "health",
  healthcare: "health",
  seniorcare: "health",
  physicaltherapy: "health",
  daycare: "education",
};

export function familyForIndustry(industryKey: string): OwnerCompFamily {
  return FAMILIES[INDUSTRY_FAMILY[industryKey] ?? DEFAULT_FAMILY];
}
