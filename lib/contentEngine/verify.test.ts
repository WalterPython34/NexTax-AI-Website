// lib/contentEngine/verify.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// §2.3 no-fabrication verification — unit tests.
// Run with: npx tsx lib/contentEngine/verify.test.ts
// ─────────────────────────────────────────────────────────────────────────────

import { verifyDraft, extractNumericTokens, buildAllowedNumbers } from "./verify";
import { buildFactSheet, deriveDscrAtHaircut, deriveSdeGap } from "./factSheet";
import { anonymizeSingleDeal, anonymizeComposite } from "./anonymize";
import type { FactSheet, SanitizedDealFacts } from "./types";

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

function singleDealSheet(): FactSheet {
  return buildFactSheet({
    mode: "single_deal",
    dealRunIds: ["aaaaaaaa-0000-0000-0000-000000000001"],
    anonymizedFacts: anonymizeSingleDeal(mkDeal()),
    derivations: [
      deriveDscrAtHaircut(320_000, 15_000, 20)!, // 1.42x
      deriveSdeGap(400_000, 320_000)!,           // $80K
    ],
  });
}

console.log("extractNumericTokens");
{
  const t = extractNumericTokens("The ask is $1.2M against $320K of SDE, a 3.8x multiple at 1.44x coverage and a 10.5% rate.");
  const norms = t.map((x) => x.normalized);
  check("$1.2M → 1200000", norms.includes(1_200_000));
  check("$320K → 320000", norms.includes(320_000));
  check("3.8x → 3.8", norms.includes(3.8));
  check("1.44x → 1.44", norms.includes(1.44));
  check("10.5% → 10.5", norms.includes(10.5));

  const ordinals = extractNumericTokens("1. First point\n## 2. Header\n**3.** Bold\nBut a mid-line 7 counts.");
  check("line-leading ordinals exempt, mid-line numbers extracted",
    ordinals.length === 1 && ordinals[0].normalized === 7,
    JSON.stringify(ordinals));

  check("comma thousands parsed", extractNumericTokens("$1,200,000 exactly")[0].normalized === 1_200_000);

  // Regression (found in Stage 2 fixture run): a suffix letter must be
  // attached to the number, not the first letter of the next word.
  const words = extractNumericTokens("above the 1.25 most lenders target, in 10 minutes, a 1.5 multiple");
  check("'1.25 most' is 1.25, not 1.25M",
    words.some((t) => t.normalized === 1.25) && !words.some((t) => t.normalized === 1_250_000),
    JSON.stringify(words));
  check("'10 minutes' is 10, not 10M", words.some((t) => t.normalized === 10) && !words.some((t) => t.normalized === 10_000_000));
  check("attached suffix still scales", extractNumericTokens("$1.2M ask")[0].normalized === 1_200_000);
  check("attached x still stripped", extractNumericTokens("1.44x coverage")[0].normalized === 1.44);
}

console.log("verifyDraft — clean draft passes");
{
  const sheet = singleDealSheet();
  const body = [
    "Many first-time buyers think the number in the CIM is the number.",
    "",
    "1. The deal on paper",
    "An hvac business asking $1.2M with a stated SDE of $400K. Looks like a 3.8x on normalized earnings.",
    "",
    "2. What survived pressure-testing",
    "Normalization left $320K of usable SDE. That is an $80K haircut to the earnings the multiple sits on.",
    "",
    "3. The coverage math",
    "At the recorded debt service, coverage runs 1.44x at standard SBA terms (80% financed / 10.5% / 10yr). If SDE comes in 20% lower, coverage falls to 1.42x. The SBA floor is 1.15 and most lenders want 1.25.",
    "",
    "Bottom line: pressure-test the add-backs before you price the deal.",
    "",
    "What's the most questionable add-back you've seen? Drop your situation below and I'll respond.",
  ].join("\n");

  const r = verifyDraft({ title: "What your broker probably didn't tell you about add-backs", body, sheet, mode: "single_deal" });
  check("clean draft passes", r.passed, r.unmatched.join(", "));
  check("every extracted token matched", r.extracted.every((t) => t.matched));
  check("dscr label check ran and passed",
    r.label_checks.some((c) => c.check === "dscr_standard_terms_label" && c.passed));
}

console.log("verifyDraft — fabrication fails");
{
  const sheet = singleDealSheet();
  const fabricated = "The business does $1.2M in revenue and you will save $55K in taxes from the allocation.";
  const r = verifyDraft({ title: "T", body: fabricated, sheet, mode: "single_deal" });
  check("fabricated $55K fails the draft", !r.passed);
  check("unmatched token identified", r.unmatched.some((u) => u.includes("55")));

  const incidental = "I have seen buyers spend 25 hours a quarter on this.";
  const r2 = verifyDraft({ title: "T", body: incidental, sheet, mode: "single_deal" });
  check("incidental numeral (25 hours) fails strict check", !r2.passed);

  const subtle = "Coverage of 1.46x at standard SBA terms is fine."; // sheet has 1.44
  const r3 = verifyDraft({ title: "T", body: subtle, sheet, mode: "single_deal" });
  check("off-by-a-little DSCR (1.46 vs 1.44) fails", !r3.passed);
}

console.log("verifyDraft — DSCR label enforcement");
{
  const sheet = singleDealSheet();
  const noLabel = "Coverage runs 1.44x on this deal, which clears the 1.25 lender target.";
  const r = verifyDraft({ title: "T", body: noLabel, sheet, mode: "single_deal" });
  check("DSCR figure without standard-terms label fails", !r.passed);
  check("label check identifies the problem",
    r.label_checks.some((c) => c.check === "dscr_standard_terms_label" && !c.passed));

  const noDscr = "The ask is $1.2M against $400K of stated SDE.";
  const r2 = verifyDraft({ title: "T", body: noDscr, sheet, mode: "single_deal" });
  check("draft with no DSCR figure needs no label", r2.passed, r2.unmatched.join(", "));
}

console.log("verifyDraft — composite label enforcement");
{
  const pool = Array.from({ length: 5 }, (_, i) => mkDeal({ deal_run_id: `pool-${i}` }));
  const sheet = buildFactSheet({
    mode: "composite",
    dealRunIds: pool.map((d) => d.deal_run_id),
    anonymizedFacts: anonymizeComposite(pool)!,
  });

  const labeled = "Across the deals I've scored in hvac, the median ask runs $1.2M against $320K of median usable SDE across 5 deals.";
  const r = verifyDraft({ title: "T", body: labeled, sheet, mode: "composite" });
  check("labeled composite passes", r.passed, r.unmatched.join(", ") + " | " + JSON.stringify(r.label_checks));

  const unlabeled = "The median ask runs $1.2M against $320K of median usable SDE.";
  const r2 = verifyDraft({ title: "T", body: unlabeled, sheet, mode: "composite" });
  check("composite without pattern framing fails", !r2.passed);
  check("composite label check identifies the problem",
    r2.label_checks.some((c) => c.check === "composite_pattern_label" && !c.passed));
}

console.log("buildAllowedNumbers — scalings and qualifier numbers");
{
  const sheet = singleDealSheet();
  const allowed = buildAllowedNumbers(sheet).map((a) => a.value);
  check("value present (1200000)", allowed.some((v) => v === 1_200_000));
  check("K-scaling present (1200)", allowed.some((v) => v === 1_200));
  check("M-scaling present (1.2)", allowed.some((v) => v === 1.2));
  check("qualifier number present (20 from haircut qualifier)", allowed.some((v) => v === 20));
}

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll verification checks passed.");
