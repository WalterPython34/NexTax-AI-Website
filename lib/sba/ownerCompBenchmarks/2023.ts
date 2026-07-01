import type { OwnerCompDataset } from "./types";

// BLS OEWS May 2023 national, cross-industry annual percentile wages.
// Source: per-occupation profile pages at https://www.bls.gov/oes/2023/may/oesXXXXXX.htm
export const dataset2023: OwnerCompDataset = {
  version: 2023,
  release: "May 2023 OEWS",
  socs: {
    "11-1021": {
      soc: "11-1021",
      occupationTitle: "General and Operations Managers",
      release: "May 2023",
      releaseYear: 2023,
      percentiles: { p10: 46340, p25: 65180, p50: 101280, p75: 160290, p90: 232110 },
      sourceUrl: "https://www.bls.gov/oes/2023/may/oes111021.htm",
      lastUpdated: "2026-06-29",
    },
    "11-9021": {
      soc: "11-9021",
      occupationTitle: "Construction Managers",
      release: "May 2023",
      releaseYear: 2023,
      percentiles: { p10: 64480, p25: 81640, p50: 104900, p75: 135550, p90: 172040 },
      sourceUrl: "https://www.bls.gov/oes/2023/may/oes119021.htm",
      lastUpdated: "2026-06-29",
    },
    "11-9051": {
      soc: "11-9051",
      occupationTitle: "Food Service Managers",
      release: "May 2023",
      releaseYear: 2023,
      percentiles: { p10: 42990, p25: 50390, p50: 63060, p75: 79630, p90: 101240 },
      sourceUrl: "https://www.bls.gov/oes/2023/may/oes119051.htm",
      lastUpdated: "2026-06-29",
    },
    "11-9111": {
      soc: "11-9111",
      occupationTitle: "Medical and Health Services Managers",
      release: "May 2023",
      releaseYear: 2023,
      percentiles: { p10: 67900, p25: 86080, p50: 110680, p75: 157640, p90: 216750 },
      sourceUrl: "https://www.bls.gov/oes/2023/may/oes119111.htm",
      lastUpdated: "2026-06-29",
    },
    "11-9031": {
      soc: "11-9031",
      occupationTitle: "Education and Childcare Administrators, Preschool and Daycare",
      release: "May 2023",
      releaseYear: 2023,
      percentiles: { p10: 36550, p25: 44420, p50: 54290, p75: 69350, p90: 94890 },
      sourceUrl: "https://www.bls.gov/oes/2023/may/oes119031.htm",
      lastUpdated: "2026-06-29",
    },
  },
};
