import type { OwnerCompDataset } from "./types";
import { dataset2025 } from "./2025";
import { dataset2023 } from "./2023";

// Registered benchmark releases. 2025 is production; 2023 is retained as
// fallback/dev data, reachable via createBlsOewsProvider(2023).
export const BENCHMARK_VERSIONS: Record<number, OwnerCompDataset> = {
  2025: dataset2025,
  2023: dataset2023,
};

export const CURRENT_BENCHMARK_VERSION = 2025;

// Most recent prior release, available as a dev/fallback dataset.
export const FALLBACK_BENCHMARK_VERSION = 2023;

export function getDataset(version: number = CURRENT_BENCHMARK_VERSION): OwnerCompDataset {
  const dataset = BENCHMARK_VERSIONS[version];
  if (!dataset) throw new Error(`No owner-comp benchmark dataset for version ${version}`);
  return dataset;
}

export type { OwnerCompDataset, SocBenchmark, Percentile } from "./types";
