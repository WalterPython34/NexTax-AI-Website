# Reddit Content Engine — Stage 0: Audit + Plan

**Status:** Stage 0 approved by Steve 2026-07-02; Stage 1 built (see amendment in §2.2 and answers in §7). No SQL executed, no templates generated.

> **Stage 1 amendment (Steve, 2026-07-02):** k-anonymity is *necessary but not sufficient* — the k computed over our eligible pool is only a proxy for the true re-identification universe (all public listings), so it may only FORBID single-deal mode, never unlock disclosure. The real protections are suppression and composite mode. Accordingly, §2.2 below is amended: **geography (state, city, zip) is suppressed in EVERY mode**, not gated on k. Implemented in `lib/contentEngine/` (Stage 1).

> **Stage 1 gate closed (2026-07-02).** Steve ran the migration and the verify SQL. The distribution confirmed: `('marketplace_import','marketplace_supply')` always appear together with a named platform (1,327 rows across BizBuySell / BusinessBroker.net / BizScout / Empire Flippers / Flippa / Other); record-deal rows all show `('reality_check'|'risk_analyzer', 'user_submitted', null)`; no ambiguous shape exists. One predicate amendment resulted: 1,115 marketplace rows carry the OWNER's user_id (dashboard backfill; verified — no other user_id appears on any marketplace row), so the `user_id IS NULL` belt became **`user_id IS NULL OR user_id = OWNER_USER_ID`** (predicate v2026-07-02.2). Any other user_id remains ineligible.

> **Stage 3 delivered (2026-07-02):** owner-gated surface on the non-guessable path **`/content-engine-x7q4k9`** (API under `/api/content-engine-x7q4k9/*`). Every route runs the verified-Bearer + owner-id gate (401/403 server-side; the path obscurity is defense-in-depth only). Shared `lib/contentEngine/pipeline.ts` drives both the generate route and the dry-run script. Review workflow: candidates (ranked by metrics prior, suppressed deals never shown) → generate → edit → save re-verifies (a staged draft that stops verifying reverts to draft) → stage (blocked until the numeric check passes) → approve → discard / record-manual-post (`posted_url` bookkeeping only). No post/schedule action exists anywhere; terminal states are immutable; no DELETE. Gate: deploy + Steve verifies 403 for a non-owner login and walks the staged-draft workflow.

> **Stage 2 delivered (2026-07-02):** `templates.ts` (seeded verbatim from the voice corpus, weighted by the metrics prior), `generate.ts` (claude-sonnet-4-6; prompt receives ONLY fact-sheet displays + qualifiers), `verify.ts` (deterministic no-fabrication check; strict — incidental numerals fail; composite-label + DSCR-label enforcement), and `scripts/content-engine-dry-run.ts` (end-to-end against real eligible deals; insert-only). Gate: Steve runs the dry run and reviews sample drafts + numeric-check audit trails.
**Companion migration file (for Steve to review and run manually):** `scripts/migrations/2026-07-02_content_drafts.sql`
**Date:** 2026-07-02

---

## 0. What was audited

Read in full: `docs/reddit-content-engine-build-spec.md`, `CLAUDE.md`, `docs/TWO-PARALLEL-SYSTEMS-REFERENCE.md`, `docs/DB-SCHEMA-REFERENCE.md`, `docs/deal-flow-build-spec.md`, `docs/reddit-voice-corpus.md`, `docs/reddit-post-metrics.csv`, and the full text of `docs/reddit-posts-raw.pdf` (31 pages, all 12 distinct posts extracted and read).

Traced: `app/api/bulk-import/route.ts`, `app/api/cron/ingest-signals/route.ts`, `app/api/record-deal/route.ts`, `app/api/intelligence/route.ts`, `app/api/admin/backfill-cp-enrichment/route.ts`, the `community_signals` write/read paths, and every writer of `deal_runs` provenance fields.

---

## 1. Audit findings

### 1.1 Who writes `deal_runs`, and with what provenance

There are exactly two insert paths into `deal_runs` in the codebase:

| Writer | `tool_used` | `data_source_type` | `source_platform` | `user_id` | Other provenance |
|---|---|---|---|---|---|
| `app/api/bulk-import/route.ts:556` | `'marketplace_import'` (hardcoded) | `'marketplace_supply'` (hardcoded) | set from request (e.g. `'BizBuySell'`) | never set (NULL) | `source_url`, `source_listing_id`, `raw_data`, `import_batch_id`, `confidence_score` |
| `app/api/record-deal/route.ts:177` | from client body (`'risk_analyzer'`, `'reality_check'`) | **not set by the route** | never set | set (or `pending_email` + `is_anonymous`) | none of the marketplace fields |

`app/api/intelligence/route.ts:54` filters on `data_source_type === 'user_submitted'`, which implies user deals carry that value via a column default or backfill. I could not verify this without querying the DB (see §1.5). The eligibility predicate below does not depend on resolving this: it matches marketplace markers positively and treats everything else, including NULL and `'user_submitted'`, as ineligible.

### 1.2 `community_signals` (cron: `app/api/cron/ingest-signals/route.ts`)

Written by Task 1 of the cron: one web-search-sourced signal per run via `claude-sonnet-4-6`, inserted with `title, summary, source_platform, source_url, pain_category, signal_type, sentiment, industry, relevance_score, pain_intensity, buyer_intent, topics, ai_insight, content_opportunity, is_active, ingested_at, original_date`. Read by `/api/intelligence` (last 500 active).

Two facts matter for this engine:
- Every numeric field on a signal (`relevance_score`, `pain_intensity`, `buyer_intent`) is **LLM-estimated, not computed**. Signals may drive topic selection and news pegs; **no number from a signal may ever appear in a draft**.
- Signals are cleaned by a rolling-window delete in the same cron. The build spec's no-rolling-window rule applies to anything this engine adds; the content engine adds **no destructive queries at all**.

### 1.3 Existing surfaces and gating (finding relevant to §3.5)

- The only correctly owner-gated route in the repo is `app/api/admin/backfill-cp-enrichment/route.ts`: verified Bearer token via `supabaseAdmin.auth.getUser(token)`, then `user.id !== OWNER_USER_ID → 403` (owner: `fd51b1c2-d682-4278-8b58-6abad29a2a07`). This is the pattern the content engine will reuse.
- **Pre-existing risk, flagged, not fixed here:** the existing `app/admin/*` pages (`signals`, `import`, `dstats`, `isbenchmark`) have **no auth gate** in the page code, and `/api/intelligence` and `/api/bulk-import` accept unauthenticated requests while using the service-role client. The content engine will NOT copy that pattern (see §3.5). Whether to retrofit gates on the existing admin surfaces is a separate decision for Steve.

### 1.4 Field availability per topic (what a single-deal draft can honestly cover)

Marketplace-imported rows (the only eligible ones, per §2.1) carry: `revenue`, `sde`, `asking_price`, assumed debt terms (`debt_percent: 80, interest_rate: 10.5, term_years: 10`), `dscr`, `monthly_payment`, `valuation_multiple`, `fair_value`, `overall_score`, the full normalization payload (`reported_sde`, `usable_sde`, `normalization_trust_score`, `normalization_flags_json`, etc.), `city`, `state`, `employees`, `years_in_business`, `confidence_score`.

They do **not** carry: `customer_concentration`, `owner_operated`, `revenue_trend`, `recommended_offer_low/high` (those come only through record-deal), or any working-capital / earnout / balance-sheet fields.

Mapping the voice corpus §6 topic table onto that reality:

| Corpus topic | Single-deal draft possible? | Basis |
|---|---|---|
| SBA structure / DSCR at asking (TOP tier) | **Yes** | `dscr`, `monthly_payment`, debt terms — with the mandatory "at standard SBA terms (80% / 10.5% / 10yr)" label, since bulk-import DSCR is computed at assumed financing (same honesty flag as deal-flow spec §2) |
| Add-backs / SDE pressure-test (HIGH) | **Yes** | `reported_sde` vs `usable_sde`, `normalization_flags_json`, `normalization_trust_score` |
| Phantom SDE / replacement wage (HIGH) | **Yes** | owner-comp normalization adjustment inside the normalization payload |
| Pre-LOI DSCR haircut scenarios (HIGH) | **Yes, derived** | DSCR recomputed at 0.9×/0.8× `usable_sde` — derived deterministically in code, never by the LLM (see §2.3) |
| Asset vs stock / tax (HIGH) | Editorial/composite only | no structural tax fields exist; this is Steve's voice + illustrative math, labeled as such |
| Working capital (HIGH) | Composite/editorial only | no WC fields on eligible rows |
| Earnouts (MID-HIGH) | Composite/editorial only | no earnout/seller-note fields on eligible rows |
| Seller dependency (MID) | Composite/editorial only | `owner_operated` absent on marketplace rows |
| Customer concentration (LOWER) | Composite/editorial only | `customer_concentration` absent on marketplace rows |
| Timely SBA/policy peg (HIGH, ephemeral) | Signal-pegged | topic from `community_signals`; ALL factual claims about the rule change supplied/verified by Steve, deal math (if any) from computed fields |

This is an honest constraint, not a blocker: the corpus's native style already teaches with composite/illustrative examples framed as patterns (corpus §9), so topics without single-deal fields draft in composite mode.

### 1.5 Unverified assumptions + read-only verify SQL for Steve

Two things I could not confirm from code alone (no DB access, and I do not run SQL):

1. Whether `deal_runs.data_source_type` has a DB default (`'user_submitted'`?) and whether any historical rows were inserted by paths that no longer exist in the repo.
2. Whether RLS is enabled on `deal_runs` / `community_signals` (routes use the service-role key, which bypasses RLS either way).

Read-only verification SQL for Steve to run (results feed Stage 1; nothing blocks on it because the predicate fails closed):

```sql
-- Distribution of provenance markers across all deal_runs (read-only)
SELECT tool_used, data_source_type, source_platform,
       (user_id IS NULL) AS anon, COUNT(*) AS n
FROM deal_runs
GROUP BY 1, 2, 3, 4
ORDER BY n DESC;

-- Column default on data_source_type (read-only)
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'deal_runs' AND column_name = 'data_source_type';
```

---

## 2. Constitution compliance (the four hard requirements)

### §2.1 Eligibility: PUBLIC-MARKETPLACE deals only, fail CLOSED

A deal is eligible as draft fuel **only if every one of these holds**:

```
tool_used         = 'marketplace_import'
AND data_source_type = 'marketplace_supply'
AND source_platform IS NOT NULL
AND user_id IS NULL
AND pending_email IS NULL
AND is_valid = true
```

Rationale from the trace: `'marketplace_import'` + `'marketplace_supply'` are hardcoded, exclusively and jointly, by the bulk-import route (§1.1) — they are written together or not at all, so requiring **both** means a row must have come through the public-listing ingest path. `source_platform IS NOT NULL` additionally requires the row to name its public marketplace. `user_id IS NULL AND pending_email IS NULL` excludes anything a client or prospect ever touched, even if other fields were somehow mislabeled.

**Fail-closed guarantee:** the predicate is a conjunction of positive matches. NULL in any field, `'user_submitted'`, an unknown `tool_used`, a future writer that forgets to set provenance — all of these fail the match and the deal is **ineligible**. There is no "probably marketplace" heuristic, no fallback branch, and no human-override flag that widens eligibility. The predicate lives in one function in the engine library (§3.2), is evaluated server-side at candidate-selection time AND re-evaluated at draft-generation time, and the evaluated result is persisted on the draft row (`eligibility_snapshot`) so every draft carries proof of why its source deals were eligible. If the predicate cannot be evaluated (query error, missing column), generation aborts; it never degrades to a weaker check.

### §2.2 Anonymization rules + re-identification check

Even though eligible deals are public listings, a draft must never let a reader tie the post to a specific live listing (Steve moderates these subs; a teardown traceable to someone's active sale is a credibility and fairness problem). Rules, applied in code before the LLM sees anything:

**Always suppressed (never enter the fact sheet, under any mode):**
`source_url`, `source_listing_id`, `raw_data` (and any text from it), `city`, `zip_code`, business name or any free-text descriptor, `import_batch_id`, exact `created_at`.

**Always transformed:**
- `revenue`, `sde`, `asking_price`, `fair_value`, `monthly_payment`: rounded to 2 significant figures ("about $1.2M", "roughly $400K") or expressed as a range. Rounding happens server-side **before** the values reach the generation prompt, so the model cannot leak precision it never saw.
- `dscr`, `valuation_multiple`: rounded to 2 decimals / 1 decimal respectively.
- `employees`, `years_in_business`: banded ("a 10+ year-old business", "under 10 employees") or dropped.
- `state`: included only if the k-anonymity check passes (below); never city-level.

**Re-identification check (k-anonymity over the eligible pool):**
Before a single-deal draft is staged, the engine counts eligible `deal_runs` sharing the quasi-identifier tuple `(industry, state, revenue rounded to 2sf)`:
- `k ≥ 5`: state may be mentioned.
- `2 ≤ k < 5`: **state suppressed**; draft proceeds with industry + rounded figures only, and the check reruns on `(industry, revenue_2sf)` nationally.
- `k < 2` on the national tuple (the deal is unique even after rounding — e.g. rare industry, or an outlier size like the only $8M pharmacy in the pool): **single-deal mode is forced off**. The engine either switches to composite mode (fold the deal into a pattern across ≥3 eligible deals) or suppresses the candidate entirely. There is no owner override that re-enables single-deal mode below the threshold.

**Combinations that force suppression or composite regardless of k:** rare-industry + any geography; any extreme/outlier value that survives rounding as recognizable; `employees` + `years_in_business` + `state` together (never all three); any draft whose topic requires quoting listing text (never allowed).

The applied decisions (k values, suppressed fields, mode forced) are persisted on the draft (`anonymization` jsonb) for audit. Composite drafts must be labeled in-text as patterns ("across the deals I've scored", corpus §9) — that label is checked, not assumed (§2.3).

### §2.3 No fabricated figures — every number traces to a computed field

Mechanism, in order:

1. **Fact sheet, built by code.** For each draft the engine assembles a whitelist of numbers the post may contain: (a) the anonymized/rounded computed fields from §2.2, each carrying provenance `{deal_run_id, column, raw_value, transform}`; (b) deterministic derivations computed **server-side in plain code** (e.g. DSCR at a 20% SDE haircut, the $-difference between reported and usable SDE), each stored with its formula and inputs — **the LLM never does arithmetic**; (c) a static whitelist of the authority thresholds from the voice corpus (DSCR 1.15/1.25/1.5, concentration 15–20%/30%, 1–2 turns of EBITDA, SBA 80/10.5/10 assumed terms, etc.), which are editorial constants, not deal data.
2. **Generation is constrained to the fact sheet.** The prompt contains only fact-sheet values (already rounded) plus the template. It never sees raw `deal_runs` rows.
3. **Post-generation no-fabrication check, deterministic code.** Every numeric token in the generated draft is extracted and matched against the fact sheet + whitelist (tolerant of formatting: "$1.2M" ≡ 1200000, "1.4x" ≡ 1.4). Any unmatched number fails the draft: it is stored with `numeric_check_passed = false`, is visibly flagged in the review surface, and **cannot be moved to `staged` status**. This mirrors the CLAUDE.md rule: prose containing a number passes only if the number already exists as a computed field.
4. **Composite labeling is enforced the same way:** a draft in composite mode must contain an explicit pattern-framing phrase; the check verifies its presence before staging. Single-deal drafts must contain the DSCR standard-terms label whenever `dscr` appears.
5. **Signals contribute zero numbers.** For signal-pegged drafts, external factual claims (e.g. what an SBA rule change says) are entered/confirmed by Steve in the review surface; the engine drafts around placeholders it will not invent.

### §2.4 The tool NEVER posts to Reddit or schedules a publish

- **No Reddit API client, no OAuth to Reddit, no webhook, no cron, no scheduler** is built in any stage. The dependency does not enter `package.json`.
- The pipeline's terminal state is a **staged draft** in `content_drafts` (`status = 'staged'`) that Steve reads, edits, and copy-pastes himself.
- The status enum enforces this at the data layer: `draft → staged → approved/discarded`, plus a manual bookkeeping state `posted_manually` (+ `posted_url`, `posted_at`) that only Steve sets **after** he has posted by hand — it is a record, not an action. No code path transitions a draft to `posted_manually`, and there is no `scheduled_for` column anywhere.
- There is deliberately **no "publish", "schedule", or "queue" concept** in the schema, the library, or the UI. If a future request adds one, it is a new constitutional decision for Steve, not an increment.

---

## 3. Design

### 3.1 Data model — `content_drafts`

One new table (full reviewable SQL in `scripts/migrations/2026-07-02_content_drafts.sql`; **Steve runs it manually; I never execute SQL**). Shape summary:

- Identity/lifecycle: `id`, `created_at`, `updated_at`, `status` (checked enum per §2.4), `created_by`.
- Content: `title`, `body_md`, `target_subreddit` (default `'buyingabusiness'`, per the metrics prior), `mode` (`single_deal | composite | signal_peg`), `topic_key`, `template_key`, `model_used`.
- Provenance/compliance (all jsonb, per-draft audit trail): `source_deal_ids uuid[]`, `source_signal_ids uuid[]`, `eligibility_snapshot`, `anonymization`, `fact_sheet`, `numeric_check`, plus `numeric_check_passed boolean`.
- Manual bookkeeping only: `reviewed_at`, `posted_url`, `posted_at`.
- RLS enabled with **no policies** (deny-by-default): only the service-role client behind the owner-gated routes can touch it. No FK constraint into `deal_runs` (deals may be cleaned up independently; provenance ids are an audit trail, not a join dependency).

No existing table is altered. No destructive statements. No rolling-window logic anywhere in the file.

### 3.2 Pipeline shape (transport-ignorant, per API-Contract Principle 1)

All logic lives in `lib/contentEngine/` and runs with no HTTP/browser/React context (callable from a CLI or cron, though no cron is planned):

- `eligibility.ts` — the §2.1 predicate + candidate query (topic triggers from corpus §6 mapped to the computed fields in §1.4).
- `anonymize.ts` — §2.2 transforms + k-anonymity check.
- `factSheet.ts` — §2.3 fact-sheet assembly + deterministic derivations.
- `generate.ts` — template + fact sheet → Anthropic API call.
- `verify.ts` — the no-fabrication numeric check + composite/DSCR label checks.

Routes under `app/api/content/*` are thin transports: auth, invoke library, persist, return. They transport the engine's truth without reshaping it: caveats, `numeric_check_passed=false`, low `confidence_score`, and suppression decisions are surfaced verbatim in the review UI, never auto-hidden.

### 3.3 Model routing (per CLAUDE.md)

- Draft prose generation: `claude-sonnet-4-6` (exported/long-form prose class).
- Dashboard one-liners in the review surface (e.g. "why this deal triggered this topic"): `claude-haiku-4-5`, and subject to the same numeric check.
- No LLM anywhere in eligibility, anonymization, k-anonymity, derivation, or verification — those are deterministic.

### 3.4 Templates + metrics prior (Stage 2 — NOT generated now)

Confirmed source of truth: templates are seeded from `docs/reddit-voice-corpus.md` — the post anatomy in corpus §3 (hook → wrong mental model → sparing credibility line → plain-English promise → numbered bold sections each with a worked numeric example → authority thresholds → where-people-get-burned → bottom line → open-question CTA), the tone rules in corpus §4, and the performance-ranked hooks in corpus §5. The raw posts (`docs/reddit-posts-raw.pdf`, extracted and read in full) are the ground truth the corpus distills; **no voice is invented**.

`docs/reddit-post-metrics.csv` is encoded as a **pre-loaded prior** (a static config in the library, revisable when Steve exports fresh metrics):
- **Buyer-side framing by default** (`r/buyingabusiness`); seller-side only as a deliberate choice (the two seller-side posts did 1.5K/5.4K views vs 15–65K buyer-side).
- **Worked-numeric-example over listicle** (the one low-upvote post, 0.77, was the listicle without worked math) — structurally guaranteed anyway, since templates follow the corpus anatomy.
- **Topic selection weighted toward the top tier:** SBA loans/DSCR (66.4K), asset-vs-stock (23.4K), working capital (21.0K), timely SBA pegs (19.9K + 28.5K), earnouts (19.2K), then the high tier (phantom SDE 16.8K, pre-LOI checklist 16.0K, add-backs 12.3K, seller dependency 12.1K). Shares treated as the utility signal (corpus §2).
- CTA always the open-question + soft-help pattern from corpus §7; do-NOT list from corpus §8 baked into every template.

Per your instruction, **no template text is written in this stage**.

### 3.5 Surface: owner-gated, internal only

- All `app/api/content/*` routes use the proven owner gate from `app/api/admin/backfill-cp-enrichment/route.ts`: verified Bearer token → `supabaseAdmin.auth.getUser(token)` → `user.id === OWNER_USER_ID` or 403. Server-side, on every route, including reads.
- The review page (proposed: `app/admin/content-engine/`) calls only those gated routes and renders nothing without a 200. Unlike the existing ungated `/admin` pages (§1.3 finding), this surface is gated even if someone discovers the URL.
- Nothing content-engine-related is linked from, imported by, or reachable through any product surface (`buyer-dashboard` or otherwise). Product users never see drafts, candidates, or the existence of the feature. `content_drafts` has RLS-deny-by-default, so even a leaked anon key reads nothing.

---

## 4. Two-parallel-systems firewall statement

The content engine is a **read-only consumer of `deal_runs` (eligible rows) and `community_signals` (topic pegs only)**. It reads neither `benchmark_snapshots` nor `evaluation_snapshots`, writes nothing into any scoring path, feeds nothing into CP inputs or outputs, and does not merge or join the two snapshot systems. It is downstream editorial tooling on system-1 computed fields; the firewall is untouched. (Editorial use of legacy fields like `dscr`/`overall_score` in a Reddit draft is permitted — the prohibition is on feeding legacy conclusions *into CP*, which this engine never does.)

Tax framing per corpus §4: drafts speak in Steve's confident editorial tax voice; the product's hedged in-app tax language rules govern product surfaces, not these posts, and conversely no product tax output is laundered into public advice.

---

## 5. Staged delivery plan (each stage ends at a deploy/verify gate)

- **Stage 0 (this document): audit + plan + migration SQL. → STOP for approval.**
- **Stage 1 — Foundation.** Steve reviews and runs `2026-07-02_content_drafts.sql` manually; Steve runs the §1.5 verify SQL. I build `lib/contentEngine/eligibility.ts` + `anonymize.ts` + `factSheet.ts` with unit tests (predicate fail-closed cases, k-anonymity thresholds, rounding, derivation formulas). No routes, no UI, no LLM yet. **Gate: tests green + Steve confirms predicate results against the verify-SQL distribution.**
- **Stage 2 — Templates + generation + verification.** Template set seeded from the voice corpus (per §3.4) delivered for Steve's review as data, not prose I invent; `generate.ts` + `verify.ts`; end-to-end dry run producing draft rows with `numeric_check` populated, on real eligible deals. **Gate: Steve reads sample drafts + the numeric-check audit trail.**
- **Stage 3 — Owner-gated surface.** Gated `app/api/content/*` routes + the internal review page: candidate list (topic triggers ranked by the metrics prior), generate, edit, stage, discard, manual posted-bookkeeping. **Gate: deploy + Steve verifies gating (403 for non-owner) and the staged-draft workflow.**
- **End state:** the pipeline terminates at a staged draft for Steve. There is no Stage 4; posting/scheduling is permanently out of scope (§2.4).

---

## 6. Explicitly out of scope (all stages)

No Reddit posting or scheduling integration. No scraping. No OAuth flows. No SQL execution by Claude Code. No template generation before plan approval. No changes to scoring engines, snapshot tables, record-deal (Patch E stays deferred), or the ingest-signals cron. No exposure to product users. No engine-reconciliation work.

## 7. Open questions — ANSWERED (Steve, 2026-07-02)

1. **Admin gate retrofit: YES, as a separate task.** The ungated `/admin` pages and `/api/bulk-import` (service-role client behind unauthenticated routes) are a real exposure, but the retrofit is scoped out of this build so it doesn't bloat it.
2. **k-threshold question is moot** — approach fixed instead of the number: k only forbids (see the Stage 1 amendment at the top); geography is suppressed in every mode, so there is no k-gated disclosure to tune.
3. **Non-guessable path: YES.** Server-side owner gating is the real control; the Stage 3 surface additionally lives on a non-guessable path as free defense-in-depth.
