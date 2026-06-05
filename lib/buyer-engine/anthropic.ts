// Shared Anthropic client + model references.
//
// The client is created LAZILY (first use, request time) for the same reason
// as the Supabase client — a top-level `new Anthropic({...})` throws at build
// when ANTHROPIC_API_KEY isn't present during page-data collection.
//
// Best practice: import the model strings from your existing constants:
//   import { CLAUDE_HAIKU, CLAUDE_SONNET } from "@/lib/claude-models";

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY must be set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// Lazy proxy so existing `anthropic.messages.create(...)` calls work unchanged.
export const anthropic = new Proxy({} as Anthropic, {
  get(_t, prop) {
    const c = client() as any;
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
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
