import { Competitor } from "@/types/marketview";
import { CATEGORY_MAPPINGS } from "@/lib/marketview/categories";

// ===========================================
// Yelp Fusion API Service
// ===========================================
// Supplements Google Places data with Yelp reviews and ratings.
// Yelp often has richer review data for local businesses.

const YELP_API_KEY = process.env.YELP_API_KEY || "";
const YELP_BASE = "https://api.yelp.com/v3";

interface YelpSearchParams {
  lat: number;
  lng: number;
  radiusMiles: number;
  category: string;
}

export async function searchYelpCompetitors(
  params: YelpSearchParams
): Promise<Competitor[]> {
  if (!YELP_API_KEY) {
    console.warn("Yelp API key not configured — skipping Yelp data");
    return [];
  }

  const { lat, lng, radiusMiles, category } = params;
  const mapping = CATEGORY_MAPPINGS[category];
  if (!mapping) return [];

  // Yelp max radius is 40,000 meters (~24.8 miles)
  const radiusMeters = Math.min(Math.round(radiusMiles * 1609.34), 40000);
  const allResults: Competitor[] = [];
  const seenIds = new Set<string>();

  // Search each Yelp category
  for (const yelpCat of mapping.yelpCategories.slice(0, 3)) {
    try {
      const results = await fetchYelpPage({
        lat,
        lng,
        radiusMeters,
        categories: yelpCat,
        offset: 0,
      });

      for (const comp of results) {
        if (!seenIds.has(comp.yelpId || "")) {
          seenIds.add(comp.yelpId || "");
          allResults.push(comp);
        }
      }
    } catch (err) {
      console.error(`Yelp search failed for category ${yelpCat}:`, err);
    }
  }

  return allResults;
}

// ─── Fetch a page of Yelp results ───

interface FetchYelpPageParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  categories: string;
  offset: number;
}

async function fetchYelpPage(
  params: FetchYelpPageParams
): Promise<Competitor[]> {
  const { lat, lng, radiusMeters, categories, offset } = params;

  const searchParams = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    radius: String(radiusMeters),
    categories,
    limit: "50",
    offset: String(offset),
    sort_by: "distance",
  });

  const url = `${YELP_BASE}/businesses/search?${searchParams}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${YELP_API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Yelp API error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  return (data.businesses || []).map((biz: any) => ({
    name: biz.name,
    address: biz.location?.display_address?.join(", ") || "",
    lat: biz.coordinates?.latitude || 0,
    lng: biz.coordinates?.longitude || 0,
    rating: biz.rating || 0,
    reviewCount: biz.review_count || 0,
    priceLevel: biz.price ? biz.price.length : null,
    distance: (biz.distance || 0) / 1609.34, // convert meters to miles
    source: "yelp" as const,
    yelpId: biz.id,
    categories: biz.categories?.map((c: any) => c.alias) || [],
    phone: biz.phone,
    isFranchise: false,
    photos: biz.image_url ? [biz.image_url] : [],
  }));
}

// ─── Merge Yelp data with Google data ───

export function mergeCompetitorSources(
  googleResults: Competitor[],
  yelpResults: Competitor[]
): Competitor[] {
  const merged = [...googleResults];
  const matchThreshold = 0.15; // miles — if within ~800 feet, consider same business

  for (const yelpComp of yelpResults) {
    // Try to match with existing Google result by proximity + name similarity
    const match = merged.find((gComp) => {
      const distanceBetween = haversineDistance(
        gComp.lat,
        gComp.lng,
        yelpComp.lat,
        yelpComp.lng
      );
      const nameSimilar = fuzzyNameMatch(gComp.name, yelpComp.name);
      return distanceBetween < matchThreshold && nameSimilar;
    });

    if (match) {
      // Merge: keep Google as primary, enrich with Yelp
      match.source = "both";
      match.yelpId = yelpComp.yelpId;
      // Use higher review count
      if (yelpComp.reviewCount > match.reviewCount) {
        match.reviewCount = yelpComp.reviewCount;
      }
      // Average the ratings if both exist
      if (yelpComp.rating > 0 && match.rating > 0) {
        match.rating = Math.round(((match.rating + yelpComp.rating) / 2) * 10) / 10;
      }
    } else {
      // New business not in Google — add it
      merged.push(yelpComp);
    }
  }

  return merged;
}

// ─── Utilities ───

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fuzzyNameMatch(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const na = normalize(a);
  const nb = normalize(b);

  // Exact match after normalization
  if (na === nb) return true;

  // One contains the other
  if (na.includes(nb) || nb.includes(na)) return true;

  // First 8 chars match (handles "Joe's Pizza" vs "Joe's Pizza & Pasta")
  if (na.length >= 8 && nb.length >= 8 && na.slice(0, 8) === nb.slice(0, 8)) {
    return true;
  }

  return false;
}
