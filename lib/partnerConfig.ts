// lib/partnerConfig.ts
// SINGLE SOURCE OF TRUTH for all partner behaviors.
// Consumers: B3 recognition strip, B4 checkout discount, in-app price display,
// QoE handoff provider lists, partner statements. One object — if a price,
// name, or provider appears anywhere in the product, it comes from here.
// (Doctrine: two sources for one number is how the pharmacy incident happened.)
//
// FILL-IN REQUIRED before the QoE button goes live: provider emails are env
// refs, never hardcoded. Set the env vars in Vercel; a provider with a null
// email is hidden from the picker (never a send failure).

export interface QoeProvider {
  key: string;
  name: string;
  email: string | null;   // from env; null → hidden from picker
  blurb: string;           // one line shown in the picker
}

export interface PartnerConfig {
  slug: string;
  displayName: string;
  proPriceLabel: string;            // display only — checkout truth is the promotion below
  stripePromotionId: string | null; // promo_... (applied server-side by ID; no typeable code)
  brandColor: string | null;        // partner's brand hex for co-brand lockups; null → default ink
  qoeProviders: QoeProvider[];
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

export const PARTNERS: Record<string, PartnerConfig> = {
  smbdealhunter: {
    slug: "smbdealhunter",
    displayName: "SMB Deal Hunter",
    proPriceLabel: "$34/mo",
    stripePromotionId: process.env.STRIPE_PROMO_SMBDEALHUNTER ?? null,
    brandColor: "#1B7FF2",
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

export function getPartner(slug: string | null | undefined): PartnerConfig | null {
  if (!slug) return null;
  return PARTNERS[slug] ?? null;
}

/** Provider list for a user: partner list when attributed, defaults otherwise.
 *  Filters out providers without a configured email. */
export function getQoeProviders(partnerSlug: string | null | undefined): QoeProvider[] {
  const list = getPartner(partnerSlug)?.qoeProviders ?? DEFAULT_QOE_PROVIDERS;
  return list.filter((p) => p.email !== null);
}
