// lib/contentEngine/factSheet.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// §2.3 fact sheet — provenance + deterministic-derivation unit tests.
// Run with: npx tsx lib/contentEngine/factSheet.test.ts
// ─────────────────────────────────────────────────────────────────────────────

import {
  AUTHORITY_THRESHOLDS,
  deriveDscrAtHaircut,
  deriveSdeGap,
  deriveImpliedMultiple,
  buildFactSheet,
} from "./factSheet";
import { anonymizeSingleDeal, anonymizeComposite } from "./anonymize";
import type { SanitizedDealFacts } from "./types";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

function mkDeal(over: Partial<SanitizedDealFacts> = {}): SanitizedDealFacts {
  return {
    deal_run_id: "aaaaaaaa-0000-0000-0000-000000000001",
    industry: "hvac", state: "OH",
    revenue: 1_234_567, sde: 400_000, reported_sde: 400_000, usable_sde: 320_000,
    asking_price: 1_200_000, fair_value: 1_050_000, monthly_payment: 15_000,
    dscr: 1.4444, valuation_multiple: 3.75, employees: 12, years_in_business: 15,
    confidence_score: "high", normalization_trust_score: 72,
    ...over,
  };
}

console.log("deriveDscrAtHaircut — the LLM never does this math");
{
  // usable 320k, payment 15k/mo → ADS 180k. 20% haircut: 256k/180k = 1.4222 → 1.42
  const d = deriveDscrAtHaircut(320_000, 15_000, 20)!;
  check("value correct (1.42)", d.value === 1.42, String(d?.value));
  check("display formatted", d.display === "1.42x");
  check("formula recorded", d.formula.includes("usable_sde") && d.formula.includes("monthly_payment"));
  check("inputs recorded", d.inputs.usable_sde === 320_000 && d.inputs.haircut_pct === 20);
  check("qualifier names the scenario", /20% lower/.test(d.qualifier ?? ""));

  // 0% haircut = base DSCR from raw fields: 320k/180k = 1.7778 → 1.78
  check("0% haircut works", deriveDscrAtHaircut(320_000, 15_000, 0)!.value === 1.78);

  check("null sde → null", deriveDscrAtHaircut(null, 15_000, 20) === null);
  check("zero payment → null", deriveDscrAtHaircut(320_000, 0, 20) === null);
  check("haircut 100 → null", deriveDscrAtHaircut(320_000, 15_000, 100) === null);
  check("negative haircut → null", deriveDscrAtHaircut(320_000, 15_000, -10) === null);
}

console.log("deriveSdeGap");
{
  const d = deriveSdeGap(400_000, 320_000)!;
  check("gap rounded to 2sf ($80K)", d.value === 80_000 && d.display === "$80K");
  check("no gap when usable >= reported", deriveSdeGap(400_000, 400_000) === null);
  check("null inputs → null", deriveSdeGap(null, 320_000) === null);
}

console.log("deriveImpliedMultiple");
{
  const d = deriveImpliedMultiple(1_200_000, 320_000, "usable_sde")!;
  check("1.2M / 320K → 3.8x (1dp)", d.value === 3.8, String(d?.value));
  check("basis named in key", d.key === "implied_multiple_on_usable_sde");
  check("null price → null", deriveImpliedMultiple(null, 320_000, "usable_sde") === null);
}

console.log("buildFactSheet — every entry has provenance");
{
  const facts = anonymizeSingleDeal(mkDeal());
  const sheet = buildFactSheet({
    mode: "single_deal",
    dealRunIds: ["aaaaaaaa-0000-0000-0000-000000000001"],
    anonymizedFacts: facts,
    derivations: [
      deriveDscrAtHaircut(320_000, 15_000, 20)!,
      deriveSdeGap(400_000, 320_000)!,
    ],
  });

  check("entries exist", sheet.entries.length > 0);
  check("every entry has provenance", sheet.entries.every((e) => e.provenance && typeof e.provenance === "object"));
  check(
    "deal facts carry deal_field provenance w/ deal_run_id",
    sheet.entries
      .filter((e) => e.key === "revenue")
      .every((e) => e.provenance.kind === "deal_field" && (e.provenance as any).deal_run_id.length > 0),
  );
  check(
    "derived entries carry formula + inputs",
    sheet.entries
      .filter((e) => e.provenance.kind === "derived")
      .every((e) => (e.provenance as any).formula.length > 0 && Object.keys((e.provenance as any).inputs).length > 0),
  );
  check(
    "authority thresholds present as corpus constants",
    AUTHORITY_THRESHOLDS.every((t) =>
      sheet.entries.some((e) => e.provenance.kind === "corpus_constant" && (e.provenance as any).label === t.label),
    ),
  );
  check(
    "no geography entry in sheet",
    !sheet.entries.some((e) => /state|city|zip/.test(e.key)),
  );
  check(
    "dscr entry keeps standard-terms qualifier",
    /standard SBA terms/.test(sheet.entries.find((e) => e.key === "dscr")?.qualifier ?? ""),
  );
}

console.log("buildFactSheet — composite provenance");
{
  const pool = Array.from({ length: 5 }, (_, i) => mkDeal({ deal_run_id: `pool-${i}` }));
  const facts = anonymizeComposite(pool)!;
  const sheet = buildFactSheet({
    mode: "composite",
    dealRunIds: pool.map((d) => d.deal_run_id),
    anonymizedFacts: facts,
  });
  const medians = sheet.entries.filter((e) => e.key.startsWith("median_"));
  check("median entries exist", medians.length > 0);
  check(
    "median entries carry composite_aggregate provenance over all source deals",
    medians.every(
      (e) => e.provenance.kind === "composite_aggregate" && (e.provenance as any).deal_run_ids.length === 5,
    ),
  );
  check(
    "count entry is composite_aggregate",
    sheet.entries.find((e) => e.key === "deal_count")?.provenance.kind === "composite_aggregate",
  );
  check(
    "pattern qualifier survives into the sheet",
    /pattern, not a specific business/.test(sheet.entries.find((e) => e.key === "deal_count")?.qualifier ?? ""),
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll fact-sheet checks passed.");
