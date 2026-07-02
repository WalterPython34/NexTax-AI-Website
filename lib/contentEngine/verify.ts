// lib/contentEngine/verify.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — §2.3 no-fabrication verification (Stage 2).
//
// Deterministic code, no LLM. Every numeric token in a generated draft must
// match the fact sheet (entry values, or numbers appearing in entry
// display/qualifier strings, with K/M/percent scalings). Any unmatched
// number FAILS the draft; a failed draft cannot reach status='staged'.
// Also enforces the composite pattern label and the DSCR standard-terms
// qualifier in prose.
// ─────────────────────────────────────────────────────────────────────────────

import type { DraftMode, FactSheet } from "./types";

export interface ExtractedNumber {
  token: string; // as it appeared, e.g. "$1.2M", "1.44x", "10.5%"
  normalized: number; // e.g. 1200000, 1.44, 10.5
  matched: boolean;
  matched_to: string | null; // fact key or "display/qualifier text"
}

export interface NumericCheckResult {
  passed: boolean;
  extracted: ExtractedNumber[];
  unmatched: string[]; // tokens that failed
  label_checks: Array<{ check: string; passed: boolean; detail: string }>;
}

// ── Allowed-number set ───────────────────────────────────────────────────────

const EPSILON = 1e-6;

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Pulls every numeric token out of a text (display/qualifier strings). */
function numbersInText(text: string): number[] {
  const out: number[] = [];
  const re = /\$?(\d[\d,]*\.?\d*)\s*([KkMm])?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const base = parseFloat(m[1].replace(/,/g, ""));
    if (!isFinite(base)) continue;
    const suffix = m[2]?.toUpperCase();
    out.push(suffix === "K" ? base * 1_000 : suffix === "M" ? base * 1_000_000 : base);
    // Also allow the unscaled figure as written ("1.2" in "$1.2M").
    if (suffix) out.push(base);
  }
  return out;
}

interface AllowedNumber {
  value: number;
  source: string; // fact key
}

/**
 * Builds the whitelist of numbers a draft may contain: every entry value
 * plus its K/M scalings, and every number appearing in entry display or
 * qualifier text (qualifiers are mandatory prose, so their numbers are
 * legitimate).
 */
export function buildAllowedNumbers(sheet: FactSheet): AllowedNumber[] {
  const allowed: AllowedNumber[] = [];
  for (const e of sheet.entries) {
    if (typeof e.value === "number" && isFinite(e.value)) {
      allowed.push({ value: e.value, source: e.key });
      if (e.value >= 1_000) allowed.push({ value: e.value / 1_000, source: `${e.key} (K-scaled)` });
      if (e.value >= 1_000_000) allowed.push({ value: e.value / 1_000_000, source: `${e.key} (M-scaled)` });
    }
    for (const text of [e.display, e.qualifier ?? ""]) {
      for (const n of numbersInText(text)) {
        allowed.push({ value: n, source: `${e.key} (display/qualifier)` });
      }
    }
  }
  return allowed;
}

// ── Token extraction from the draft ──────────────────────────────────────────

/**
 * Extracts numeric tokens from draft prose. Section-numbering ordinals
 * ("1. ", "2) ", "### 3.") at the start of a line are structural, not
 * figures, and are exempt.
 */
export function extractNumericTokens(body: string): Array<{ token: string; normalized: number }> {
  const tokens: Array<{ token: string; normalized: number }> = [];
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    // Strip a leading list ordinal (optionally after markdown header/bold markers).
    const stripped = line.replace(/^\s*(?:#{1,6}\s*)?(?:\*\*)?\d{1,2}[.)](?:\*\*)?\s+/, "");
    const re = /\$?\d[\d,]*\.?\d*\s*[KkMm]?x?%?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(stripped)) !== null) {
      const raw = m[0].trim();
      const cleaned = raw.replace(/[$,%\s]/g, "").replace(/x$/i, "");
      const suffix = /[Mm]$/.test(cleaned) ? "M" : /[Kk]$/.test(cleaned) ? "K" : null;
      const base = parseFloat(cleaned.replace(/[KkMm]$/, ""));
      if (!isFinite(base)) continue;
      const normalized = suffix === "M" ? base * 1_000_000 : suffix === "K" ? base * 1_000 : base;
      tokens.push({ token: raw, normalized });
    }
  }
  return tokens;
}

// ── The check ────────────────────────────────────────────────────────────────

export const COMPOSITE_LABEL_PATTERNS: readonly RegExp[] = [
  /across (the )?\d+ (scored )?deals/i,
  /across (the )?deals I('|’)ve (scored|reviewed|analyzed|seen)/i,
  /this is a pattern/i,
  /pattern, not a specific business/i,
  /composite/i,
];

export const DSCR_LABEL_PATTERN = /standard SBA terms/i;

/**
 * Verifies a generated draft against its fact sheet. Deterministic.
 * `passed` is the value for content_drafts.numeric_check_passed — the
 * application must refuse to stage a draft while it is false.
 */
export function verifyDraft(args: {
  body: string;
  title: string;
  sheet: FactSheet;
  mode: DraftMode;
}): NumericCheckResult {
  const { body, title, sheet, mode } = args;
  const allowed = buildAllowedNumbers(sheet);
  const text = `${title}\n${body}`;

  const extracted: ExtractedNumber[] = extractNumericTokens(text).map(({ token, normalized }) => {
    // A K/M-scaled token also matches when the draft re-scales an allowed
    // value (e.g. sheet has 1200000, draft writes "$1,200K").
    const hit = allowed.find((a) => nearlyEqual(a.value, normalized));
    return { token, normalized, matched: hit !== undefined, matched_to: hit?.source ?? null };
  });

  const unmatched = extracted.filter((t) => !t.matched).map((t) => t.token);

  const label_checks: NumericCheckResult["label_checks"] = [];

  // Composite drafts must carry the pattern framing in-text (corpus §9).
  if (mode === "composite") {
    const ok = COMPOSITE_LABEL_PATTERNS.some((re) => re.test(body));
    label_checks.push({
      check: "composite_pattern_label",
      passed: ok,
      detail: ok
        ? "pattern framing present"
        : "composite draft lacks pattern framing (e.g. 'across the deals I've scored')",
    });
  }

  // If any DSCR fact number was used, the standard-terms label must appear.
  const usedDscr = extracted.some(
    (t) => t.matched && /(\b|_)dscr(\b|_)/i.test(t.matched_to ?? ""),
  );
  if (usedDscr) {
    const ok = DSCR_LABEL_PATTERN.test(body);
    label_checks.push({
      check: "dscr_standard_terms_label",
      passed: ok,
      detail: ok
        ? "standard-terms label present"
        : "draft uses a DSCR figure without the 'standard SBA terms' label",
    });
  }

  const passed = unmatched.length === 0 && label_checks.every((c) => c.passed);
  return { passed, extracted, unmatched, label_checks };
}
