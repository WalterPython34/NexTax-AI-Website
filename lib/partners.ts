// lib/partners.ts
// Single source of truth for partner commerce identity.
//
// The signin recognition strip (buyer-dashboard) and the checkout discount
// (upgrade API route, B4) MUST both read from this map so the UI can never
// advertise a price the checkout does not honor. One residual seam remains by
// necessity: amountOffMonthly here and the Stripe coupon object are two
// systems that must move together. The partner-statement reconciliation (B5)
// is the tripwire if they ever drift.
//
// Discount mechanics (amended B4): the Stripe COUPON is applied server-side
// by ID for attributed users only. No human-typeable promotion code exists,
// so there is nothing to leak.

// Single billing source for the AcquiFlow Pro subscription price. The
// marketing page and dashboard upgrade path should adopt this constant so a
// future price change is a one-line edit (the $39->$49 change touched two
// hardcoded copies; that is the incident this prevents).
export const ACQUIFLOW_PRO_PRICE_ID = "price_1TsamtGA3ir6ndSx3alTZQ3z";

export interface PartnerCommerce {
  slug: string;
  displayName: string;
  baseMonthlyPrice: number;    // standard Pro price, dollars
  amountOffMonthly: number;    // must match the Stripe coupon's amount off
  stripeCouponId: string | null; // fill with the coupon id once created (B4)
}

export const PARTNER_COMMERCE: Record<string, PartnerCommerce> = {
  smbdealhunter: {
    slug: "smbdealhunter",
    displayName: "SMB Deal Hunter",
    baseMonthlyPrice: 49,
    amountOffMonthly: 15,
    stripeCouponId: "smbdh-member-15",
  },
};

/** Member price derives from one arithmetic source; never hardcode $34 elsewhere. */
export function memberMonthlyPrice(p: PartnerCommerce): number {
  return p.baseMonthlyPrice - p.amountOffMonthly;
}
