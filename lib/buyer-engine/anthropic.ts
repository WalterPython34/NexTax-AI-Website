// Shared Anthropic client + model references.
//
// Best practice: import these from your existing centralized constants file
// so model strings live in exactly one place:
//
//   import { CLAUDE_HAIKU, CLAUDE_SONNET } from "@/lib/claude-models";
//
// The fallbacks below let this module work standalone. Align the names with
// whatever your claude-models.ts actually exports, then delete the fallbacks.

import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Classifier runs at high volume on short text -> cheap, fast model.
export const CLASSIFIER_MODEL = "claude-haiku-4-5-20251001";

// Icebreaker quality matters more -> mid/high model.
export const ICEBREAKER_MODEL = "claude-sonnet-4-6";

// Strip ```json fences and parse, tolerant of preamble.
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}

// Pull the concatenated text out of a Messages response.
export function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
