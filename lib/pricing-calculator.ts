// Pricing Calculator - "Price Router" Logic
// Calculates: Total Price = [Base Package Price] + [Selected Add-ons] + [Applicable State Fee/Surcharge]

// State filing fees - ranges from $35 (Montana) to $500 (Massachusetts)
export const STATE_FEES: Record<string, number> = {
  AL: 236, // Alabama
  AK: 250, // Alaska
  AZ: 50, // Arizona
  AR: 45, // Arkansas
  CA: 70, // California
  CO: 50, // Colorado
  CT: 120, // Connecticut
  DE: 90, // Delaware
  DC: 220, // District of Columbia
  FL: 125, // Florida
  GA: 100, // Georgia
  HI: 51, // Hawaii
  ID: 100, // Idaho
  IL: 154, // Illinois
  IN: 95, // Indiana
  IA: 50, // Iowa
  KS: 165, // Kansas
  KY: 40, // Kentucky
  LA: 100, // Louisiana
  ME: 175, // Maine
  MD: 100, // Maryland
  MA: 500, // Massachusetts
  MI: 50, // Michigan
  MN: 155, // Minnesota
  MS: 50, // Mississippi
  MO: 50, // Missouri
  MT: 35, // Montana
  NE: 105, // Nebraska
  NV: 425, // Nevada
  NH: 100, // New Hampshire
  NJ: 125, // New Jersey
  NM: 50, // New Mexico
  NY: 200, // New York
  NC: 125, // North Carolina
  ND: 135, // North Dakota
  OH: 99, // Ohio
  OK: 100, // Oklahoma
  OR: 100, // Oregon
  PA: 125, // Pennsylvania
  RI: 150, // Rhode Island
  SC: 110, // South Carolina
  SD: 150, // South Dakota
  TN: 300, // Tennessee
  TX: 300, // Texas
  UT: 54, // Utah
  VT: 125, // Vermont
  VA: 100, // Virginia
  WA: 200, // Washington
  WV: 100, // West Virginia
  WI: 130, // Wisconsin
  WY: 100, // Wyoming
}

// State names for display
export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
}

// Tier definitions
export type PricingTier = "launchpad" | "accelerator" | "all-in"

export const TIER_BASE_PRICES: Record<PricingTier, number> = {
  launchpad: 0,
  accelerator: 149,
  "all-in": 499,
}

export const TIER_NAMES: Record<PricingTier, string> = {
  launchpad: "Launchpad",
  accelerator: "Accelerator",
  "all-in": "StartSmart All-In",
}

export const TIER_PRICE_IDS: Record<PricingTier, string> = {
  launchpad: "price_launchpad_0", // $0 - you'll need to create this in Stripe
  accelerator: "price_accelerator_149", // $149 - you'll need to create this in Stripe
  "all-in": "price_allin_499", // $499 - you'll need to create this in Stripe
}

// Add-on definitions
export interface AddOn {
  id: string
  name: string
  price: number
  priceId: string // Add Stripe Price ID
  description: string
  includedInTiers: PricingTier[] // Which tiers include this add-on for free
}

export const ADD_ONS: AddOn[] = [
  {
    id: "ein",
    name: "EIN Filing",
    price: 64,
    priceId: "price_addon_ein", // Add Stripe Price ID
    description: "Federal Employer Identification Number filing with the IRS",
    includedInTiers: ["accelerator", "all-in"],
  },
  {
    id: "operating-agreement",
    name: "Operating Agreement",
    price: 60,
    priceId: "price_addon_oa", // Add Stripe Price ID
    description: "Custom LLC Operating Agreement tailored to your business",
    includedInTiers: ["accelerator", "all-in"],
  },
  {
    id: "registered-agent",
    name: "Registered Agent (1 Year)",
    price: 149,
    priceId: "price_addon_ra", // Add Stripe Price ID
    description: "Professional registered agent service for one year",
    includedInTiers: ["all-in"],
  },
]

// States that require surcharges for the All-In tier
export const HIGH_FEE_STATES = ["MA", "NV"]
export const ALL_IN_SURCHARGE = 200
export const SURCHARGE_PRICE_ID = "price_surcharge_manv" // Add Stripe Price ID for surcharge

export function getStateFeeProductId(stateCode: string): string {
  return `price_statefee_${stateCode.toUpperCase()}`
}

// Calculate pricing based on tier, state, and add-ons
export interface PricingResult {
  basePrice: number
  stateFee: number
  addOnsTotal: number
  surcharge: number
  totalPrice: number
  breakdown: {
    label: string
    amount: number
  }[]
  selectedAddOns: AddOn[]
  includedAddOns: AddOn[]
}

export function calculatePricing(tier: PricingTier, stateCode: string, selectedAddOnIds: string[] = []): PricingResult {
  const basePrice = TIER_BASE_PRICES[tier]

  // Calculate state fee based on tier
  let stateFee = 0
  let surcharge = 0

  if (tier === "launchpad" || tier === "accelerator") {
    // Tiers 1 & 2: Add full state fee
    stateFee = STATE_FEES[stateCode] || 0
  } else if (tier === "all-in") {
    // Tier 3 (All-In): State fee absorbed, but MA/NV get $200 surcharge
    stateFee = 0 // NexTax absorbs the fee
    if (HIGH_FEE_STATES.includes(stateCode)) {
      surcharge = ALL_IN_SURCHARGE
    }
  }

  // Calculate add-ons
  const includedAddOns = ADD_ONS.filter((addOn) => addOn.includedInTiers.includes(tier))
  const includedAddOnIds = includedAddOns.map((a) => a.id)

  // Only charge for add-ons NOT included in the tier
  const chargeableAddOns = ADD_ONS.filter(
    (addOn) => selectedAddOnIds.includes(addOn.id) && !includedAddOnIds.includes(addOn.id),
  )
  const addOnsTotal = chargeableAddOns.reduce((sum, addOn) => sum + addOn.price, 0)

  const totalPrice = basePrice + stateFee + addOnsTotal + surcharge

  // Build breakdown for display
  const breakdown: { label: string; amount: number }[] = [{ label: `${TIER_NAMES[tier]} Package`, amount: basePrice }]

  if (stateFee > 0) {
    breakdown.push({ label: `${STATE_NAMES[stateCode]} State Filing Fee`, amount: stateFee })
  }

  if (surcharge > 0) {
    breakdown.push({ label: `${STATE_NAMES[stateCode]} Processing Surcharge`, amount: surcharge })
  }

  chargeableAddOns.forEach((addOn) => {
    breakdown.push({ label: addOn.name, amount: addOn.price })
  })

  return {
    basePrice,
    stateFee,
    addOnsTotal,
    surcharge,
    totalPrice,
    breakdown,
    selectedAddOns: chargeableAddOns,
    includedAddOns,
  }
}

// Get available add-ons for a tier (ones not already included)
export function getAvailableAddOns(tier: PricingTier): AddOn[] {
  return ADD_ONS.filter((addOn) => !addOn.includedInTiers.includes(tier))
}

// Get included add-ons for a tier
export function getIncludedAddOns(tier: PricingTier): AddOn[] {
  return ADD_ONS.filter((addOn) => addOn.includedInTiers.includes(tier))
}

// Format price for display
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Get all states sorted by name
export function getAllStates(): { code: string; name: string; fee: number }[] {
  return Object.entries(STATE_NAMES)
    .map(([code, name]) => ({
      code,
      name,
      fee: STATE_FEES[code] || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export interface StripeLineItem {
  price: string
  quantity: number
}

export function generateStripeLineItems(
  tier: PricingTier,
  stateCode: string,
  selectedAddOnIds: string[] = [],
): StripeLineItem[] {
  const lineItems: StripeLineItem[] = []
  const pricing = calculatePricing(tier, stateCode, selectedAddOnIds)

  // Add base tier (even if $0, we want it in the order for tracking)
  if (TIER_BASE_PRICES[tier] > 0) {
    lineItems.push({
      price: TIER_PRICE_IDS[tier],
      quantity: 1,
    })
  }

  // Add state fee (for Launchpad and Accelerator)
  if (pricing.stateFee > 0) {
    lineItems.push({
      price: getStateFeeProductId(stateCode),
      quantity: 1,
    })
  }

  // Add surcharge for high-fee states on All-In
  if (pricing.surcharge > 0) {
    lineItems.push({
      price: SURCHARGE_PRICE_ID,
      quantity: 1,
    })
  }

  // Add selected add-ons (only ones not included in tier)
  pricing.selectedAddOns.forEach((addOn) => {
    lineItems.push({
      price: addOn.priceId,
      quantity: 1,
    })
  })

  return lineItems
}
