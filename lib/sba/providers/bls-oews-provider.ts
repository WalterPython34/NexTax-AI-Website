import type { OwnerCompProvider, OwnerCompQuery } from "../owner-comp-provider";

export class OwnerCompNotPopulatedError extends Error {
  constructor(query: OwnerCompQuery) {
    super(
      `BLS OEWS owner-comp table is not populated for industry "${query.industryKey}". ` +
        "Populate the table after the band-to-percentile bridge and SOC mapping are locked.",
    );
    this.name = "OwnerCompNotPopulatedError";
  }
}

export const blsOewsProvider: OwnerCompProvider = {
  id: "bls-oews-v1",
  label: "BLS OEWS (national, role-matched replacement wage)",
  async resolve(query: OwnerCompQuery) {
    throw new OwnerCompNotPopulatedError(query);
  },
};
