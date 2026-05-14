// lib/intelligence/operations/__boundary__/banned-imports.ts
// ─────────────────────────────────────────────────────────────────────────────
// CP-10 Constitutional Boundary — Banned Import Definitions
//
// This file enumerates every import that CP-10 modules MAY NOT use.
// It enforces Invariant #5 (Constitutional Boundary Enforcement),
// specifically Check 3 (No LLM or generative AI dependencies).
//
// THIS IS A CONSTITUTIONAL ARTIFACT. Modifications require:
//   1. Explicit governance review
//   2. PR template acknowledgment that no new semantic categories are
//      being smuggled in
//   3. Updated allowlist version stamping in operations_version
//
// Removing entries is always safe (it only tightens the constitution).
// Adding entries — i.e., un-banning something — requires the governance
// review described above.
//
// The enforcement scope is `lib/intelligence/operations/**` only. The
// rest of the platform may use LLMs (e.g., PDF generation), but CP-10
// modules may not.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exact package names that may NEVER appear in CP-10 imports.
 *
 * Matching is exact OR prefix-with-slash. So "openai" matches both
 * `import x from "openai"` and `import x from "openai/lib/foo"`.
 */
export const BANNED_EXACT_PACKAGES: ReadonlyArray<string> = [
  // Anthropic
  "@anthropic-ai/sdk",
  "@anthropic-ai/bedrock-sdk",
  "@anthropic-ai/vertex-sdk",
  "anthropic",

  // OpenAI
  "openai",
  "openai-edge",
  "@openai/api",
  "@azure/openai",

  // Google AI
  "@google/generative-ai",
  "@google-ai/generativelanguage",
  "@google-cloud/aiplatform",
  "@google-cloud/vertexai",

  // Other major providers
  "cohere-ai",
  "@cohere-ai/cohere",
  "replicate",
  "@huggingface/inference",
  "huggingface",

  // Local/edge inference
  "@xenova/transformers",
  "transformers",
  "ollama",
  "vllm",
  "@vllm/vllm",
  "llama-tokenizer-js",

  // LangChain ecosystem
  "langchain",
  "@langchain/core",
  "@langchain/anthropic",
  "@langchain/openai",
  "@langchain/community",
  "@langchain/google-genai",
  "llamaindex",
  "@llamaindex/core",

  // Vector / embedding / RAG infrastructure (CP-10 should not need this)
  "@pinecone-database/pinecone",
  "weaviate-ts-client",
  "chromadb",
  "@chroma-core/chroma",
  "@qdrant/js-client-rest",

  // Embedding libraries (no probability/similarity from CP-10)
  "ml-distance",
  "compute-cosine-similarity",
];

/**
 * Substring patterns banned in any import path. Catches anything that
 * slips past the exact match list. Case-insensitive.
 *
 * Be conservative here — substring matching can false-positive. Each
 * pattern below has been chosen because it strongly implies LLM/AI use
 * and is unlikely to appear in legitimate non-AI library names.
 */
export const BANNED_SUBSTRING_PATTERNS: ReadonlyArray<string> = [
  "openai",
  "anthropic",
  "/gpt-",
  "claude-api",
  "claude-sdk",
  "/llm-",
  "-llm/",
  "/llm/",
  "gemini",
  "mistral",
  "/inference-",
  "completions-",
  "/embeddings-",
  "generative-ai",
  "vertex-ai",
];

/**
 * Patterns that look LLM-related but are explicitly permitted.
 *
 * This carveout list exists so that legitimate utility libraries
 * (e.g., a tokenizer used for non-inference purposes) are not blocked
 * by substring matching. Every entry here requires governance review.
 *
 * As of CP-10 v0.1.0: empty. CP-10 has no need for any LLM-adjacent
 * library.
 */
export const BANNED_IMPORT_CARVEOUTS: ReadonlyArray<string> = [];

/**
 * Test whether a given import path is banned.
 *
 * Returns null if the import is permitted; returns a BannedImportMatch
 * with the rule that caught it if banned.
 */
export interface BannedImportMatch {
  readonly matched_rule: "exact" | "substring";
  readonly matched_pattern: string;
  readonly import_path: string;
}

export function checkImportPath(importPath: string): BannedImportMatch | null {
  // Carveouts win first
  for (const carveout of BANNED_IMPORT_CARVEOUTS) {
    if (importPath === carveout || importPath.startsWith(carveout + "/")) {
      return null;
    }
  }

  // Exact-match check
  for (const banned of BANNED_EXACT_PACKAGES) {
    if (importPath === banned || importPath.startsWith(banned + "/")) {
      return {
        matched_rule: "exact",
        matched_pattern: banned,
        import_path: importPath,
      };
    }
  }

  // Substring check — case insensitive
  const lower = importPath.toLowerCase();
  for (const pattern of BANNED_SUBSTRING_PATTERNS) {
    if (lower.includes(pattern.toLowerCase())) {
      return {
        matched_rule: "substring",
        matched_pattern: pattern,
        import_path: importPath,
      };
    }
  }

  return null;
}

/**
 * Banned-import allowlist version. Stamped onto every CP-10 artifact
 * via operations_version metadata. Increments when the allowlist itself
 * is modified.
 */
export const BANNED_IMPORTS_VERSION = "cp10-banned-imports-v0.1.0";
