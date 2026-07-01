import type { OwnerCompDataset } from "./types";

// BLS OEWS May 2025 national, cross-industry, all-ownership annual percentile wages.
// Built from oesm25nat.zip -> national_M2025_dl.xlsx via scripts/build_owner_comp_2025.py
export const dataset2025: OwnerCompDataset = {
  version: 2025,
  release: "May 2025 OEWS",
  socs: {
    "11-1021": {
      soc: "11-1021",
      occupationTitle: "General and Operations Managers",
      release: "May 2025",
      releaseYear: 2025,
      percentiles: { p10: 50090, p25: 72320, p50: 105770, p75: 167280, p90: 253390 },
      sourceUrl: "https://www.bls.gov/oes/special-requests/oesm25nat.zip",
      lastUpdated: "2026-06-29",
    },
    "11-9021": {
      soc: "11-9021",
      occupationTitle: "Construction Managers",
      release: "May 2025",
      releaseYear: 2025,
      percentiles: { p10: 69690, p25: 88550, p50: 114990, p75: 151640, p90: 189440 },
      sourceUrl: "https://www.bls.gov/oes/special-requests/oesm25nat.zip",
      lastUpdated: "2026-06-29",
    },
    "11-9051": {
      soc: "11-9051",
      occupationTitle: "Food Service Managers",
      release: "May 2025",
      releaseYear: 2025,
      percentiles: { p10: 45960, p25: 56870, p50: 69390, p75: 86800, p90: 107640 },
      sourceUrl: "https://www.bls.gov/oes/special-requests/oesm25nat.zip",
      lastUpdated: "2026-06-29",
    },
    "11-9111": {
      soc: "11-9111",
      occupationTitle: "Medical and Health Services Managers",
      release: "May 2025",
      releaseYear: 2025,
      percentiles: { p10: 73390, p25: 94700, p50: 123860, p75: 166100, p90: 224340 },
      sourceUrl: "https://www.bls.gov/oes/special-requests/oesm25nat.zip",
      lastUpdated: "2026-06-29",
    },
    "11-9031": {
      soc: "11-9031",
      occupationTitle: "Education and Childcare Administrators, Preschool and Daycare",
      release: "May 2025",
      releaseYear: 2025,
      percentiles: { p10: 38580, p25: 47040, p50: 59300, p75: 75500, p90: 98240 },
      sourceUrl: "https://www.bls.gov/oes/special-requests/oesm25nat.zip",
      lastUpdated: "2026-06-29",
    },
  },
};
