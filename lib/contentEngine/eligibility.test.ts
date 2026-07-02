// lib/contentEngine/eligibility.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// §2.1 eligibility predicate — fail-closed unit tests.
// Run with: npx tsx lib/contentEngine/eligibility.test.ts
// Exit code 0 = all pass, 1 = any failure.
// ─────────────────────────────────────────────────────────────────────────────

import {
  evaluateEligibility,
  detectTopicTriggers,
  applyEligibilityFilters,
  ELIGIBILITY_COLUMNS,
  OWNER_USER_ID,
} from "./eligibility";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** A row exactly as bulk-import writes it (the only eligible shape). */
const marketplaceRow = () => ({
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  tool_used: "marketplace_import",
  data_source_type: "marketplace_supply",
  source_platform: "BizBuySell",
  user_id: null,
  pending_email: null,
  is_valid: true,
});

/** A row as record-deal writes it (client deal — must never be eligible). */
const clientRow = () => ({
  id: "bbbbbbbb-0000-0000-0000-000000000002",
  tool_used: "risk_analyzer",
  data_source_type: "user_submitted",
  source_platform: null,
  user_id: "fd51b1c2-d682-4278-8b58-6abad29a2a07",
  pending_email: null,
  is_valid: true,
});

console.log("evaluateEligibility — positive path");
{
  const r = evaluateEligibility(marketplaceRow());
  check("marketplace row (user_id null) is eligible", r.eligible, r.reasons.join("; "));
  check("no failure reasons", r.reasons.length === 0);
  check("all checks recorded", r.checks.length === 6);

  // Verified distribution 2026-07-02: 1,115 marketplace rows are backfilled
  // with the owner's user_id — these are the public pool, eligible.
  const owned = evaluateEligibility({ ...marketplaceRow(), user_id: OWNER_USER_ID });
  check("marketplace row (owner user_id) is eligible", owned.eligible, owned.reasons.join("; "));
}

console.log("evaluateEligibility — every single-field mutation fails");
{
  const mutations: Array<[string, Record<string, unknown>]> = [
    ["tool_used null", { tool_used: null }],
    ["tool_used other tool", { tool_used: "risk_analyzer" }],
    ["tool_used unknown future value", { tool_used: "some_new_importer" }],
    ["data_source_type null", { data_source_type: null }],
    ["data_source_type user_submitted", { data_source_type: "user_submitted" }],
    ["source_platform null", { source_platform: null }],
    ["source_platform empty string", { source_platform: "  " }],
    ["user_id of a NON-owner user", { user_id: "cccccccc-0000-0000-0000-000000000003" }],
    ["pending_email present", { pending_email: "someone@example.com" }],
    ["is_valid false", { is_valid: false }],
    ["is_valid null", { is_valid: null }],
    ["is_valid truthy string", { is_valid: "true" }],
  ];
  for (const [name, patch] of mutations) {
    const r = evaluateEligibility({ ...marketplaceRow(), ...patch });
    check(`${name} → ineligible`, !r.eligible);
  }
}

console.log("evaluateEligibility — fail closed on missing data");
{
  for (const col of ELIGIBILITY_COLUMNS) {
    const row: Record<string, unknown> = marketplaceRow();
    delete row[col];
    const r = evaluateEligibility(row);
    check(`missing column '${col}' → ineligible`, !r.eligible);
    check(
      `missing column '${col}' → reason names the column`,
      r.reasons.some((x) => x.includes(col)),
    );
  }
  check("null row → ineligible", !evaluateEligibility(null).eligible);
  check("array row → ineligible", !evaluateEligibility([]).eligible);
  check("string row → ineligible", !evaluateEligibility("row").eligible);
  check("client (record-deal) row → ineligible", !evaluateEligibility(clientRow()).eligible);
}

console.log("applyEligibilityFilters — applies every predicate condition");
{
  const calls: string[] = [];
  const fake: any = {
    eq: (c: string, v: unknown) => (calls.push(`eq:${c}=${v}`), fake),
    is: (c: string, v: unknown) => (calls.push(`is:${c}=${v}`), fake),
    not: (c: string, op: string, v: unknown) => (calls.push(`not:${c} ${op} ${v}`), fake),
    or: (f: string) => (calls.push(`or:${f}`), fake),
  };
  applyEligibilityFilters(fake);
  check("filters tool_used", calls.includes("eq:tool_used=marketplace_import"));
  check("filters data_source_type", calls.includes("eq:data_source_type=marketplace_supply"));
  check("filters source_platform not null", calls.includes("not:source_platform is null"));
  check("filters user_id null-or-owner", calls.includes(`or:user_id.is.null,user_id.eq.${OWNER_USER_ID}`));
  check("filters pending_email null", calls.includes("is:pending_email=null"));
  check("filters is_valid", calls.includes("eq:is_valid=true"));
}

console.log("detectTopicTriggers — only fires on present computed fields");
{
  const none = detectTopicTriggers({});
  check("empty row → no triggers", none.length === 0);

  const sba = detectTopicTriggers({ dscr: 1.42, monthly_payment: 15000 });
  check("dscr+payment → sba_dscr (top tier)",
    sba.some((t) => t.topic_key === "sba_dscr" && t.tier === "top"));

  const addbacks = detectTopicTriggers({ reported_sde: 400000, usable_sde: 320000 });
  check("usable < reported → addbacks trigger",
    addbacks.some((t) => t.topic_key === "addbacks_sde_pressure"));

  const noHaircut = detectTopicTriggers({ reported_sde: 400000, usable_sde: 400000 });
  check("usable == reported → no addbacks trigger",
    !noHaircut.some((t) => t.topic_key === "addbacks_sde_pressure"));

  const phantom = detectTopicTriggers({
    normalization_flags_json: [{ code: "SDE_MARGIN_2X_ABOVE_BENCHMARK", severity: "warning" }],
  });
  check("inflated-SDE flag → phantom_sde trigger",
    phantom.some((t) => t.topic_key === "phantom_sde"));

  const otherFlag = detectTopicTriggers({
    normalization_flags_json: [{ code: "BENCHMARK_UNAVAILABLE", severity: "info" }],
  });
  check("unrelated flag → no phantom_sde trigger",
    !otherFlag.some((t) => t.topic_key === "phantom_sde"));

  const malformed = detectTopicTriggers({
    dscr: "1.42", monthly_payment: "15000", normalization_flags_json: "not-an-array",
  });
  check("stringly-typed fields → no triggers (fail closed)", malformed.length === 0);

  const haircut = detectTopicTriggers({ usable_sde: 320000, monthly_payment: 15000 });
  check("usable_sde+payment → preloi_haircut trigger",
    haircut.some((t) => t.topic_key === "preloi_haircut"));
}

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll eligibility checks passed.");
