import { CensusData } from "@/types/marketview";

// ===========================================
// US Census API Service
// ===========================================
// Fetches population and income data for density calculations.
// Uses the ACS 5-Year Estimates for reliability.

const CENSUS_API_KEY = process.env.CENSUS_API_KEY || "";
const CENSUS_BASE = "https://api.census.gov/data";

// State FIPS codes
const STATE_FIPS: Record<string, string> = {
  Alabama: "01", Alaska: "02", Arizona: "04", Arkansas: "05", California: "06",
  Colorado: "08", Connecticut: "09", Delaware: "10", "District of Columbia": "11",
  Florida: "12", Georgia: "13", Hawaii: "15", Idaho: "16", Illinois: "17",
  Indiana: "18", Iowa: "19", Kansas: "20", Kentucky: "21", Louisiana: "22",
  Maine: "23", Maryland: "24", Massachusetts: "25", Michigan: "26", Minnesota: "27",
  Mississippi: "28", Missouri: "29", Montana: "30", Nebraska: "31", Nevada: "32",
  "New Hampshire": "33", "New Jersey": "34", "New Mexico": "35", "New York": "36",
  "North Carolina": "37", "North Dakota": "38", Ohio: "39", Oklahoma: "40",
  Oregon: "41", Pennsylvania: "42", "Rhode Island": "44", "South Carolina": "45",
  "South Dakota": "46", Tennessee: "47", Texas: "48", Utah: "49", Vermont: "50",
  Virginia: "51", Washington: "53", "West Virginia": "54", Wisconsin: "55",
  Wyoming: "56",
};

export async function getCensusData(
  state: string,
  county: string,
  zipCode?: string
): Promise<CensusData> {
  const stateFips = STATE_FIPS[state];

  if (!stateFips) {
    console.warn(`State FIPS not found for: ${state} — using population estimates`);
    return getEstimatedPopulation(state, county);
  }

  // Try zip code level first (most granular)
  if (zipCode && CENSUS_API_KEY) {
    try {
      return await fetchCensusForZip(zipCode);
    } catch (err) {
      console.warn("Zip-level census failed, falling back to county:", err);
    }
  }

  // Fall back to county-level data
  if (CENSUS_API_KEY) {
    try {
      return await fetchCensusForCounty(stateFips);
    } catch (err) {
      console.warn("County-level census failed, using estimates:", err);
    }
  }

  return getEstimatedPopulation(state, county);
}

// ─── Fetch Census data by ZIP code ───

async function fetchCensusForZip(zipCode: string): Promise<CensusData> {
  // ACS 5-Year: B01003_001E = total pop, B19013_001E = median income
  const url = `${CENSUS_BASE}/2022/acs/acs5?get=B01003_001E,B19013_001E,NAME&for=zip%20code%20tabulation%20area:${zipCode}&key=${CENSUS_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data || data.length < 2) {
    throw new Error("No census data for zip");
  }

  const row = data[1]; // first row is headers
  return {
    totalPopulation: parseInt(row[0]) || 0,
    medianIncome: parseInt(row[1]) || 0,
    populationDensity: 0, // not available at zip level from this endpoint
    state: "",
    county: row[2] || "",
  };
}

// ─── Fetch Census data by county ───

async function fetchCensusForCounty(stateFips: string): Promise<CensusData> {
  const url = `${CENSUS_BASE}/2022/acs/acs5?get=B01003_001E,B19013_001E,NAME&for=county:*&in=state:${stateFips}&key=${CENSUS_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data || data.length < 2) {
    throw new Error("No census data for county");
  }

  // Sum all counties in the state for a broad estimate,
  // or find the specific county if we have the name
  const row = data[1];
  return {
    totalPopulation: parseInt(row[0]) || 0,
    medianIncome: parseInt(row[1]) || 0,
    populationDensity: 0,
    state: stateFips,
    county: row[2] || "",
  };
}

// ─── Fallback: Estimate population from radius ───
// When Census API isn't available, estimate based on metro/suburban/rural patterns

export function estimatePopulationForRadius(
  radiusMiles: number,
  densityHint?: "urban" | "suburban" | "rural"
): number {
  // Average US population density: ~93 people per sq mile
  // Urban: ~3,000+, Suburban: ~1,000-3,000, Rural: ~50-200
  const density =
    densityHint === "urban"
      ? 2500
      : densityHint === "suburban"
      ? 1200
      : densityHint === "rural"
      ? 100
      : 800; // default: suburban-ish

  const areaSqMiles = Math.PI * radiusMiles * radiusMiles;
  return Math.round(areaSqMiles * density);
}

// ─── Estimated population when Census API unavailable ───

function getEstimatedPopulation(state: string, county: string): CensusData {
  // Very rough estimates — serves as a reasonable fallback
  return {
    totalPopulation: 0, // Will use radius-based estimation
    medianIncome: 65000, // US median
    populationDensity: 800,
    state,
    county,
  };
}
