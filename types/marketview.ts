// ===========================================
// Market Saturation Analyzer — Type Definitions
// ===========================================

export interface AnalysisRequest {
  address: string;
  category: string;
  radius: number; // miles
  lat?: number;
  lng?: number;
}

export interface Competitor {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  priceLevel: number | null;
  distance: number; // miles from target
  source: "google" | "yelp" | "both";
  placeId?: string;
  yelpId?: string;
  categories: string[];
  phone?: string;
  website?: string;
  photos?: string[];
  isFranchise: boolean;

  // AI-classified fields (populated after classification)
  classification?: CompetitorClassification;
  tier?: CompetitorTier;
  estimatedRevenue?: RevenueEstimate;
}

export type CompetitorClassification =
  | "Direct Competitor"
  | "Indirect Competitor"
  | "Franchise Sibling"
  | "Adjacent Service";

export type CompetitorTier = "Premium" | "Mid-Market" | "Value" | "Budget";

export interface RevenueEstimate {
  low: number;
  mid: number;
  high: number;
  confidence: "low" | "medium" | "high";
  method: string;
}

export interface SaturationMetrics {
  totalCompetitors: number;
  directCompetitors: number;
  indirectCompetitors: number;
  franchiseSiblings: number;
  adjacentServices: number;

  avgRating: number;
  avgReviews: number;
  medianRating: number;

  densityPer10k: number;
  populationEstimate: number;
  popPerCompetitor: number;

  saturationScore: number; // 0-100
  riskBand: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  riskColor: string;

  avgEstRevenue: number;
  totalEstRevenue: number;

  tierBreakdown: {
    premium: number;
    midMarket: number;
    value: number;
    budget: number;
  };

  typeBreakdown: {
    direct: number;
    indirect: number;
    franchise: number;
    adjacent: number;
  };

  ratingDistribution: {
    excellent: number; // 4.5-5.0
    good: number; // 4.0-4.4
    average: number; // 3.5-3.9
    belowAverage: number; // 3.0-3.4
    poor: number; // < 3.0
  };
}

export interface AnalysisResult {
  competitors: Competitor[];
  metrics: SaturationMetrics;
  aiInsight: string;
  metadata: {
    address: string;
    category: string;
    radius: number;
    lat: number;
    lng: number;
    analyzedAt: string;
    dataSources: string[];
  };
}

export interface CensusData {
  totalPopulation: number;
  medianIncome: number;
  populationDensity: number; // per sq mile
  state: string;
  county: string;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  state: string;
  county: string;
  zipCode: string;
}

// Category mapping for API queries
export interface CategoryMapping {
  label: string;
  googleTypes: string[]; // Google Places types
  yelpCategories: string[]; // Yelp category aliases
  keywords: string[];
  revenueMultiplier: number; // avg revenue per review
  franchiseKeywords: string[];
}
