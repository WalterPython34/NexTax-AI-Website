export interface SbaIndustry {
  key: string;
  label: string;
  sdeMarginMid: number;
}

export const SBA_INDUSTRIES: SbaIndustry[] = [
  { key: "accounting", label: "Accounting / Tax Firm", sdeMarginMid: 0.425 },
  { key: "autorepair", label: "Auto Repair", sdeMarginMid: 0.225 },
  { key: "carwash", label: "Car Wash", sdeMarginMid: 0.35 },
  { key: "cleaning", label: "Cleaning Service", sdeMarginMid: 0.225 },
  { key: "construction", label: "Construction (Other)", sdeMarginMid: 0.225 },
  { key: "daycare", label: "Daycare / Childcare", sdeMarginMid: 0.225 },
  { key: "dental", label: "Dental Practice", sdeMarginMid: 0.3 },
  { key: "ecommerce", label: "Ecommerce Brand", sdeMarginMid: 0.25 },
  { key: "electrical", label: "Electrical Contractor", sdeMarginMid: 0.225 },
  { key: "engineering", label: "Engineering Services", sdeMarginMid: 0.3 },
  { key: "grocery", label: "Grocery Store", sdeMarginMid: 0.125 },
  { key: "gym", label: "Gym / Fitness Center", sdeMarginMid: 0.25 },
  { key: "hairsalon", label: "Hair Salon", sdeMarginMid: 0.225 },
  { key: "healthcare", label: "Healthcare / Home Health", sdeMarginMid: 0.25 },
  { key: "hvac", label: "HVAC", sdeMarginMid: 0.225 },
  { key: "insurance", label: "Insurance Agency", sdeMarginMid: 0.3 },
  { key: "landscaping", label: "Landscaping", sdeMarginMid: 0.175 },
  { key: "laundromat", label: "Laundromat", sdeMarginMid: 0.325 },
  { key: "marketing", label: "Marketing Agency", sdeMarginMid: 0.275 },
  { key: "medspa", label: "Med Spa / Aesthetics", sdeMarginMid: 0.35 },
  { key: "painting", label: "Painting Contractor", sdeMarginMid: 0.225 },
  { key: "pestcontrol", label: "Pest Control", sdeMarginMid: 0.275 },
  { key: "petcare", label: "Pet Care / Grooming", sdeMarginMid: 0.3 },
  { key: "pharmacy", label: "Pharmacy", sdeMarginMid: 0.24 },
  { key: "physicaltherapy", label: "Physical Therapy / Chiropractic", sdeMarginMid: 0.275 },
  { key: "plumbing", label: "Plumbing", sdeMarginMid: 0.225 },
  { key: "printing", label: "Printing / Marketing", sdeMarginMid: 0.225 },
  { key: "propertymanage", label: "Property Management", sdeMarginMid: 0.3 },
  { key: "realestatebrok", label: "Real Estate Brokerage", sdeMarginMid: 0.225 },
  { key: "remodeling", label: "Home Remodeling & Restoration", sdeMarginMid: 0.2 },
  { key: "restaurant", label: "Restaurant", sdeMarginMid: 0.1 },
  { key: "roofing", label: "Roofing", sdeMarginMid: 0.225 },
  { key: "saas", label: "SaaS Product", sdeMarginMid: 0.725 },
  { key: "security", label: "Security Services", sdeMarginMid: 0.225 },
  { key: "seniorcare", label: "Senior Care / Home Health", sdeMarginMid: 0.15 },
  { key: "storage", label: "Self-Storage", sdeMarginMid: 0.525 },
  { key: "transportation", label: "Transportation / Trucking", sdeMarginMid: 0.175 },
];

export const SBA_INDUSTRY_BY_KEY: Record<string, SbaIndustry> = Object.fromEntries(
  SBA_INDUSTRIES.map((i) => [i.key, i]),
);
