// lib/partnerConfig.ts
// SHIM — the single partner source of truth now lives in lib/partners.ts.
// This file exists only so existing imports (QoE handoff route, QoeHandoffButton)
// keep working. Do not add partner data here; add it in partners.ts.

export {
  PARTNERS,
  DEFAULT_QOE_PROVIDERS,
  getPartner,
  getQoeProviders,
  memberMonthlyPrice,
  memberPriceLabel,
} from "@/lib/partners";

export type { Partner, PartnerCommerce, QoeProvider } from "@/lib/partners";

// Legacy type alias for any code that referenced the old PartnerConfig name.
export type { Partner as PartnerConfig } from "@/lib/partners";
