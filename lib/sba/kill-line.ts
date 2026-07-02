import type { InterpretationPayload } from "./sba-engine";
import type { Interpretation } from "./breakdown";
import { templateKillLine } from "./breakdown";
import type { SbaVerdict } from "./sba-engine";

// ---------------------------------------------------------------------------
// Stage 4: LLM kill-line with a no-invented-numbers guardrail.
//
// The LLM NEVER calculates. It receives only the deterministic
// InterpretationPayload and writes one plain-English sentence. Before anything
// ships, the sentence passes two hard gates:
//   1. Numeric-token gate: every number in the sentence must already exist in
//      the payload (ratio or percent form for margins; formatted or unformatted
//      money; the fixed policy constants 1.15 / 1.25 / 1.50).
//   2. Forbidden-language gate: no financing-commitment language.
// Any failure — including API errors or timeouts — falls back to the
// deterministic per-zone template. Fabrication is structurally unshippable.
// ---------------------------------------------------------------------------

export const KILL_LINE_MODEL = "claude-haiku-4-5";
const MAX_KILL_LINE_CHARS = 320;
const LLM_TIMEOUT_MS = 4000;

// Locked forbidden stems/phrases (case-insensitive). Stems catch variants:
// approv- catches approved / approval / pre-approved; guarant- catches
// guarantee / guaranteed; qualif- catches qualify / qualifies / pre-qualified.
const FORBIDDEN_PATTERNS: RegExp[] = [
  /approv\w*/i,
  /guarant\w*/i,
  /qualif\w*/i,
  /lender\s+will/i,
  /financing\s+commitment/i,
  /commitment\s+to\s+(lend|finance)/i,
];

/** Canonical numeric form: strip $, commas, %, ×/x; collapse to Number string. */
function canonical(raw: string): string | null {
  const cleaned = raw.replace(/[$,%×x\s]/gi, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? String(n) : null;
}

function pushNumber(set: Set<string>, n: number | null | undefined): void {
  if (n === null || n === undefined || !Number.isFinite(n)) return;
  set.add(String(n));
}

/** Margins are ratios (0.2); prose may say "20%". Whitelist both forms. */
function pushMargin(set: Set<string>, n: number | null | undefined): void {
  if (n === null || n === undefined || !Number.isFinite(n)) return;
  pushNumber(set, n);
  pushNumber(set, Number((n * 100).toFixed(6)));
}

export function buildNumericWhitelist(payload: InterpretationPayload): Set<string> {
  const set = new Set<string>();
  pushNumber(set, payload.buyerCaseDscr);
  pushNumber(set, payload.lenderDscrLow);
  pushNumber(set, payload.lenderDscrHigh);
  pushNumber(set, payload.lenderComfortThreshold);
  pushNumber(set, payload.ownerComp);
  pushNumber(set, payload.addbackLow);
  pushNumber(set, payload.addbackHigh);
  pushMargin(set, payload.reportedMargin);
  pushMargin(set, payload.medianMargin);
  // Fixed policy constants (SBA floor, lender comfort, strong threshold).
  pushNumber(set, 1.15);
  pushNumber(set, 1.25);
  pushNumber(set, 1.5);
  return set;
}

/** Every numeric-looking token in the text, as written. */
export function extractNumericTokens(text: string): string[] {
  return text.match(/\$?\d[\d,]*(?:\.\d+)?%?/g) ?? [];
}

export type KillLineValidation =
  | { ok: true; line: string }
  | { ok: false; reason: string };

export function validateKillLine(
  rawText: string,
  payload: InterpretationPayload,
): KillLineValidation {
  const line = rawText.replace(/\s+/g, " ").trim();

  if (!line) return { ok: false, reason: "empty" };
  if (line.length > MAX_KILL_LINE_CHARS) {
    return { ok: false, reason: `too long (${line.length} chars)` };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    const hit = line.match(pattern);
    if (hit) return { ok: false, reason: `forbidden language: "${hit[0]}"` };
  }

  const whitelist = buildNumericWhitelist(payload);
  for (const token of extractNumericTokens(line)) {
    const canon = canonical(token);
    if (canon === null || !whitelist.has(canon)) {
      return { ok: false, reason: `unrecognized number: "${token}"` };
    }
  }

  return { ok: true, line };
}

// ---------------------------------------------------------------------------
// Model call (injectable for tests).
// ---------------------------------------------------------------------------

export type ModelCaller = (prompt: string) => Promise<string>;

const SYSTEM_RULES = [
  "You write exactly ONE sentence interpreting an SBA underwriting screen result for a business buyer.",
  "Use ONLY numbers that appear verbatim in the JSON payload. Never compute, estimate, or introduce any other number.",
  "Speak in DSCR terms (e.g. \"1.22\\u20131.28\\u00d7 against the 1.25\\u00d7 line\"). Do not restate margins as percentages.",
  "Format dollar amounts with a $ sign and thousands separators (e.g. $9,323, never 9323).",
  "Never use financing-commitment language: no forms of \"approve\", \"guarantee\", or \"qualify\", never \"lender will\", never \"financing commitment\". This is a screen, not a credit decision.",
  "Plain, direct, institutional tone. No hedging filler, no exclamation marks, no advice to \"consult professionals\".",
  "Output the sentence only \\u2014 no preamble, no quotes, no markdown.",
].join("\n");

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: KILL_LINE_MODEL,
        max_tokens: 120,
        temperature: 0.2,
        system: SYSTEM_RULES,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join(" ")
      .trim();
    if (!text) throw new Error("empty completion");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function buildPrompt(payload: InterpretationPayload): string {
  return [
    "Deterministic underwriting payload (the only numbers you may use):",
    JSON.stringify(payload),
    "",
    `Zone meaning: PASS = the lender-view DSCR range sits at or above the ${payload.lenderComfortThreshold}\u00d7 line; FAIL = below it; BUBBLE = straddles it, so documented add-backs decide.`,
    "Write the one-sentence interpretation.",
  ].join("\n");
}

/**
 * Generate the kill-line. Returns a validated LLM sentence, or the
 * deterministic template on ANY failure (validation, API error, timeout,
 * missing key). Never throws.
 */
export async function generateKillLine(
  verdict: SbaVerdict,
  payload: InterpretationPayload,
  callModel: ModelCaller = callAnthropic,
): Promise<Interpretation> {
  const fallback: Interpretation = { killLine: templateKillLine(verdict), source: "template" };
  try {
    const raw = await callModel(buildPrompt(payload));
    const validated = validateKillLine(raw, payload);
    if (!validated.ok) {
      console.warn(`[sba-killline] rejected LLM output (${validated.reason}); using template`);
      return fallback;
    }
    return { killLine: validated.line, source: "llm", model: KILL_LINE_MODEL };
  } catch (e) {
    console.warn(
      `[sba-killline] model call failed (${e instanceof Error ? e.message : String(e)}); using template`,
    );
    return fallback;
  }
}
