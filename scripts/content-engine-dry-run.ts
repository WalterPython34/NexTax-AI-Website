// scripts/content-engine-dry-run.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — Stage 2 end-to-end dry run.
//
// Runs the full pipeline against REAL eligible deals:
//   eligibility (fail-closed) → mode decision → anonymize → fact sheet →
//   generate (claude-sonnet-4-6) → verify (no-fabrication) → persist to
//   content_drafts (status='draft').
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
  buildEligibilitySnapshot,
  detectTopicTriggers,
  evaluateEligibility,
} from "../lib/contentEngine/eligibility";
import {
  anonymizeComposite,
  anonymizeSingleDeal,
  buildAnonymizationDecision,
  decideDraftMode,
  sanitizeDealFacts,
} from "../lib/contentEngine/anonymize";
import {
  buildFactSheet,
  deriveDscrAtHaircut,
  deriveImpliedMultiple,
  deriveSdeGap,
} from "../lib/contentEngine/factSheet";
import { selectTemplates } from "../lib/contentEngine/templates";
import { generateDraft, DEFAULT_SUBREDDIT } from "../lib/contentEngine/generate";
import { verifyDraft } from "../lib/contentEngine/verify";
import type { SanitizedDealFacts } from "../lib/contentEngine/types";

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

  // ── 1. Candidates: DB narrows, pure predicate decides ─────────────────────
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
  if (eligible.length === 0) {
    console.error("No eligible deals. Nothing to draft.");
    return 1;
  }

  const pool: SanitizedDealFacts[] = eligible.map((r: Record<string, unknown>) => sanitizeDealFacts(r));

  // ── 2. Pick the newest deal that triggers the requested topic ─────────────
  const candidate = eligible.find((r: Record<string, unknown>) =>
    detectTopicTriggers(r).some((t) => t.topic_key === topicKey),
  );
  if (!candidate) {
    console.error(`No eligible deal triggers topic '${topicKey}'.`);
    return 1;
  }
  const deal = sanitizeDealFacts(candidate);
  console.log(`selected deal ${deal.deal_run_id} (${deal.industry}) for topic '${topicKey}'`);

  // ── 3. Mode decision (fail closed) ─────────────────────────────────────────
  const mode = decideDraftMode(deal, pool);
  console.log(`mode decision: ${mode.decision}`);
  for (const r of mode.reasons) console.log(`  - ${r}`);
  if (mode.decision === "suppress") {
    console.error("Deal suppressed by anonymization screens. Nothing to draft.");
    return 1;
  }

  // ── 4. Anonymize + fact sheet ──────────────────────────────────────────────
  let facts;
  let sourceDeals: SanitizedDealFacts[];
  if (mode.decision === "single_deal") {
    sourceDeals = [deal];
    facts = anonymizeSingleDeal(deal);
  } else {
    sourceDeals = pool.filter((d) => d.industry === deal.industry).slice(0, 10);
    const composite = anonymizeComposite(sourceDeals);
    if (!composite) {
      console.error("Composite pool too small. Nothing to draft.");
      return 1;
    }
    facts = composite;
  }

  const derivations =
    mode.decision === "single_deal"
      ? [
          deriveDscrAtHaircut(deal.usable_sde, deal.monthly_payment, 10),
          deriveDscrAtHaircut(deal.usable_sde, deal.monthly_payment, 20),
          deriveSdeGap(deal.reported_sde, deal.usable_sde),
          deriveImpliedMultiple(deal.asking_price, deal.usable_sde, "usable_sde"),
        ].filter((d): d is NonNullable<typeof d> => d !== null)
      : [];

  const sheet = buildFactSheet({
    mode: mode.decision,
    dealRunIds: sourceDeals.map((d) => d.deal_run_id),
    anonymizedFacts: facts,
    derivations,
  });
  console.log(`fact sheet: ${sheet.entries.length} entries (${derivations.length} derived)`);

  // ── 5. Template + generation ───────────────────────────────────────────────
  const template = selectTemplates(topicKey, mode.decision)[0];
  if (!template) {
    console.error(`No template serves topic '${topicKey}' in mode '${mode.decision}'.`);
    return 1;
  }
  console.log(`template: ${template.template_key} (weight ${template.weight})`);
  const { draft, error: genError } = await generateDraft({
    template,
    sheet,
    mode: mode.decision,
    apiKey,
  });
  if (!draft) {
    console.error("generation failed:", genError);
    return 1;
  }

  // ── 6. Verify (deterministic no-fabrication check) ─────────────────────────
  const numericCheck = verifyDraft({
    title: draft.title,
    body: draft.body_md,
    sheet,
    mode: mode.decision,
  });
  console.log(`numeric check: ${numericCheck.passed ? "PASSED" : "FAILED"}`);
  if (!numericCheck.passed) {
    console.log(`  unmatched tokens: ${numericCheck.unmatched.join(", ") || "(none)"}`);
    for (const c of numericCheck.label_checks.filter((x) => !x.passed)) {
      console.log(`  label failure: ${c.check} — ${c.detail}`);
    }
  }

  console.log("\n───── DRAFT ─────");
  console.log(`TITLE: ${draft.title}\n`);
  console.log(draft.body_md);
  console.log("─────────────────\n");

  // ── 7. Persist (insert only; a failed check persists as unstageable) ───────
  if (!persist) {
    console.log("--no-persist: nothing written.");
    return 0;
  }
  const { data: inserted, error: insertError } = await supabase
    .from("content_drafts")
    .insert({
      status: "draft",
      mode: mode.decision,
      topic_key: topicKey,
      template_key: template.template_key,
      target_subreddit: DEFAULT_SUBREDDIT,
      title: draft.title,
      body_md: draft.body_md,
      model_used: draft.model_used,
      source_deal_ids: sourceDeals.map((d) => d.deal_run_id),
      source_signal_ids: [],
      eligibility_snapshot: buildEligibilitySnapshot(
        eligible.filter((r: Record<string, unknown>) =>
          sourceDeals.some((d) => d.deal_run_id === String(r.id)),
        ) as Array<{ id: string }>,
      ),
      anonymization: buildAnonymizationDecision(mode, sourceDeals.length),
      fact_sheet: sheet,
      numeric_check: numericCheck,
      numeric_check_passed: numericCheck.passed,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("content_drafts insert failed:", insertError.message);
    return 1;
  }
  console.log(`persisted content_drafts row ${inserted?.id} (status=draft, numeric_check_passed=${numericCheck.passed})`);
  return 0;
}

main().then((code) => process.exit(code));
