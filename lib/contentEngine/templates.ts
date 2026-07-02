// lib/contentEngine/templates.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — Stage 2 templates.
//
// SEEDED FROM docs/reddit-voice-corpus.md — Steve's real posts and their
// performance data. Nothing here is an invented voice: hooks come from §5
// (performance-ranked), the anatomy from §3, tone from §4, CTA from §7, the
// do-not list from §8, and the weights encode reddit-post-metrics.csv as a
// pre-loaded prior (buyer-side default, worked-numeric-example over
// listicle, top-tier topics weighted heaviest).
//
// Templates are DATA for Steve's review, consumed by generate.ts. Editing a
// template requires re-reading the corpus, not just this file.
// ─────────────────────────────────────────────────────────────────────────────

import type { DraftMode, TopicTier } from "./types";

// ── Shared voice rules (corpus §4) — injected into every generation prompt ──

export const TONE_RULES: readonly string[] = [
  "Second person, direct: 'your deal', 'you'll get burned on', 'what you actually pay'.",
  "Plain English; define every term the moment it appears (e.g. 'DSCR is just a fancy way of saying how many dollars of cash flow you have for every dollar of loan payment').",
  "Confident and teacherly, never salesy. Authority comes from specificity and worked math, not adjectives.",
  "Lived-experience 'I' statements, grounded and concrete — real, not boastful.",
  "Honest about incentives: name the seller/broker incentive without vilifying ('Brokers evaluate businesses to sell them. Banks evaluate businesses assuming they will fail.').",
  "Measured, not hype: 'None of these are automatic deal-killers, but each one gives you information.'",
  "Em dashes are fine in titles, headers, and bullets; minimize them in paragraph prose.",
  "Credibility line (Big 4 / PE background) at most one sentence, and only when the topic warrants it — never in every post.",
];

// ── Do-NOT list (corpus §8 + engine constitution) ────────────────────────────

export const DO_NOT_RULES: readonly string[] = [
  "No product pitch in the body. No mention of AcquiFlow or NexTax in the body.",
  "No hype adjectives standing in for specifics.",
  "NO NUMBER that is not in the provided fact list. Do not compute, extrapolate, or invent any figure. If a worked example needs a number you were not given, restructure the example around the numbers you have.",
  "This includes incidental numerals — durations, counts, ranges, dates ('top 5 customers', '90 days', '20-30 hours'). Write those in words ('a handful of customers', 'a few months') or drop them. Section numbering (1., 2., 3.) is fine.",
  "No seller-side framing.",
  "No listicle without a worked numeric example.",
  "No manufactured urgency.",
  "No claims about specific SBA rules, dates, or policy changes unless they appear verbatim in the fact list.",
];

// ── CTA patterns (corpus §7) ─────────────────────────────────────────────────

export const CTA_PATTERNS: readonly string[] = [
  "Close with an open question inviting the community to share their own experience with the topic.",
  "Add a soft offer to help in the comments (e.g. 'if you're evaluating a deal and wrestling with this, drop your situation below and I'll respond'). Never a product pitch.",
];

// ── The post anatomy (corpus §3) — every draft follows this skeleton ─────────

export const POST_ANATOMY: readonly string[] = [
  "1. Title: use the template's hook pattern. Buyer-side.",
  "2. Open by naming the wrong mental model or scenario the reader currently holds.",
  "3. Plain-English promise (e.g. 'Here's my easy-to-read version I wish more buyers heard up front.').",
  "4. Numbered body sections with bold headers. Every substantive section: plain-English explanation, THEN a worked numeric example using ONLY the provided fact list. The math is the differentiator.",
  "5. State authority thresholds as fact where relevant (they are in the fact list).",
  "6. A 'where people get burned' / 'the trap nobody mentions' section: the hidden downside and the late-stage consequence.",
  "7. Bottom line: one tight paragraph.",
  "8. CTA per the CTA pattern.",
];

// ── Templates ────────────────────────────────────────────────────────────────

export interface DraftTemplate {
  template_key: string;
  topic_key: string;
  tier: TopicTier;
  /** Which draft modes this template can serve. */
  modes: DraftMode[];
  /** Hook pattern from corpus §5, with the real example that proved it. */
  hook_pattern: string;
  hook_example: string;
  /** Topic-specific angle directives layered on the shared anatomy. */
  angle: string[];
  /**
   * Metrics prior (reddit-post-metrics.csv): relative selection weight.
   * SBA/DSCR is the runaway winner (66.4K views, 249 shares) → heaviest.
   */
  weight: number;
}

export const TEMPLATES: readonly DraftTemplate[] = [
  {
    template_key: "sba_dscr_broker_didnt_tell_you",
    topic_key: "sba_dscr",
    tier: "top",
    modes: ["single_deal", "composite"],
    hook_pattern:
      "\"What your broker (probably) didn't tell you about [X]\" — the corpus's top performer.",
    hook_example: "What your broker probably didn't tell you about SBA loans",
    angle: [
      "Open on the misconception: buyers think SBA is '10% down, bank covers 90%, done'.",
      "Center the worked example on DSCR at the deal's numbers: price, SDE, debt service, the resulting coverage.",
      "Whenever DSCR appears, include its standard-terms qualifier from the fact list verbatim.",
      "The burn: lender haircuts to add-backs push DSCR under the line late, after time and money are spent.",
    ],
    weight: 5,
  },
  {
    template_key: "addbacks_broker_didnt_tell_you",
    topic_key: "addbacks_sde_pressure",
    tier: "high",
    modes: ["single_deal", "composite"],
    hook_pattern: "\"What your broker (probably) didn't tell you about [X]\" applied to add-backs.",
    hook_example: "What your broker probably didn't tell you about add-backs",
    angle: [
      "Frame: an add-back is a claim that needs to be tested, not an expense the seller wants to ignore.",
      "Worked example: stated SDE vs. what survived pressure-testing (reported vs. usable SDE and the gap from the fact list), and what that does to the implied multiple.",
      "Rule of thumb: every add-back should be provable, non-recurring or discretionary, and transferable.",
      "The burn: the lender haircuts the add-backs and the structure blows up late in the process.",
    ],
    weight: 3,
  },
  {
    template_key: "phantom_sde_named_trap",
    topic_key: "phantom_sde",
    tier: "high",
    modes: ["single_deal", "composite"],
    hook_pattern: "Named trap / provocative reframe (corpus §5.2).",
    hook_example:
      "The \"Phantom SDE\" Trap: How Unpaid Family Labor Destroys Small Business Valuations",
    angle: [
      "Open on the 'beautiful business at a clean multiple' scenario that collapses after close.",
      "Worked example: marketed SDE vs. normalized SDE from the fact list, and what the adjustment does to coverage.",
      "Teach the diligence questions that surface invisible labor/inflated earnings before the LOI.",
      "The bottom line: normalize the earnings before you calculate your purchase multiple.",
    ],
    weight: 3,
  },
  {
    template_key: "preloi_haircut_checklist",
    topic_key: "preloi_haircut",
    tier: "high",
    modes: ["single_deal", "composite"],
    hook_pattern: "Utility / checklist hook (corpus §5.5) — high shares.",
    hook_example:
      "The pre-LOI diligence checklist I wish more buyers used before spending $20k on QoE",
    angle: [
      "Frame: model the downside BEFORE the LOI, not after you've spent real money.",
      "Worked example: DSCR at stated SDE, then at the haircut scenarios provided in the fact list. Show the coverage deterioration explicitly.",
      "'If the deal only makes sense at the seller's cleanest number, it probably doesn't work for you.'",
      "Close the loop: the buyers who win slow down just enough before LOI to catch the obvious stuff.",
    ],
    weight: 3,
  },
];

/** Templates serving a topic+mode, heaviest weight first (metrics prior). */
export function selectTemplates(topicKey: string, mode: DraftMode): DraftTemplate[] {
  return TEMPLATES
    .filter((t) => t.topic_key === topicKey && t.modes.includes(mode))
    .sort((a, b) => b.weight - a.weight);
}
