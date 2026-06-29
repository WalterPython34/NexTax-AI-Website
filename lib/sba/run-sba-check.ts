import { evaluateSba, type SbaInputs, type SbaResult } from "./sba-engine";
import type { OwnerComp, OwnerCompProvider, OwnerRole } from "./owner-comp-provider";

export interface SbaCheckRequest {
  reportedSde: number;
  annualRevenue: number;
  askingPrice: number;
  debtPercent: number;
  ratePercent: number;
  termYears: number;
  industryKey: string;
  role?: OwnerRole;
  medianMargin: number | null;
  provenance?: SbaInputs["provenance"];
  ownerCompOverride?: number;
}

function assumptionOwnerComp(value: number): OwnerComp {
  return {
    value,
    provenance: "assumption",
    groundingStrength: "user",
    grounding: "assumption",
    groundingNote: "Owner compensation was entered by hand rather than taken from the benchmark.",
  };
}

export async function runSbaCheck(
  request: SbaCheckRequest,
  provider: OwnerCompProvider,
): Promise<SbaResult> {
  const ownerComp =
    request.ownerCompOverride !== undefined
      ? assumptionOwnerComp(request.ownerCompOverride)
      : await provider.resolve({
          industryKey: request.industryKey,
          annualRevenue: request.annualRevenue,
          role: request.role,
        });

  const inputs: SbaInputs = {
    reportedSde: request.reportedSde,
    annualRevenue: request.annualRevenue,
    askingPrice: request.askingPrice,
    debtPercent: request.debtPercent,
    ratePercent: request.ratePercent,
    termYears: request.termYears,
    ownerComp,
    medianMargin: request.medianMargin,
    provenance: request.provenance,
  };

  return evaluateSba(inputs);
}
