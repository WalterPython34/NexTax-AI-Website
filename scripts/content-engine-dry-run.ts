// scripts/content-engine-dry-run.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — end-to-end dry run against REAL eligible deals.
// Uses the same runDraftPipeline as the owner-gated API route (no drift).
//
// USAGE (needs env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// ANTHROPIC_API_KEY):
//   npx tsx scripts/content-engine-dry-run.ts [topic_key] [--no-persist]
//
// topic_key ∈ sba_dscr | addbacks_sde_pressure | phantom_sde | preloi_haircut
// (default: sba_dscr). --no-persist prints everything but writes nothing.
//
// DB behavior: SELECTs deal_runs; INSERTs one row into content_drafts.
// No updates, no deletes, no DDL. Never posts anywhere.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import {
  CANDIDATE_COLUMNS,
  applyEligibilityFilters,
  detectTopicTriggers,
  evaluateEligibility,
} from "../lib/contentEngine/eligibility";
import { runDraftPipeline } from "../lib/contentEngine/pipeline";

async function main(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!url || !key || !apiKey) {
    console.error(
      "Missing env. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY",
    );
    return 1;
  }

  const args = process.argv.slice(2);
  const persist = !args.includes("--no-persist");
  const topicKey = args.find((a) => !a.startsWith("--")) ?? "sba_dscr";

  const supabase = createClient(url, key);

  const { data: rows, error } = await applyEligibilityFilters(
    supabase.from("deal_runs").select(CANDIDATE_COLUMNS.join(",")) as any,
  )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("deal_runs query failed:", error.message);
    return 1;
  }

  const eligible = (rows ?? []).filter((r: Record<string, unknown>) => evaluateEligibility(r).eligible);
  console.log(`candidates: ${rows?.length ?? 0} from DB filter → ${eligible.length} pass fail-closed predicate`);

  const target = eligible.find((r: Record<string, unknown>) =>
    detectTopicTriggers(r).some((t) => t.topic_key === topicKey),
  );
  if (!target) {
    console.error(`No eligible deal triggers topic '${topicKey}'.`);
    return 1;
  }
  console.log(`selected deal ${target.id} (${target.industry}) for topic '${topicKey}'`);

  const result = await runDraftPipeline({
    rows: rows ?? [],
    targetDealRunId: String(target.id),
    topicKey,
    apiKey,
  });
  if (!result.ok) {
    console.error(`pipeline aborted at '${result.stage}': ${result.reason}`);
    return 1;
  }

  const p = result.payload;
  console.log(`mode: ${p.mode} (${p.source_deal_ids.length} source deal(s)); template: ${p.template_key}`);
  console.log(`fact sheet: ${p.fact_sheet.entries.length} entries`);
  console.log(`numeric check: ${p.numeric_check_passed ? "PASSED" : "FAILED"}`);
  if (!p.numeric_check_passed) {
    console.log(`  unmatched: ${p.numeric_check.unmatched.join(", ") || "(none)"}`);
    for (const c of p.numeric_check.label_checks.filter((x) => !x.passed)) {
      console.log(`  label failure: ${c.check} — ${c.detail}`);
    }
  }

  console.log("\n───── DRAFT ─────");
  console.log(`TITLE: ${p.title}\n`);
  console.log(p.body_md);
  console.log("─────────────────\n");

  if (!persist) {
    console.log("--no-persist: nothing written.");
    return 0;
  }
  const { data: inserted, error: insertError } = await supabase
    .from("content_drafts")
    .insert(p)
    .select("id")
    .single();
  if (insertError) {
    console.error("content_drafts insert failed:", insertError.message);
    return 1;
  }
  console.log(`persisted content_drafts row ${inserted?.id} (status=draft, numeric_check_passed=${p.numeric_check_passed})`);
  return 0;
}

main().then((code) => process.exit(code));
