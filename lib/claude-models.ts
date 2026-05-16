/**
 * Centralized Claude model identifiers.
 *
 * Update model strings here when Anthropic deprecates a model — every API route
 * imports from this file, so a single edit propagates everywhere.
 *
 * Current models (as of May 2026):
 * - SONNET: claude-sonnet-4-6        — balanced default, $3/$15 per MTok
 * - HAIKU:  claude-haiku-4-5         — fast/cheap, $1/$5 per MTok
 * - OPUS:   claude-opus-4-7          — flagship, $5/$25 per MTok
 *
 * Deprecation tracker: https://docs.claude.com/en/docs/about-claude/model-deprecations
 */

export const CLAUDE_MODELS = {
  SONNET: "claude-sonnet-4-6",
  HAIKU: "claude-haiku-4-5-20251001",
  OPUS: "claude-opus-4-7",
} as const;

// Anthropic API version — bump if Anthropic releases breaking API changes
export const ANTHROPIC_API_VERSION = "2023-06-01";
