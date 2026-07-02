// lib/contentEngine/pipeline.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Stage 3 pipeline orchestration — fail-closed integration tests (mocked LLM).
// Run with: npx tsx lib/contentEngine/pipeline.test.ts
// ─────────────────────────────────────────────────────────────────────────────

import { runDraftPipeline } from "./pipeline";
import { OWNER_USER_ID } from "./eligibility";
import type { FetchLike } from "./generate";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

/** Marketplace row exactly as bulk-import + owner backfill produce them. */
function mkRow(id: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    tool_used: "marketplace_import",
    data_source_type: "marketplace_supply",
    source_platform: "BizBuySell",
    user_id: OWNER_USER_ID,
    pending_email: null,
    is_valid: true,
    industry: "hvac",
    state: "OH",
    revenue: 1_200_000,
    sde: 340_000,
    reported_sde: 405_000,
    usable_sde: 340_000,
    asking_price: 1_495_000,
    fair_value: 1_310_000,
    monthly_payment: 16_138,
    dscr: 1.7557,
    valuation_multiple: 4.397,
    employees: 14,
    years_in_business: 22,
    confidence_score: "high",
    normalization_trust_score: 68,
    normalization_flags_json: [],
    ...over,
  };
}

/** A healthy pool clustered near the target so single-deal mode is permitted. */
function mkPoolRows(n: number): Array<Record<string, unknown>> {
  return Array.from({ length: n }, (_, i) =>
    mkRow(`pool-${i}`, { revenue: 1_200_000 + (i % 3) * 10_000 }),
  );
}

const cleanBody =
  "An hvac deal asking $1.5M against $340K of usable SDE. Coverage is 1.76x at standard SBA terms (80% financed / 10.5% / 10yr). It drops to 1.58x if SDE takes a ten percent haircut.";
const mockGen = (body: string, title = "T"): FetchLike =>
  async () => ({
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: "text", text: JSON.stringify({ title, body_md: body }) }] }),
  });

(async () => {
  console.log("runDraftPipeline — happy single-deal path");
  {
    const rows = [mkRow("target"), ...mkPoolRows(12)];
    const r = await runDraftPipeline({
      rows, targetDealRunId: "target", topicKey: "sba_dscr", apiKey: "k", fetchImpl: mockGen(cleanBody),
    });
    check("succeeds", r.ok, r.ok ? "" : `${r.stage}: ${r.reason}`);
    if (r.ok) {
      check("mode single_deal", r.payload.mode === "single_deal");
      check("status draft", r.payload.status === "draft");
      check("numeric check passed", r.payload.numeric_check_passed);
      check("source deal recorded", r.payload.source_deal_ids.length === 1 && r.payload.source_deal_ids[0] === "target");
      check("eligibility snapshot covers source", r.payload.eligibility_snapshot.deals.length === 1);
      check("fact sheet present", r.payload.fact_sheet.entries.length > 0);
      check("template selected by prior", r.payload.template_key === "sba_dscr_broker_didnt_tell_you");
      check("no signals attached", r.payload.source_signal_ids.length === 0);
    }
  }

  console.log("runDraftPipeline — fabricated output persists as unstageable");
  {
    const rows = [mkRow("target"), ...mkPoolRows(12)];
    const r = await runDraftPipeline({
      rows, targetDealRunId: "target", topicKey: "sba_dscr", apiKey: "k",
      fetchImpl: mockGen("This deal produces a $47K tax shield in year one at standard SBA terms."),
    });
    check("still returns payload", r.ok);
    if (r.ok) {
      check("numeric_check_passed false", !r.payload.numeric_check_passed);
      check("unmatched token recorded", r.payload.numeric_check.unmatched.length > 0);
    }
  }

  console.log("runDraftPipeline — fail-closed aborts");
  {
    // Ineligible target (client deal shape).
    const clientRow = mkRow("client", { tool_used: "risk_analyzer", data_source_type: "user_submitted", source_platform: null });
    const r1 = await runDraftPipeline({
      rows: [clientRow, ...mkPoolRows(12)], targetDealRunId: "client", topicKey: "sba_dscr", apiKey: "k", fetchImpl: mockGen(cleanBody),
    });
    check("ineligible target aborts at eligibility", !r1.ok && r1.stage === "eligibility");

    // Unknown target id.
    const r2 = await runDraftPipeline({
      rows: mkPoolRows(12), targetDealRunId: "nope", topicKey: "sba_dscr", apiKey: "k", fetchImpl: mockGen(cleanBody),
    });
    check("unknown target aborts at eligibility", !r2.ok && r2.stage === "eligibility");

    // Deal doesn't trigger the topic.
    const noTrigger = mkRow("target", { dscr: null, monthly_payment: null, reported_sde: null, usable_sde: null, normalization_flags_json: [] });
    const r3 = await runDraftPipeline({
      rows: [noTrigger, ...mkPoolRows(12)], targetDealRunId: "target", topicKey: "sba_dscr", apiKey: "k", fetchImpl: mockGen(cleanBody),
    });
    check("untriggered topic aborts at trigger", !r3.ok && r3.stage === "trigger");

    // Tiny pool → suppression.
    const r4 = await runDraftPipeline({
      rows: [mkRow("target")], targetDealRunId: "target", topicKey: "sba_dscr", apiKey: "k", fetchImpl: mockGen(cleanBody),
    });
    check("suppressed deal aborts at anonymization", !r4.ok && r4.stage === "anonymization");

    // Generation failure surfaces, never fabricates.
    const r5 = await runDraftPipeline({
      rows: [mkRow("target"), ...mkPoolRows(12)], targetDealRunId: "target", topicKey: "sba_dscr", apiKey: "k",
      fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }),
    });
    check("generation failure aborts at generation", !r5.ok && r5.stage === "generation");
  }

  console.log("runDraftPipeline — composite fallback for unusual deals");
  {
    // Unique revenue → k-screen forbids single-deal → composite over industry pool.
    const rows = [mkRow("target", { revenue: 8_800_000 }), ...mkPoolRows(12)];
    const compositeBody =
      "Across the deals I've scored in hvac, the median ask runs $1.5M against $340K of median usable SDE across 10 deals.";
    const r = await runDraftPipeline({
      rows, targetDealRunId: "target", topicKey: "sba_dscr", apiKey: "k", fetchImpl: mockGen(compositeBody),
    });
    check("succeeds in composite mode", r.ok && r.payload.mode === "composite", r.ok ? "" : `${r.stage}: ${r.reason}`);
    if (r.ok) {
      check("multiple source deals", r.payload.source_deal_ids.length >= 3);
      check("anonymization decision recorded", r.payload.anonymization.mode === "composite");
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nAll pipeline checks passed.");
})();
