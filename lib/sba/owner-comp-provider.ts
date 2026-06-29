export type OwnerCompProvenance = "benchmark" | "assumption";

export type OwnerCompGroundingStrength = "full" | "partial" | "user";

export type OwnerRole = "operator" | "operator_technical" | "passive";

export interface OwnerComp {
  value: number;
  provenance: OwnerCompProvenance;
  groundingStrength: OwnerCompGroundingStrength;
  groundingNote?: string;
  grounding?: string;
  providerId?: string;
  source?: string;
  release?: string;
  soc?: string;
  occupationLabel?: string;
  band?: string;
  percentile?: number;
  role?: OwnerRole;
}

export interface OwnerCompQuery {
  industryKey: string;
  annualRevenue: number;
  role?: OwnerRole;
}

export interface OwnerCompProvider {
  readonly id: string;
  readonly label: string;
  resolve(query: OwnerCompQuery): Promise<OwnerComp>;
}
