// lib/contentEngine/anonymize.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// §2.2 anonymization — suppression-first unit tests.
// Doctrine under test: k-anonymity FORBIDS only; suppression + composite are
// the protection; geography never appears in any output; fail closed.
// Run with: npx tsx lib/contentEngine/anonymize.test.ts
// ─────────────────────────────────────────────────────────────────────────────

import {
  sanitizeDealFacts,
  round2sf,
  roundDscr,
  bandEmployees,
  bandYears,
  displayMoney,
  median,
  computeKScreen,
  decideDraftMode,
  anonymizeSingleDeal,
  anonymizeComposite,
  buildAnonymizationDecision,
  MIN_K_SINGLE,
  MIN_INDUSTRY_POOL,
  MIN_COMPOSITE_POOL,
} from "./anonymize";
import type { SanitizedDealFacts } from "./types";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

function mkDeal(over: Partial<SanitizedDealFacts> = {}): SanitizedDealFacts {
  return {
    deal_run_id: "aaaaaaaa-0000-0000-0000-000000000001",
    industry: "hvac",
    state: "OH",
    revenue: 1_234_567,
    sde: 400_000,
    reported_sde: 400_000,
    usable_sde: 320_000,
    asking_price: 1_200_000,
    fair_value: 1_050_000,
    monthly_payment: 15_000,
    dscr: 1.4444,
    valuation_multiple: 3.75,
    employees: 12,
    years_in_business: 15,
    confidence_score: "high",
    normalization_trust_score: 72,
    ...over,
  };
}

/** A healthy pool: n same-industry deals clustered near the subject deal. */
function mkPool(n: number, industry = "hvac", revBase = 1_200_000): SanitizedDealFacts[] {
  return Array.from({ length: n }, (_, i) =>
    mkDeal({
      deal_run_id: `pool-${industry}-${i}`,
      industry,
      // Small jitter that survives 2sf rounding for most rows.
      revenue: revBase + (i % 3) * 10_000,
      sde: 380_000 + (i % 5) * 5_000,
      asking_price: 1_150_000 + (i % 4) * 20_000,
    }),
  );
}

console.log("sanitizeDealFacts — identifiers are structurally absent");
{
  const s = sanitizeDealFacts({
    id: "x", industry: "hvac", state: "OH", revenue: 1000000,
    city: "Columbus", zip_code: "43004", source_url: "https://bizbuysell.com/l/123",
    source_listing_id: "123", raw_data: { listing: "text" }, import_batch_id: "batch_x",
    created_at: "2026-06-01T00:00:00Z", business_name: "Acme HVAC",
  });
  const keys = Object.keys(s);
  for (const banned of ["city", "zip_code", "source_url", "source_listing_id", "raw_data", "import_batch_id", "created_at", "business_name"]) {
    check(`'${banned}' not representable`, !keys.includes(banned));
  }
  check("state retained for screening only", s.state === "OH");
  check("stringly-typed numerics become null", sanitizeDealFacts({ id: "x", revenue: "1000000" }).revenue === null);
}

console.log("round2sf");
{
  check("1,234,567 → 1,200,000", round2sf(1_234_567) === 1_200_000);
  check("987,654 → 990,000", round2sf(987_654) === 990_000);
  check("75,000 → 75,000", round2sf(75_000) === 75_000);
  check("449 → 450", round2sf(449) === 450);
  check("0 → null", round2sf(0) === null);
  check("negative → null", round2sf(-5) === null);
  check("null → null", round2sf(null) === null);
}

console.log("banding / display");
{
  check("dscr 1.4444 → 1.44", roundDscr(1.4444) === 1.44);
  check("12 employees → 11-25 band", bandEmployees(12) === "11-25 employees");
  check("15 years → 10-20 band", bandYears(15) === "10-20 years old");
  check("$1.2M display", displayMoney(1_200_000) === "$1.2M");
  check("$750K display", displayMoney(750_000) === "$750K");
  check("$80K display", displayMoney(80_000) === "$80K");
  check("median odd", median([3, 1, 2]) === 2);
  check("median even", median([1, 2, 3, 4]) === 2.5);
  check("median empty → null", median([]) === null);
}

console.log("computeKScreen — fail closed on missing inputs");
{
  const pool = mkPool(10);
  const noIndustry = computeKScreen(mkDeal({ industry: null }), pool);
  check("no industry → all screens null", noIndustry.national_k === null && noIndustry.is_outlier === null);

  const noRevenue = computeKScreen(mkDeal({ revenue: null }), pool);
  check("no revenue → all screens null", noRevenue.national_k === null);

  const thin = computeKScreen(mkDeal(), mkPool(MIN_INDUSTRY_POOL - 1));
  check("thin industry pool → outlier screen null (not computable)", thin.is_outlier === null);
}

console.log("decideDraftMode — k forbids, never permits; fail closed");
{
  // Healthy pool, unremarkable deal → single-deal permitted.
  const healthy = decideDraftMode(mkDeal({ revenue: 1_200_000 }), mkPool(12));
  check("healthy pool + typical deal → single_deal", healthy.decision === "single_deal",
    healthy.reasons.join("; "));

  // Empty pool → suppress (not composite — nothing to aggregate).
  const empty = decideDraftMode(mkDeal(), []);
  check("empty pool → suppress", empty.decision === "suppress");

  // Missing industry → unscreenable → fail closed.
  const unscreenable = decideDraftMode(mkDeal({ industry: null }), mkPool(12));
  check("unscreenable deal → not single_deal", unscreenable.decision !== "single_deal");

  // Unique revenue band (k < MIN_K_SINGLE) → forbidden single, composite fallback.
  const unique = decideDraftMode(mkDeal({ revenue: 8_800_000 }), mkPool(12));
  check(`unique revenue (k < ${MIN_K_SINGLE}) → composite`, unique.decision === "composite",
    unique.reasons.join("; "));

  // Outlier (way above pool p95) → never single-deal.
  const outlier = decideDraftMode(
    mkDeal({ revenue: 1_200_000, sde: 4_000_000, asking_price: 12_000_000 }),
    mkPool(12),
  );
  check("outlier deal → not single_deal", outlier.decision !== "single_deal");

  // Thin industry pool with composite possible → composite.
  const thinPool = decideDraftMode(mkDeal(), mkPool(MIN_COMPOSITE_POOL, "hvac"));
  check("thin industry pool (>=3) → composite", thinPool.decision === "composite");

  // Thin industry pool below composite minimum → suppress entirely.
  const tiny = decideDraftMode(mkDeal(), mkPool(MIN_COMPOSITE_POOL - 1, "hvac"));
  check("industry pool < 3 → suppress", tiny.decision === "suppress");

  // Decision is auditable.
  check("reasons recorded", healthy.reasons.length > 0 && unique.reasons.length > 0);
}

console.log("anonymizeSingleDeal — suppression is unconditional");
{
  const facts = anonymizeSingleDeal(mkDeal());
  const keys = facts.map((f) => f.key);
  const displays = facts.map((f) => String(f.display)).join(" | ");

  check("no state fact in any mode", !keys.includes("state"));
  check("no city fact", !keys.includes("city"));
  check("state abbreviation absent from displays", !/\bOH\b/.test(displays));
  check("revenue rounded to 2sf", facts.find((f) => f.key === "revenue")?.value === 1_200_000);
  check("dscr display carries standard-terms qualifier",
    /standard SBA terms/.test(facts.find((f) => f.key === "dscr")?.qualifier ?? ""));
  check("age XOR headcount — years preferred", keys.includes("years_in_business") && !keys.includes("employees"));

  const noYears = anonymizeSingleDeal(mkDeal({ years_in_business: null }));
  check("employees band only when years absent",
    noYears.some((f) => f.key === "employees") && !noYears.some((f) => f.key === "years_in_business"));

  const sparse = anonymizeSingleDeal(mkDeal({
    revenue: null, reported_sde: null, usable_sde: null, sde: null, asking_price: null,
    fair_value: null, monthly_payment: null, dscr: null, valuation_multiple: null,
    employees: null, years_in_business: null,
  }));
  check("sparse deal → only industry fact, nothing invented",
    sparse.length === 1 && sparse[0].key === "industry");
}

console.log("anonymizeComposite — pattern framing, minimum pool, no geography");
{
  check("pool of 2 → null (fail closed)", anonymizeComposite(mkPool(2)) === null);

  const facts = anonymizeComposite(mkPool(6))!;
  check("pool of 6 → facts emitted", Array.isArray(facts) && facts.length > 0);
  const keys = facts.map((f) => f.key);
  check("deal_count present", keys.includes("deal_count"));
  check("uniform industry surfaces", keys.includes("industry"));
  check("median revenue present and rounded", typeof facts.find((f) => f.key === "median_revenue")?.value === "number");
  check("no geography key", !keys.some((k) => /state|city|zip|region/.test(k)));
  const aggregates = facts.filter((f) => f.transform.startsWith("median_") || f.transform === "count");
  check("every aggregate carries the pattern qualifier",
    aggregates.every((f) => /pattern, not a specific business/.test(f.qualifier ?? "")));

  const mixed = anonymizeComposite([...mkPool(3, "hvac"), ...mkPool(3, "dental")])!;
  check("mixed industries → no industry fact", !mixed.some((f) => f.key === "industry"));
}

console.log("buildAnonymizationDecision — audit payload");
{
  const mode = decideDraftMode(mkDeal(), mkPool(12));
  const d = buildAnonymizationDecision(mode, 1);
  check("suppressed list always includes geography", d.suppressed.some((s) => s.includes("geography")));
  check("screen + reasons persisted", d.screen !== undefined && d.reasons.length > 0);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll anonymization checks passed.");
