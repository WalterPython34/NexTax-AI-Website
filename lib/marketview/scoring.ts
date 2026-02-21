import { Competitor, SaturationMetrics } from "@/types/marketview";
import { estimatePopulationForRadius } from "./census";

// ===========================================
// Saturation Scoring Engine
// ===========================================
// Computes the composite saturation score and all derived metrics.

export function computeMetrics(
  competitors: Competitor[],
  radiusMiles: number,
  populationEstimate?: number
): SaturationMetrics {
  const total = competitors.length;

  if (total === 0) {
    return emptyMetrics(radiusMiles, populationEstimate);
  }

  // ─── Population ───
  const population = populationEstimate || estimatePopulationForRadius(radiusMiles);

  // ─── Classification counts ───
  const direct = competitors.filter((c) => c.classification === "Direct Competitor").length;
  const indirect = competitors.filter((c) => c.classification === "Indirect Competitor").length;
  const franchise = competitors.filter((c) => c.classification === "Franchise Sibling").length;
  const adjacent = competitors.filter((c) => c.classification === "Adjacent Service").length;

  // ─── Tier counts ───
  const premium = competitors.filter((c) => c.tier === "Premium").length;
  const midMarket = competitors.filter((c) => c.tier === "Mid-Market").length;
  const value = competitors.filter((c) => c.tier === "Value").length;
  const budget = competitors.filter((c) => c.tier === "Budget").length;

  // ─── Rating metrics ───
  const ratings = competitors.map((c) => c.rating).filter((r) => r > 0);
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100
    : 0;
  const medianRating = ratings.length > 0
    ? ratings.sort((a, b) => a - b)[Math.floor(ratings.length / 2)]
    : 0;

  // ─── Review metrics ───
  const avgReviews = Math.round(
    competitors.reduce((s, c) => s + c.reviewCount, 0) / total
  );

  // ─── Density ───
  const densityPer10k = Math.round(((total / population) * 10000) * 100) / 100;
  const popPerCompetitor = Math.round(population / total);

  // ─── Revenue estimates ───
  const revenues = competitors
    .map((c) => c.estimatedRevenue?.mid || 0)
    .filter((r) => r > 0);
  const totalEstRevenue = revenues.reduce((a, b) => a + b, 0);
  const avgEstRevenue = revenues.length > 0
    ? Math.round(totalEstRevenue / revenues.length)
    : 0;

  // ─── Rating distribution ───
  const ratingDistribution = {
    excellent: competitors.filter((c) => c.rating >= 4.5).length,
    good: competitors.filter((c) => c.rating >= 4.0 && c.rating < 4.5).length,
    average: competitors.filter((c) => c.rating >= 3.5 && c.rating < 4.0).length,
    belowAverage: competitors.filter((c) => c.rating >= 3.0 && c.rating < 3.5).length,
    poor: competitors.filter((c) => c.rating > 0 && c.rating < 3.0).length,
  };

  // ─── SATURATION SCORE ───
  // Composite of 5 weighted factors (0-100 scale)
  const saturationScore = computeSaturationScore({
    densityPer10k,
    avgRating,
    avgReviews,
    directRatio: total > 0 ? direct / total : 0,
    franchiseRatio: total > 0 ? franchise / total : 0,
    total,
    radiusMiles,
  });

  // ─── Risk band ───
  const { riskBand, riskColor } = getRiskBand(saturationScore);

  return {
    totalCompetitors: total,
    directCompetitors: direct,
    indirectCompetitors: indirect,
    franchiseSiblings: franchise,
    adjacentServices: adjacent,
    avgRating,
    avgReviews,
    medianRating,
    densityPer10k,
    populationEstimate: population,
    popPerCompetitor,
    saturationScore,
    riskBand,
    riskColor,
    avgEstRevenue,
    totalEstRevenue,
    tierBreakdown: { premium, midMarket, value, budget },
    typeBreakdown: { direct, indirect, franchise, adjacent },
    ratingDistribution,
  };
}

// ─── Saturation Score Calculation ───

interface ScoreInputs {
  densityPer10k: number;
  avgRating: number;
  avgReviews: number;
  directRatio: number;
  franchiseRatio: number;
  total: number;
  radiusMiles: number;
}

function computeSaturationScore(inputs: ScoreInputs): number {
  const {
    densityPer10k,
    avgRating,
    avgReviews,
    directRatio,
    franchiseRatio,
    total,
    radiusMiles,
  } = inputs;

  // Factor 1: Density pressure (0-30 pts)
  // Higher density = higher saturation
  // Benchmark: ~2 per 10K is moderate, 4+ is high
  const densityScore = Math.min(densityPer10k / 5, 1) * 30;

  // Factor 2: Quality barrier (0-20 pts)
  // Higher avg ratings = harder for new entrant
  const qualityScore = (avgRating / 5) * 20;

  // Factor 3: Review intensity (0-20 pts)
  // More reviews = more established competitors = harder market
  const reviewScore = Math.min(avgReviews / 250, 1) * 20;

  // Factor 4: Direct competition concentration (0-15 pts)
  // More direct competitors = more crowded
  const directScore = directRatio * 15;

  // Factor 5: Franchise penetration (0-15 pts)
  // More franchises = more organized, well-funded competition
  const franchiseScore = franchiseRatio * 15;

  const raw = densityScore + qualityScore + reviewScore + directScore + franchiseScore;

  // Normalize to 0-100 and apply radius adjustment
  // Larger radius naturally captures more competitors, so we adjust slightly
  const radiusAdjustment = radiusMiles <= 5 ? 1.1 : radiusMiles <= 10 ? 1.0 : 0.9;

  return Math.min(Math.round(raw * radiusAdjustment), 100);
}

// ─── Risk Band Mapping ───

function getRiskBand(score: number): {
  riskBand: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  riskColor: string;
} {
  if (score < 30) return { riskBand: "LOW", riskColor: "#22c55e" };
  if (score < 50) return { riskBand: "MODERATE", riskColor: "#eab308" };
  if (score < 70) return { riskBand: "HIGH", riskColor: "#f97316" };
  return { riskBand: "CRITICAL", riskColor: "#ef4444" };
}

// ─── Empty metrics for zero-result scenarios ───

function emptyMetrics(
  radiusMiles: number,
  populationEstimate?: number
): SaturationMetrics {
  const pop = populationEstimate || estimatePopulationForRadius(radiusMiles);
  return {
    totalCompetitors: 0,
    directCompetitors: 0,
    indirectCompetitors: 0,
    franchiseSiblings: 0,
    adjacentServices: 0,
    avgRating: 0,
    avgReviews: 0,
    medianRating: 0,
    densityPer10k: 0,
    populationEstimate: pop,
    popPerCompetitor: 0,
    saturationScore: 0,
    riskBand: "LOW",
    riskColor: "#22c55e",
    avgEstRevenue: 0,
    totalEstRevenue: 0,
    tierBreakdown: { premium: 0, midMarket: 0, value: 0, budget: 0 },
    typeBreakdown: { direct: 0, indirect: 0, franchise: 0, adjacent: 0 },
    ratingDistribution: { excellent: 0, good: 0, average: 0, belowAverage: 0, poor: 0 },
  };
}
