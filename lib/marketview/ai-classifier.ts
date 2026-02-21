import { Competitor, CompetitorClassification, CompetitorTier, SaturationMetrics } from "@/types/marketview";
import { CATEGORY_MAPPINGS } from "@/lib/marketview/categories";

// ===========================================
// AI Classification & Scoring Engine
// ===========================================
// Uses Claude for intelligent competitor classification
// and strategic assessment generation.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

// ─── Classify competitors using Claude ───

export async function classifyCompetitors(
  competitors: Competitor[],
  targetCategory: string,
  targetBusinessName?: string
): Promise<Competitor[]> {
  if (!ANTHROPIC_API_KEY || competitors.length === 0) {
    // Fall back to rule-based classification
    return competitors.map((c) => ({
      ...c,
      classification: ruleBasedClassification(c, targetCategory),
      tier: ruleBasedTier(c),
      estimatedRevenue: estimateRevenue(c, targetCategory),
    }));
  }

  // Batch competitors for AI classification (max 30 at a time)
  const batches = [];
  for (let i = 0; i < competitors.length; i += 30) {
    batches.push(competitors.slice(i, i + 30));
  }

  const classified: Competitor[] = [];

  for (const batch of batches) {
    try {
      const result = await classifyBatch(batch, targetCategory, targetBusinessName);
      classified.push(...result);
    } catch (err) {
      console.error("AI classification failed for batch, using rule-based:", err);
      classified.push(
        ...batch.map((c) => ({
          ...c,
          classification: ruleBasedClassification(c, targetCategory),
          tier: ruleBasedTier(c),
          estimatedRevenue: estimateRevenue(c, targetCategory),
        }))
      );
    }
  }

  return classified;
}

async function classifyBatch(
  competitors: Competitor[],
  category: string,
  targetBusinessName?: string
): Promise<Competitor[]> {
  const competitorList = competitors
    .map(
      (c, i) =>
        `${i}|${c.name}|${c.rating}|${c.reviewCount}|${c.categories.join(",")}|${c.isFranchise}`
    )
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Classify each business relative to a "${category}" business${targetBusinessName ? ` called "${targetBusinessName}"` : ""}.

For each business, output a line with: index|classification|tier

Classification must be one of:
- "Direct Competitor" (same service/product, same target customer)
- "Indirect Competitor" (overlapping service but different primary focus)
- "Franchise Sibling" (same franchise system or very similar franchise concept)
- "Adjacent Service" (related industry but different service)

Tier must be one of:
- "Premium" (high ratings 4.5+, many reviews, upscale positioning)
- "Mid-Market" (good ratings 4.0-4.4, moderate reviews)
- "Value" (average ratings 3.5-3.9, any review count)
- "Budget" (below 3.5 ratings or very few reviews)

BUSINESSES:
index|name|rating|reviews|categories|isFranchise
${competitorList}

Output ONLY the classification lines, one per business. No explanations.`,
        },
      ],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || "";

  // Parse AI response
  const lines = text.trim().split("\n");
  const classifications = new Map<number, { classification: CompetitorClassification; tier: CompetitorTier }>();

  for (const line of lines) {
    const parts = line.split("|").map((s: string) => s.trim());
    if (parts.length >= 3) {
      const idx = parseInt(parts[0]);
      const classification = parts[1] as CompetitorClassification;
      const tier = parts[2] as CompetitorTier;

      if (!isNaN(idx) && isValidClassification(classification) && isValidTier(tier)) {
        classifications.set(idx, { classification, tier });
      }
    }
  }

  return competitors.map((c, i) => {
    const aiResult = classifications.get(i);
    return {
      ...c,
      classification: aiResult?.classification || ruleBasedClassification(c, category),
      tier: aiResult?.tier || ruleBasedTier(c),
      estimatedRevenue: estimateRevenue(c, category),
    };
  });
}

// ─── Generate Strategic AI Assessment ───

export async function generateStrategicAssessment(
  metrics: SaturationMetrics,
  category: string,
  address: string,
  radius: number
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return generateRuleBasedAssessment(metrics, category);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `You are a business acquisition analyst writing a brief competitive landscape memo. Be direct, data-driven, and specific. Use the tone of an investment committee summary.

Market data for a ${category} business near "${address}" within ${radius} miles:
- Total competitors: ${metrics.totalCompetitors}
- Direct competitors: ${metrics.directCompetitors}
- Indirect competitors: ${metrics.indirectCompetitors}
- Franchise siblings: ${metrics.franchiseSiblings}
- Density per 10K pop: ${metrics.densityPer10k}
- Population per competitor: ${metrics.popPerCompetitor}
- Est. population in radius: ${metrics.populationEstimate.toLocaleString()}
- Average rating: ${metrics.avgRating}
- Average review count: ${metrics.avgReviews}
- Saturation score: ${metrics.saturationScore}/100 (${metrics.riskBand})
- Tier breakdown: Premium(${metrics.tierBreakdown.premium}), Mid-Market(${metrics.tierBreakdown.midMarket}), Value(${metrics.tierBreakdown.value}), Budget(${metrics.tierBreakdown.budget})
- Average est. revenue per competitor: $${metrics.avgEstRevenue.toLocaleString()}
- Total market revenue estimate: $${metrics.totalEstRevenue.toLocaleString()}
- Rating distribution: 4.5-5.0(${metrics.ratingDistribution.excellent}), 4.0-4.4(${metrics.ratingDistribution.good}), 3.5-3.9(${metrics.ratingDistribution.average}), 3.0-3.4(${metrics.ratingDistribution.belowAverage}), <3.0(${metrics.ratingDistribution.poor})

Write a 4-5 sentence strategic assessment for a potential buyer. Include:
1. Whether the market is over/under-served relative to population
2. Where opportunity gaps exist (tier gaps, quality gaps, underserved segments)
3. The competitive threat level and what a new entrant or acquirer should watch for
4. A specific acquisition angle or positioning recommendation

Write in memo tone. No bullet points. No hedging language.`,
          },
        ],
      }),
    });

    const data = await response.json();
    return data.content?.[0]?.text || generateRuleBasedAssessment(metrics, category);
  } catch (err) {
    console.error("AI assessment generation failed:", err);
    return generateRuleBasedAssessment(metrics, category);
  }
}

// ─── Rule-based fallbacks ───

function ruleBasedClassification(
  competitor: Competitor,
  category: string
): CompetitorClassification {
  const mapping = CATEGORY_MAPPINGS[category];
  if (!mapping) return "Direct Competitor";

  if (competitor.isFranchise) return "Franchise Sibling";

  // Check if categories overlap significantly
  const categoryOverlap = competitor.categories.some((cat) =>
    mapping.googleTypes.includes(cat) || mapping.yelpCategories.includes(cat)
  );

  if (categoryOverlap) return "Direct Competitor";

  // Check keywords in name
  const nameLower = competitor.name.toLowerCase();
  const keywordMatch = mapping.keywords.some((kw) => nameLower.includes(kw.toLowerCase()));
  if (keywordMatch) return "Direct Competitor";

  return "Indirect Competitor";
}

function ruleBasedTier(competitor: Competitor): CompetitorTier {
  if (competitor.rating >= 4.5 && competitor.reviewCount > 100) return "Premium";
  if (competitor.rating >= 4.0 && competitor.reviewCount > 30) return "Mid-Market";
  if (competitor.rating >= 3.5) return "Value";
  return "Budget";
}

function estimateRevenue(
  competitor: Competitor,
  category: string
): { low: number; mid: number; high: number; confidence: "low" | "medium" | "high"; method: string } {
  const mapping = CATEGORY_MAPPINGS[category];
  const multiplier = mapping?.revenueMultiplier || 1500;

  const tierMod =
    competitor.tier === "Premium" ? 1.4 :
    competitor.tier === "Mid-Market" ? 1.0 :
    competitor.tier === "Value" ? 0.75 : 0.5;

  const baseEstimate = competitor.reviewCount * multiplier * tierMod;
  const confidence = competitor.reviewCount > 50 ? "medium" : "low";

  return {
    low: Math.round(baseEstimate * 0.6),
    mid: Math.round(baseEstimate),
    high: Math.round(baseEstimate * 1.5),
    confidence,
    method: "review_count_multiplier",
  };
}

function generateRuleBasedAssessment(
  metrics: SaturationMetrics,
  category: string
): string {
  const satLevel =
    metrics.saturationScore < 35 ? "underserved" :
    metrics.saturationScore < 55 ? "moderately served" :
    metrics.saturationScore < 75 ? "well-served" : "saturated";

  const tierGap =
    metrics.tierBreakdown.premium < metrics.tierBreakdown.budget
      ? "premium segment is underrepresented"
      : metrics.tierBreakdown.budget < metrics.tierBreakdown.premium
      ? "value/budget segment has room for entry"
      : "market tiers are relatively balanced";

  return `The ${category} market in this ${metrics.populationEstimate.toLocaleString()}-person trade area is ${satLevel} with ${metrics.totalCompetitors} competitors at a density of ${metrics.densityPer10k} per 10K population. The ${tierGap}, suggesting an acquisition target in that range would face less competitive pressure. Average competitor ratings of ${metrics.avgRating} with ${metrics.avgReviews} average reviews indicate ${metrics.avgRating >= 4.2 ? "a quality-conscious market where differentiation must come through service excellence" : "quality gaps that a well-operated acquisition could exploit"}. Total addressable market revenue is estimated at $${(metrics.totalEstRevenue / 1000000).toFixed(1)}M across the ${metrics.totalCompetitors} identified operators.`;
}

// ─── Validation helpers ───

function isValidClassification(s: string): s is CompetitorClassification {
  return ["Direct Competitor", "Indirect Competitor", "Franchise Sibling", "Adjacent Service"].includes(s);
}

function isValidTier(s: string): s is CompetitorTier {
  return ["Premium", "Mid-Market", "Value", "Budget"].includes(s);
}
