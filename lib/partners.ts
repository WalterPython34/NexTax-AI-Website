// lib/partners.ts
// SINGLE SOURCE OF TRUTH for all partner behaviors: commerce, brand, QoE.
// Consumers: B3 recognition strip, B4 checkout discount, co-brand lockups,
// QoE handoff picker, partner statements. If a partner's price, name, color,
// or provider appears anywhere in the product, it comes from here.
// (lib/partnerConfig.ts is a thin re-export shim kept for existing imports.)

export const ACQUIFLOW_PRO_PRICE_ID = "price_1TsamtGA3ir6ndSx3alTZQ3z";

// ── QoE providers ────────────────────────────────────────────────────────────

export interface QoeProvider {
  key: string;
  name: string;
  email: string | null;   // from env; null → hidden from picker (server-only)
  blurb: string;           // one line shown in the picker
}

/** Providers available to ALL users (Steve's existing partner lanes). */
export const DEFAULT_QOE_PROVIDERS: QoeProvider[] = [
  {
    key: "rapid_diligence",
    name: "Rapid Diligence",
    email: process.env.QOE_RAPID_DILIGENCE_EMAIL ?? null,
    blurb: "Quality of earnings and financial due diligence for SMB acquisitions.",
  },
];

// ── Partner definition ───────────────────────────────────────────────────────

export interface PartnerCommerce {
  slug: string;
  displayName: string;
  baseMonthlyPrice: number;      // standard Pro price, dollars
  amountOffMonthly: number;      // must match the Stripe coupon's amount off
  stripeCouponId: string | null; // applied server-side by id; no typeable code
}

export interface Partner extends PartnerCommerce {
  brandColor: string | null;     // partner brand hex for co-brand lockups; null → default ink
  qoeProviders: QoeProvider[];
}

export const PARTNERS: Record<string, Partner> = {
  smbdealhunter: {
    slug: "smbdealhunter",
    displayName: "SMB Deal Hunter",
    baseMonthlyPrice: 49,
    amountOffMonthly: 15,
    stripeCouponId: "smbdh-member-15",
    brandColor: "#1B7FF2",       // verify against their site button via DevTools
    qoeProviders: [
      // SMB Deal Hunter's preferred QoE providers — fill from Bill's list.
      {
        key: "smbdh_qoe_primary",
        name: "SMB Deal Hunter QoE Partner",   // replace with the real firm name
        email: process.env.QOE_SMBDH_PRIMARY_EMAIL ?? null,
        blurb: "Preferred quality-of-earnings provider for SMB Deal Hunter members.",
      },
      ...DEFAULT_QOE_PROVIDERS,
    ],
  },
};

// Backward-compat alias: existing checkout code reads PARTNER_COMMERCE.
// Partner extends PartnerCommerce, so this is the same object, wider type.
export const PARTNER_COMMERCE: Record<string, PartnerCommerce> = PARTNERS;

// ── Derived pricing (one arithmetic source; never hardcode $34 anywhere) ────

export function memberMonthlyPrice(p: PartnerCommerce): number {
  return p.baseMonthlyPrice - p.amountOffMonthly;
}

/** Display label, derived — e.g. "$34/mo". Use this everywhere a price renders. */
export function memberPriceLabel(p: PartnerCommerce): string {
  return `$${memberMonthlyPrice(p)}/mo`;
}

// ── Lookups ──────────────────────────────────────────────────────────────────

export function getPartner(slug: string | null | undefined): Partner | null {
  if (!slug) return null;
  return PARTNERS[slug] ?? null;
}

/** Provider list for a user: partner list when attributed, defaults otherwise.
 *  Filters out providers without a configured email. */
export function getQoeProviders(partnerSlug: string | null | undefined): QoeProvider[] {
  const list = getPartner(partnerSlug)?.qoeProviders ?? DEFAULT_QOE_PROVIDERS;
  return list.filter((p) => p.email !== null);
}
