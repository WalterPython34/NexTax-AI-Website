import type { OwnerComp, OwnerCompProvider, OwnerCompQuery } from "../owner-comp-provider";
import { getDataset, CURRENT_BENCHMARK_VERSION } from "../ownerCompBenchmarks/index";
import type { OwnerCompDataset } from "../ownerCompBenchmarks/index";

// Re-exported so consumers (e.g. the API route) can read the active version
// without importing benchmark internals through the "@/" alias.
export { CURRENT_BENCHMARK_VERSION } from "../ownerCompBenchmarks/index";
import {
  FAMILIES,
  DEFAULT_FAMILY,
  familyForIndustry,
  getRevenueBand,
  ownerCompForBand,
} from "../owner-comp-families";

const FALLBACK_NOTE =
  "National owner-comp benchmark used because industry-specific data is not yet available.";

export function createBlsOewsProvider(
  versionOrDataset: number | OwnerCompDataset = CURRENT_BENCHMARK_VERSION,
): OwnerCompProvider {
  const dataset =
    typeof versionOrDataset === "number" ? getDataset(versionOrDataset) : versionOrDataset;
  const id = `bls-oews-${dataset.version}`;

  return {
    id,
    label: `BLS OEWS (${dataset.release}, role-matched)`,
    async resolve(query: OwnerCompQuery): Promise<OwnerComp> {
      const band = getRevenueBand(query.annualRevenue);
      const role = query.role ?? "operator";
      const family = familyForIndustry(query.industryKey);

      const familyRecord = dataset.socs[family.soc];
      const familySelection = familyRecord
        ? ownerCompForBand(familyRecord.percentiles, band)
        : null;

      if (familyRecord && familySelection) {
        return {
          value: familySelection.value,
          provenance: "benchmark",
          groundingStrength: "full",
          grounding: "industry",
          providerId: id,
          source: "BLS_OEWS",
          release: familyRecord.release,
          soc: familyRecord.soc,
          occupationLabel: familyRecord.occupationTitle,
          band,
          percentile: parseInt(familySelection.percentileLabel, 10) || undefined,
          role,
        };
      }

      const defaultSoc = FAMILIES[DEFAULT_FAMILY].soc;
      const defaultRecord = dataset.socs[defaultSoc];
      const defaultSelection = defaultRecord
        ? ownerCompForBand(defaultRecord.percentiles, band)
        : null;

      if (!defaultRecord || !defaultSelection) {
        throw new Error(
          `Owner-comp benchmark unavailable for industry "${query.industryKey}" and the default occupation is not populated in dataset ${dataset.version}.`,
        );
      }

      return {
        value: defaultSelection.value,
        provenance: "benchmark",
        groundingStrength: "partial",
        grounding: "national",
        groundingNote: FALLBACK_NOTE,
        providerId: id,
        source: "BLS_OEWS",
        release: defaultRecord.release,
        soc: defaultRecord.soc,
        occupationLabel: defaultRecord.occupationTitle,
        band,
        percentile: parseInt(defaultSelection.percentileLabel, 10) || undefined,
        role,
      };
    },
  };
}

export const blsOewsProvider = createBlsOewsProvider();
