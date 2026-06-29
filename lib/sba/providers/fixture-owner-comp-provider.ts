import type { OwnerComp, OwnerCompProvider } from "../owner-comp-provider";

export function fixtureOwnerCompProvider(value = 70000): OwnerCompProvider {
  return {
    id: "fixture-not-for-production",
    label: "Fixture owner-comp (development only)",
    async resolve(query): Promise<OwnerComp> {
      return {
        value,
        provenance: "benchmark",
        groundingStrength: "full",
        grounding: "industry",
        providerId: "fixture-not-for-production",
        source: "FIXTURE",
        soc: "11-1021",
        occupationLabel: "General and Operations Managers",
        role: query.role ?? "operator",
      };
    },
  };
}
