import { Competitor, GeocodingResult } from "@/types/marketview";
import { CATEGORY_MAPPINGS } from "@/lib/marketview/categories";

// ===========================================
// Google Places API Service (NEW API)
// ===========================================
// Uses the Places API (New) endpoints:
// - Geocoding: maps.googleapis.com/maps/api/geocode (legacy, still works)
// - Nearby Search: places.googleapis.com/v1/places:searchNearby

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

// ─── Geocoding (uses legacy endpoint — still works fine) ───

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || !data.results?.length) {
    throw new Error(`Geocoding failed: ${data.status} — ${data.error_message || "No results"}`);
  }

  const result = data.results[0];
  const location = result.geometry.location;

  const getComponent = (type: string) =>
    result.address_components?.find((c: any) => c.types.includes(type))?.long_name || "";

  return {
    lat: location.lat,
    lng: location.lng,
    formattedAddress: result.formatted_address,
    state: getComponent("administrative_area_level_1"),
    county: getComponent("administrative_area_level_2"),
    zipCode: getComponent("postal_code"),
  };
}

// ─── Nearby Search (NEW API) ───

interface NearbySearchParams {
  lat: number;
  lng: number;
  radiusMiles: number;
  category: string;
}

export async function searchNearbyCompetitors(
  params: NearbySearchParams
): Promise<Competitor[]> {
  const { lat, lng, radiusMiles, category } = params;
  const radiusMeters = Math.round(radiusMiles * 1609.34);
  const mapping = CATEGORY_MAPPINGS[category];

  if (!mapping) {
    throw new Error(`Unknown category: ${category}`);
  }

  const allCompetitors: Competitor[] = [];
  const seenPlaceIds = new Set<string>();

  // The New API uses "includedTypes" instead of the old "type" parameter.
  // Map our old types to new types. The new API type names are slightly different.
  const newApiTypes = mapToNewApiTypes(mapping.googleTypes);

  // Search with included types
  if (newApiTypes.length > 0) {
    try {
      const results = await fetchNearbyNew({
        lat,
        lng,
        radiusMeters,
        includedTypes: newApiTypes,
      });

      for (const comp of results) {
        if (!seenPlaceIds.has(comp.placeId || "")) {
          seenPlaceIds.add(comp.placeId || "");
          allCompetitors.push(comp);
        }
      }
    } catch (err) {
      console.error("Places API (New) nearby search failed:", err);
    }
  }

  // Also do a text search for keywords to catch more results
  for (const keyword of mapping.keywords.slice(0, 2)) {
    try {
      const results = await fetchTextSearchNew({
        lat,
        lng,
        radiusMeters,
        query: keyword,
      });

      for (const comp of results) {
        if (!seenPlaceIds.has(comp.placeId || "")) {
          seenPlaceIds.add(comp.placeId || "");
          allCompetitors.push(comp);
        }
      }
    } catch (err) {
      console.error(`Text search failed for "${keyword}":`, err);
    }
  }

  // Calculate distance and franchise status
  return allCompetitors.map((comp) => ({
    ...comp,
    distance: haversineDistance(lat, lng, comp.lat, comp.lng),
    isFranchise: isFranchiseBusiness(comp.name, category),
  }));
}

// ─── Nearby Search using NEW Places API ───

interface FetchNearbyNewParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  includedTypes: string[];
}

async function fetchNearbyNew(
  params: FetchNearbyNewParams
): Promise<Competitor[]> {
  const { lat, lng, radiusMeters, includedTypes } = params;

  const url = "https://places.googleapis.com/v1/places:searchNearby";

  const body = {
    includedTypes,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.min(radiusMeters, 50000), // Max 50km
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.websiteUri,places.nationalPhoneNumber,places.photos",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.error) {
    console.error("Places Nearby error:", data.error.message);
    return [];
  }

  return (data.places || []).map(mapNewPlaceToCompetitor);
}

// ─── Text Search using NEW Places API ───

interface FetchTextSearchNewParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  query: string;
}

async function fetchTextSearchNew(
  params: FetchTextSearchNewParams
): Promise<Competitor[]> {
  const { lat, lng, radiusMeters, query } = params;

  const url = "https://places.googleapis.com/v1/places:searchText";

  const body = {
    textQuery: query,
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.min(radiusMeters, 50000),
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.websiteUri,places.nationalPhoneNumber",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.error) {
    console.error("Places Text Search error:", data.error.message);
    return [];
  }

  return (data.places || []).map(mapNewPlaceToCompetitor);
}

// ─── Map new API response to our Competitor type ───

function mapNewPlaceToCompetitor(place: any): Competitor {
  return {
    name: place.displayName?.text || place.displayName || "Unknown",
    address: place.formattedAddress || "",
    lat: place.location?.latitude || 0,
    lng: place.location?.longitude || 0,
    rating: place.rating || 0,
    reviewCount: place.userRatingCount || 0,
    priceLevel: priceLevelToNumber(place.priceLevel),
    distance: 0, // calculated after
    source: "google" as const,
    placeId: place.id,
    categories: place.types || [],
    phone: place.nationalPhoneNumber,
    website: place.websiteUri,
    isFranchise: false, // determined after
    photos: place.photos?.slice(0, 2).map(
      (p: any) => `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=400&key=${GOOGLE_API_KEY}`
    ),
  };
}

// ─── Map old type names to new API type names ───

function mapToNewApiTypes(oldTypes: string[]): string[] {
  const typeMapping: Record<string, string> = {
    gym: "gym",
    health: "gym",
    restaurant: "restaurant",
    cafe: "cafe",
    car_repair: "car_repair",
    dentist: "dentist",
    spa: "spa",
    beauty_salon: "beauty_salon",
    hair_care: "hair_care",
    school: "school",
    pet_store: "pet_store",
    veterinary_care: "veterinary_care",
    home_goods_store: "home_goods_store",
    plumber: "plumber",
    electrician: "electrician",
    accounting: "accounting",
    physiotherapist: "physiotherapist",
    doctor: "doctor",
    meal_takeaway: "meal_takeaway",
    liquor_store: "liquor_store",
    laundry: "laundry",
    hospital: "hospital",
    insurance_agency: "insurance_agency",
    real_estate_agency: "real_estate_agency",
  };

  const mapped = oldTypes
    .map((t) => typeMapping[t])
    .filter(Boolean);

  // Deduplicate
  return [...new Set(mapped)];
}

// ─── Convert new API price level strings to numbers ───

function priceLevelToNumber(priceLevel: string | undefined): number | null {
  if (!priceLevel) return null;
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[priceLevel] ?? null;
}

// ─── Place Details (for enrichment) ───

export async function getPlaceDetails(placeId: string): Promise<any> {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,rating,userRatingCount,websiteUri,nationalPhoneNumber,regularOpeningHours,priceLevel",
    },
  });
  const data = await res.json();
  return data;
}

// ─── Utilities ───

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function isFranchiseBusiness(name: string, category: string): boolean {
  const mapping = CATEGORY_MAPPINGS[category];
  if (!mapping) return false;

  const nameLower = name.toLowerCase();
  return mapping.franchiseKeywords.some((kw) =>
    nameLower.includes(kw.toLowerCase())
  );
}
