// lib/contentEngine/generate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — Stage 2 draft generation.
//
// The generation prompt contains ONLY:
//   - the voice rules / anatomy / CTA / do-not lists (templates.ts, seeded
//     from docs/reddit-voice-corpus.md), and
//   - the fact sheet's display values + qualifiers (already rounded by
//     anonymize.ts — the model never sees raw precision, geography, or
//     identifiers).
// The model is instructed that the fact list is the complete set of numbers
// it may use; verify.ts then enforces that deterministically. Generation
// failing verification is expected occasionally — the draft persists with
// numeric_check_passed=false and cannot be staged.
//
// Model: claude-sonnet-4-6 (CLAUDE.md routing — exported/long-form prose).
// Transport-ignorant: fetch is injectable; no HTTP framework context.
// ─────────────────────────────────────────────────────────────────────────────

import type { DraftMode, FactSheet } from "./types";
import {
  CTA_PATTERNS,
  DO_NOT_RULES,
  POST_ANATOMY,
  TONE_RULES,
  type DraftTemplate,
} from "./templates";

export const GENERATION_MODEL = "claude-sonnet-4-6";
export const DEFAULT_SUBREDDIT = "buyingabusiness";

// ── Prompt assembly ──────────────────────────────────────────────────────────

function factList(sheet: FactSheet): string {
  return sheet.entries
    .map((e) => {
      const q = e.qualifier ? ` [context: ${e.qualifier}]` : "";
      return `- ${e.key}: ${e.display}${q}`;
    })
    .join("\n");
}

export function buildDraftPrompt(args: {
  template: DraftTemplate;
  sheet: FactSheet;
  mode: DraftMode;
}): string {
  const { template, sheet, mode } = args;

  const modeDirective =
    mode === "composite"
      ? `MODE: COMPOSITE. The numbers below are aggregates across multiple scored deals. The post MUST frame them as a pattern in-text (e.g. "across the deals I've scored"), never as one specific business.`
      : `MODE: SINGLE DEAL (anonymized). The numbers below are rounded figures from one real scored deal. Present it as an illustrative deal ("a deal I looked at recently"), with no geography and no identifying detail beyond what is listed.`;

  return [
    `You are drafting a Reddit post for r/${DEFAULT_SUBREDDIT} in the exact editorial voice defined below. The voice belongs to a real practitioner; reproduce it — do not invent your own.`,
    ``,
    `## Hook (title pattern)`,
    `${template.hook_pattern}`,
    `Proven example of this hook: "${template.hook_example}"`,
    `Write a NEW title using this pattern for the topic below. Do not reuse the example title verbatim.`,
    ``,
    `## Topic angle`,
    template.angle.map((a) => `- ${a}`).join("\n"),
    ``,
    `## Post anatomy (follow in order)`,
    POST_ANATOMY.map((a) => `- ${a}`).join("\n"),
    ``,
    `## Voice and tone rules`,
    TONE_RULES.map((r) => `- ${r}`).join("\n"),
    ``,
    `## Closing CTA`,
    CTA_PATTERNS.map((r) => `- ${r}`).join("\n"),
    ``,
    `## Hard prohibitions`,
    DO_NOT_RULES.map((r) => `- ${r}`).join("\n"),
    ``,
    `## ${modeDirective}`,
    ``,
    `## Coverage figures (DSCR) — state the assumptions ONCE`,
    `If the post uses any DSCR figure, state the financing assumptions ONCE, early in the coverage discussion, using the phrase "standard SBA terms" (e.g. "at standard SBA terms (80% financed / 10.5% / 10yr) — actual terms may differ"; spelling the terms out in words is also fine). Do NOT repeat the assumptions with every figure. After that single statement, let scenario figures flow naturally in the sentence, e.g. "coverage drops to [the haircut figure] on a ten percent haircut, and [the deeper figure] if the earnings drop twenty percent". Never re-attach the full assumptions string to each number.`,
    ``,
    `## THE COMPLETE SET OF NUMBERS YOU MAY USE`,
    `Every number in your draft must come from this list (you may re-express $1,200,000 as $1.2M and similar unit changes, but never alter a value). Numbers marked with a required accompaniment must appear with that accompaniment in prose. If a point needs a number not on this list, make the point without a number.`,
    ``,
    factList(sheet),
    ``,
    `## Output format`,
    `Return ONLY a JSON object, no markdown fences, no commentary:`,
    `{"title": "the post title", "body_md": "the full post body in Reddit markdown"}`,
  ].join("\n");
}

// ── Generation call ──────────────────────────────────────────────────────────

export interface GeneratedDraft {
  title: string;
  body_md: string;
  model_used: string;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * Calls the Anthropic API and parses the draft. Returns null (with a reason)
 * rather than throwing on malformed output — the caller records the failure;
 * nothing is ever auto-retried into a fabrication.
 */
export async function generateDraft(args: {
  template: DraftTemplate;
  sheet: FactSheet;
  mode: DraftMode;
  apiKey: string;
  fetchImpl?: FetchLike;
}): Promise<{ draft: GeneratedDraft | null; error: string | null }> {
  const { template, sheet, mode, apiKey } = args;
  const fetchImpl = args.fetchImpl ?? (fetch as unknown as FetchLike);

  const prompt = buildDraftPrompt({ template, sheet, mode });

  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: GENERATION_MODEL,
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (e) {
    return { draft: null, error: `API request failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!res.ok) {
    // Anthropic error bodies are JSON: {type:"error", error:{type, message}}.
    // Surface the message — a bare status code is undiagnosable from the UI.
    let detail = "";
    try {
      const errBody = (await res.json()) as { error?: { type?: string; message?: string } };
      detail = errBody?.error?.message
        ? ` — ${errBody.error.type ?? "error"}: ${errBody.error.message.slice(0, 300)}`
        : "";
    } catch { /* body unavailable — status alone will have to do */ }
    return { draft: null, error: `API error: HTTP ${res.status}${detail}` };
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  if (!text) return { draft: null, error: "no text in API response" };

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { draft: null, error: "no JSON object in API response" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { draft: null, error: "JSON parse failed" };
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.title !== "string" || obj.title.trim() === "") {
    return { draft: null, error: "missing title in generated output" };
  }
  if (typeof obj.body_md !== "string" || obj.body_md.trim() === "") {
    return { draft: null, error: "missing body_md in generated output" };
  }

  return {
    draft: {
      title: obj.title.trim(),
      body_md: obj.body_md.trim(),
      model_used: GENERATION_MODEL,
    },
    error: null,
  };
}
