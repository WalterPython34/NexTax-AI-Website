// lib/contentEngine/pipeline.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — Stage 3 pipeline orchestration.
//
// One function runs the whole flow for a target deal:
//   eligibility (fail-closed, row-wise) → topic trigger check → mode decision
//   (suppression/composite doctrine) → anonymize → derivations → fact sheet →
//   template selection (metrics prior) → generation → deterministic verify.
//
// Returns an insert payload for content_drafts — it does NOT touch the DB or
// HTTP itself (transport-ignorant; the route layer and the dry-run script
// both consume it, so they cannot drift apart).
// ─────────────────────────────────────────────────────────────────────────────

import { detectTopicTriggers, evaluateEligibility, buildEligibilitySnapshot } from "./eligibility";
import {
  anonymizeComposite,
  anonymizeSingleDeal,
  buildAnonymizationDecision,
  decideDraftMode,
  sanitizeDealFacts,
} from "./anonymize";
import {
  buildFactSheet,
  deriveDscrAtHaircut,
  deriveImpliedMultiple,
  deriveSdeGap,
} from "./factSheet";
import { selectTemplates } from "./templates";
import { generateDraft, DEFAULT_SUBREDDIT, type FetchLike } from "./generate";
import { verifyDraft, type NumericCheckResult } from "./verify";
import type { AnonymizationDecision, EligibilitySnapshot, FactSheet, SanitizedDealFacts } from "./types";

const COMPOSITE_POOL_LIMIT = 10;

export interface DraftInsertPayload {
  status: "draft";
  mode: "single_deal" | "composite";
  topic_key: string;
  template_key: string;
  target_subreddit: string;
  title: string;
  body_md: string;
  model_used: string;
  source_deal_ids: string[];
  source_signal_ids: string[];
  eligibility_snapshot: EligibilitySnapshot;
  anonymization: AnonymizationDecision;
  fact_sheet: FactSheet;
  numeric_check: NumericCheckResult;
  numeric_check_passed: boolean;
}

export type PipelineResult =
  | { ok: true; payload: DraftInsertPayload }
  | { ok: false; stage: string; reason: string };

/**
 * Runs the full draft pipeline for `targetDealRunId` against the candidate
 * rows the caller queried (rows must include CANDIDATE_COLUMNS). Fail-closed
 * at every step: any ambiguity aborts with a stage + reason, never a guess.
 */
export async function runDraftPipeline(args: {
  rows: Array<Record<string, unknown>>;
  targetDealRunId: string;
  topicKey: string;
  apiKey: string;
  fetchImpl?: FetchLike;
}): Promise<PipelineResult> {
  const { rows, targetDealRunId, topicKey, apiKey, fetchImpl } = args;

  // 1. Row-wise eligibility — the pure predicate is the authority.
  const eligibleRows = rows.filter((r) => evaluateEligibility(r).eligible);
  const targetRow = eligibleRows.find((r) => String(r.id) === targetDealRunId);
  if (!targetRow) {
    return { ok: false, stage: "eligibility", reason: `deal ${targetDealRunId} is not in the eligible set (fail closed)` };
  }

  // 2. Topic trigger — the deal's computed fields must actually fuel this topic.
  const triggers = detectTopicTriggers(targetRow);
  if (!triggers.some((t) => t.topic_key === topicKey)) {
    return { ok: false, stage: "trigger", reason: `deal does not trigger topic '${topicKey}'` };
  }

  // 3. Mode decision against the eligible pool (suppression doctrine).
  const pool: SanitizedDealFacts[] = eligibleRows.map((r) => sanitizeDealFacts(r));
  const deal = sanitizeDealFacts(targetRow);
  const mode = decideDraftMode(deal, pool);
  if (mode.decision === "suppress") {
    return { ok: false, stage: "anonymization", reason: `suppressed: ${mode.reasons.join("; ")}` };
  }

  // 4. Anonymize + derivations + fact sheet.
  let sourceDeals: SanitizedDealFacts[];
  let facts;
  if (mode.decision === "single_deal") {
    sourceDeals = [deal];
    facts = anonymizeSingleDeal(deal);
  } else {
    sourceDeals = pool.filter((d) => d.industry === deal.industry).slice(0, COMPOSITE_POOL_LIMIT);
    const composite = anonymizeComposite(sourceDeals);
    if (!composite) {
      return { ok: false, stage: "anonymization", reason: "composite pool too small (fail closed)" };
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
          deriveImpliedMultiple(deal.asking_price, deal.reported_sde, "reported_sde"),
        ].filter((d): d is NonNullable<typeof d> => d !== null)
      : [];

  const sheet = buildFactSheet({
    mode: mode.decision,
    dealRunIds: sourceDeals.map((d) => d.deal_run_id),
    anonymizedFacts: facts,
    derivations,
  });

  // 5. Template (metrics prior) + generation.
  const template = selectTemplates(topicKey, mode.decision)[0];
  if (!template) {
    return { ok: false, stage: "template", reason: `no template serves topic '${topicKey}' in mode '${mode.decision}'` };
  }
  const { draft, error } = await generateDraft({ template, sheet, mode: mode.decision, apiKey, fetchImpl });
  if (!draft) {
    return { ok: false, stage: "generation", reason: error ?? "generation failed" };
  }

  // 6. Deterministic verification. A failed check still persists (as
  // unstageable) so the audit trail is visible in the review surface.
  const numericCheck = verifyDraft({ title: draft.title, body: draft.body_md, sheet, mode: mode.decision });

  return {
    ok: true,
    payload: {
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
        eligibleRows.filter((r) => sourceDeals.some((d) => d.deal_run_id === String(r.id))) as Array<
          { id: string } & Record<string, unknown>
        >,
      ),
      anonymization: buildAnonymizationDecision(mode, sourceDeals.length),
      fact_sheet: sheet,
      numeric_check: numericCheck,
      numeric_check_passed: numericCheck.passed,
    },
  };
}
