import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress, searchNearbyCompetitors } from "@/lib/marketview/google-places";
import { searchYelpCompetitors, mergeCompetitorSources } from "@/lib/marketview/yelp";
import { getCensusData, estimatePopulationForRadius } from "@/lib/marketview/census";
import { classifyCompetitors, generateStrategicAssessment } from "@/lib/marketview/ai-classifier";
import { computeMetrics } from "@/lib/marketview/scoring";
import { AnalysisResult } from "@/types/marketview";

export async function POST(req: NextRequest) {
  try {
    // Simple auth check via env var
    const authHeader = req.headers.get("x-marketview-key");
    const expectedKey = process.env.MARKETVIEW_ACCESS_KEY;
    if (expectedKey && authHeader !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { address, category, radius = 10 } = body;

    if (!address || !category) {
      return NextResponse.json(
        { error: "address and category are required" },
        { status: 400 }
      );
    }

    const validRadii = [5, 10, 20];
    const radiusMiles = validRadii.includes(radius) ? radius : 10;

    console.log(`[MarketView] Geocoding: ${address}`);
    let geocoded;
    try {
      geocoded = await geocodeAddress(address);
    } catch (err) {
      return NextResponse.json(
        { error: `Could not geocode address: ${(err as Error).message}` },
        { status: 400 }
      );
    }

    const { lat, lng } = geocoded;
    console.log(`[MarketView] Location: ${lat}, ${lng}`);
    console.log(`[MarketView] Searching competitors within ${radiusMiles} miles...`);

    const [googleResults, yelpResults] = await Promise.all([
      searchNearbyCompetitors({ lat, lng, radiusMiles, category }).catch((err) => {
        console.error("Google Places search failed:", err);
        return [];
      }),
      searchYelpCompetitors({ lat, lng, radiusMiles, category }).catch((err) => {
        console.error("Yelp search failed:", err);
        return [];
      }),
    ]);

    console.log(`[MarketView] Found ${googleResults.length} Google + ${yelpResults.length} Yelp results`);

    const merged = mergeCompetitorSources(googleResults, yelpResults);
    console.log(`[MarketView] ${merged.length} unique competitors after merge`);
    console.log(`[MarketView] Classifying competitors...`);

    const classified = await classifyCompetitors(merged, category);

    let populationEstimate: number;
    try {
      const censusData = await getCensusData(
        geocoded.state,
        geocoded.county,
        geocoded.zipCode
      );
      populationEstimate = censusData.totalPopulation > 0
        ? censusData.totalPopulation
        : estimatePopulationForRadius(radiusMiles);
    } catch {
      populationEstimate = estimatePopulationForRadius(radiusMiles);
    }

    const metrics = computeMetrics(classified, radiusMiles, populationEstimate);

    console.log(`[MarketView] Generating strategic assessment...`);
    const aiInsight = await generateStrategicAssessment(
      metrics,
      category,
      geocoded.formattedAddress,
      radiusMiles
    );

    const dataSources: string[] = [];
    if (googleResults.length > 0) dataSources.push("Google Places");
    if (yelpResults.length > 0) dataSources.push("Yelp Fusion");
    dataSources.push("AI Classification");
    if (populationEstimate > 0) dataSources.push("Census / Population Estimate");

    const result: AnalysisResult = {
      competitors: classified.sort((a, b) => a.distance - b.distance),
      metrics,
      aiInsight,
      metadata: {
        address: geocoded.formattedAddress,
        category,
        radius: radiusMiles,
        lat,
        lng,
        analyzedAt: new Date().toISOString(),
        dataSources,
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[MarketView] Unexpected error:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
