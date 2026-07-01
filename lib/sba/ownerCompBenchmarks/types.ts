export type Percentile = "p10" | "p25" | "p50" | "p75" | "p90";

export interface SocBenchmark {
  soc: string;
  occupationTitle: string;
  release: string;
  releaseYear: number;
  percentiles: Partial<Record<Percentile, number>>;
  sourceUrl: string;
  lastUpdated: string;
}

export interface OwnerCompDataset {
  version: number;
  release: string;
  socs: Record<string, SocBenchmark>;
}
