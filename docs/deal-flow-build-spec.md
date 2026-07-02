# AcquiFlow — Build Spec: Nightly Deal-Flow Ingestion → Buy-Box Match → Scored Shortlist Digest

**Commit this file to the repo (e.g. `docs/deal-flow-build-spec.md`) and have Claude Code read it in full before every session on this feature.**

---

## 0. The objective and why it matters

AcquiFlow is currently a one-time scoring tool. An ETA buyer searches 6–18 months, scores a backlog of deals, buys one, and cancels. The natural state of the business is subscribe → binge → churn.

This feature converts that into recurring value. New listings flow into each user's own search (via marketplace saved-search alerts they set up); AcquiFlow scores each one through its existing underwriting engine, matches it against the user's buy-box, and delivers a ranked shortlist — to an in-app Deal Flow inbox and a digest email. The buyer now has a reason to open AcquiFlow every morning for their entire search. This is a retention/monetization feature first and a scoring feature second. The scoring already works; the point is the recurring loop.

**AcquiFlow does not scrape marketplaces and does not centrally source or redistribute listings.** Listings arrive because the user opted into the platforms' own alert emails and routed them to AcquiFlow. See §2A for the sourcing model and the no-setup-wall onboarding.

---

## 1. What already exists — REUSE, do not rebuild

The server-side scoring pipeline is already proven in **`app/api/bulk-import/route.ts`**. Trace it and reuse it. Do not reinvent scoring, and do NOT wire in the browser-side `computeModalScore`.

| Concern | Existing asset to reuse |
|---|---|
| Deterministic 5-axis scoring | `scoreDeal(...)` — `lib/scoringEngine` |
| SDE normalization (persists correctly) | `normalizeDealFinancials(...)` + `buildNormalizationPayload(...)` — `lib/normalizationIntegration` |
| Deal classification | `applyDealClassification(dealId)` — `lib/dealClassifier` |
| Score explanation bullets | `generateScoreExplanation(...)` — `lib/scoreExplanation` |
| RMA benchmark fetch (server, no HTTP hop) | `fetchBenchmarksForIndustry(...)` pattern in bulk-import; queries `rma_benchmarks` directly |
| Valuation multiple / size band (server) | `loadBenchmarkData`, `getValuationMultiple`, `getSizeBand` — `lib/valuation-engine` |
| Industry text → key mapping | `INDUSTRY_MAP` + `getNaicsFromIndustry` — `lib/industryMappings` |
| Dedup | `fingerprint` + `source_platform`/`source_listing_id` checks (as in bulk-import) |
| Cron auth + service-role client + structured JSON extraction w/ safe coercion | `app/api/cron/ingest-signals/route.ts` (`CRON_SECRET`, `safeInt`/`safeStr`/`safeArr`, `stop_sequences`) |
| Persisted provenance fields on `deal_runs` | `confidence_score`, `data_source_type`, `import_batch_id`, `raw_data`, `benchmark_source`, normalization payload |

**The single most important reuse rule:** ingest listings through the **bulk-import scoring path**, which writes the normalization payload correctly. Do NOT route new ingestion through `/api/record-deal` — its server-side normalization write is known-broken (all normalization columns null since launch; this is the deferred "Patch E"). Building on bulk-import means the deal-flow feature ships trustworthy normalization from day one.

---

## 2. The one honesty flag that must be visible to the user

The bulk-import route scores each listing at **assumed standard SBA terms** (`debt_percent: 80`, `interest_rate: 10.5`, `term_years: 10`). That means the DSCR shown on any ingested listing is **derived from assumed financing, not the buyer's actual structure.**

Therefore:
- Every DSCR surfaced in the inbox and email must be labeled as computed at standard terms (e.g. "DSCR 1.42x at 80% / 10.5% / 10yr — your terms may differ").
- Preferably, let the buy-box carry the user's own assumed terms, and score matches against those, so the DSCR floor is matched against the buyer's real structure.
- Never present a derived DSCR as if it were the buyer's confirmed coverage. (No fake precision / honest provenance.)

---

## 2A. Sourcing model & onboarding — no setup wall

Two paths. The low-friction one is always available first, so setup never blocks adoption.

**Path 1 — Zero-setup on-ramp (paste / batch).** The user pastes a raw listing (or a batch of them) they're already viewing; AcquiFlow extracts the fields (LLM extraction with safe coercion, mirroring the ingest-signals pattern), scores and normalizes via the bulk-import pipeline, and returns an instant read. No account plumbing, no connection, nothing to configure. This is the on-ramp everyone can use in the first minute, and it is also the manual fallback for any marketplace whose alerts are weak.

**Path 2 — Autopilot (per-user connected deal flow).** Offered *after* the user has seen Path 1's value, never at signup. Mechanics, chosen specifically to minimize friction:
- **Dedicated forwarding address, NOT OAuth.** Each user gets a unique inbound address (e.g. `deals-x7f2@inbound.acquiflow.com`). Do NOT implement a "Connect your Gmail/Outlook" OAuth flow as the default path — inbox-read OAuth is a high-trust ask, hurts conversion, and triggers costly restricted-scope verification. Inbound parsing uses the email provider's inbound-parse webhook (e.g. Postmark/SendGrid/Mailgun).
- **One-time setup, two variants the wizard must handle:** (a) sites that let alerts go to any address → the user pastes their AcquiFlow address into the alert-email field; (b) sites that only mail the account's own address → the user creates one forwarding rule in Gmail/Outlook. The wizard gives click-by-click instructions per email provider for variant (b).
- **Shrink the saved-search chore.** AcquiFlow already has the user's buy-box, so the wizard translates it into the exact search settings to use on each marketplace and deep-links the saved-search page. It cannot create the search for the user (no API/scraping), but it turns a fumbling 15-minute task into a guided ~2-minute one.

**Legal posture (confirm specifics; not legal advice).** Path 2 is defensible because it is self-sourced and private: the *user* opted into the *marketplace's own* alert system and routed it to AcquiFlow, which scores it for that same user. This is distinct from — and must never drift into — (a) scraping a marketplace, or (b) centrally ingesting listings and redisplaying them to the broader user base (redistribution). Keep ingestion per-user and private.

**Honest expectation to set in-product:** marketplace saved-search alerts are known to be incomplete (buyers report a meaningful share of alerted listings never appear in daily summaries or on-site search). The autopilot is a strong backbone, not a guarantee of total coverage; Path 1 covers the gaps.

---

## 3. Non-negotiable doctrine — violating any of these fails the task

1. **No fake precision / honest provenance.** Every number in a listing, score, or email is sourced. If a listing lacks SDE/earnings, flag it or reject it (bulk-import already logs to `import_rejections` with a reason) — never infer or fabricate a figure. Carry `confidence_score`, `data_source_type`, `benchmark_source`, and normalization confidence through to the email.
2. **Architect first, then STOP.** Do the Stage 0 audit + plan, then stop for explicit approval before writing implementation code. No exceptions.
3. **Never run SQL. Never run migrations.** Produce migration SQL as a reviewable `.sql` file. Steve runs all SQL manually. **No rolling-window date logic in any delete or destructive query** — scope by `import_batch_id` or fixed dates. (Note: the existing ingest-signals cron uses rolling-window deletes; do NOT copy that pattern for anything destructive here.)
4. **Two-parallel-systems firewall** (`TWO-PARALLEL-SYSTEMS-REFERENCE.md`). Do NOT feed `financial_score`, `tension_indicator`, or any legacy aggregate/prose field into the CP pipeline, and do NOT merge `deal_runs`, `benchmark_snapshots`, `evaluation_snapshots`. If the design seems to need CP, raise it as a question — do not decide it.
5. **Engine runs with no HTTP/browser context** (API-Contract Principle 1). The scoring reuse must be callable from a cron job. bulk-import already proves this; keep it that way.
6. **Idempotent ingestion and idempotent send.** A listing is never scored twice (fingerprint / source_listing_id dedup) and a match is never emailed twice (track `emailed_at`).
7. **No LLM in the scoring hot path.** Scoring and ranking are deterministic. If any generated one-liner appears in the email, it passes a no-fabrication check: no number may appear in prose that isn't already a computed field. Use Haiku 4.5 only, if at all.
8. **Sourcing is provider-based, per-user, and legally clean.** Build a swappable `ListingSource` provider interface (same pattern as the SBA checker's `OwnerCompProvider`). The first concrete implementation is **per-user inbound email** (§2A): the user opts into a marketplace's own saved-search alerts and routes them to AcquiFlow via a dedicated forwarding address; AcquiFlow parses and scores them privately for that user. Do NOT build a scraper against any marketplace's Terms of Service, and do NOT centrally ingest a third-party aggregator's feed for redistribution to the user base — both are redistribution/ToS risks. CSV/bulk-import and manual paste remain secondary implementations of the same interface.
9. **Value-first: setup is never a gate.** The product must deliver value with zero connection setup (the paste/batch path, §2A). The connected autopilot is an upgrade offered *after* the first value moment, never a wall at signup. Any onboarding step must be reachable but skippable; a new user can score a deal in the first minute without configuring anything.

---

## 4. Stage 0 — Audit and plan (do this, then STOP)

Read the repo and answer in writing before proposing any code:

- **A. Confirm the reuse map** in §1 against the actual code. Confirm `scoreDeal` + `normalizeDealFinancials` (bulk-import path) is the canonical server-side scoring path and that `record-deal` is the broken one to avoid. Note any drift from this spec.
- **B. Data-model gaps.** Propose migration SQL (as a `.sql` file) for: a `buy_boxes` table (user_id, industries[], revenue band, sde band, geography [states[] and/or metro + radius], dscr_floor, max_multiple, owner_operated_pref, assumed financing terms, frequency, active flag); a `deal_flow_matches` inbox table (user_id, deal_run_id, buy_box_id, match_rank, match_reasons jsonb, status ∈ new|interested|dismissed, created_at, emailed_at); and any digest-send log needed for idempotent email. Reuse existing columns; do not duplicate.
- **C. Email infrastructure.** Detect the current email provider and env vars. If none exists, propose one and list env vars Steve must set. Include CAN-SPAM: unsubscribe link, frequency preference, sender identity/physical address.
- **D. Sourcing.** Define the `ListingSource` interface. Confirm the first concrete implementation is **per-user inbound email** (§2A) via a dedicated forwarding address + inbound-parse webhook — NOT OAuth, NOT a scraper, NOT central aggregation. Detect whether an inbound-email-capable provider is already configured; if not, propose one and list the env vars. Confirm the paste/batch on-ramp (§2A Path 1, and the quick win below) reuses the same extraction + scoring path.
- **E. Staged plan** with a deploy + verify gate after each stage, starting with the quick win.

Output Stage 0 as a short written plan, then STOP and wait for approval.

---

## 5. Proposed staging (refine in Stage 0; build only after approval)

- **Stage 0.5 — Quick win: paste/batch scoring (ship first, independent).** Upgrade the deal-admin uploader (and expose a user-facing version) so a raw listing blob — or several pasted at once — is auto-extracted into fields and scored through the bulk-import pipeline, instead of hand-mapping. This is §2A Path 1: it delivers immediate time savings and is the zero-setup on-ramp. It has no dependency on the buy-box, matching, or email work, so it ships before the rest and starts returning value on day one. Deploy gate.
- **Stage 1 — Buy-box.** `buy_boxes` table + a Deal Flow settings surface matching the existing dark dashboard UI (nav: Home / Dashboard / My Deals / Compare / Financial Benchmarks / Tax Assumptions / Market Intel). Let the user set assumed financing terms here (feeds §2). Deploy gate.
- **Stage 2 — Per-user inbound ingestion.** Provision a dedicated forwarding address per user + an inbound-parse endpoint (§2A Path 2). Each inbound listing email is parsed into fields, run through the **bulk-import scoring pipeline** (scoreDeal → normalize → classify → persist to `deal_runs` with full provenance + `import_batch_id`, tagged with the owning `user_id`), idempotent via fingerprint / `source_listing_id`. Include the onboarding wizard (buy-box → per-site search settings + deep links + per-provider forwarding instructions). No OAuth, no scraper, no central aggregation. Deploy gate.
- **Stage 3 — Matching + inbox.** Match newly-scored `deal_runs` against active buy-boxes, rank, write `deal_flow_matches`, expose an in-app Deal Flow inbox (new/interested/dismissed, one-click "open full analysis" into the existing deal view). Deploy gate.
- **Stage 4 — Digest email.** Per-user ranked shortlist email on a nightly Vercel Cron; unsubscribe + frequency prefs; idempotent send (`emailed_at`); DSCR labeled per §2; caveats and sample sizes intact. Deploy gate.

---

## 6. Definition of done

A new user can score a pasted listing in the first minute with zero setup (Stage 0.5). A user who opts into autopilot defines a buy-box (including assumed financing terms) and completes a one-time, guided, no-OAuth inbox setup. Thereafter, listings from their own opted-in marketplace alerts are parsed and scored by the same engine the live app uses, with normalization persisted correctly, privately for that user. Matches appear in their in-app inbox and in one ranked email with honest, sourced numbers, DSCR labeled as derived-at-assumed-terms, and sample-size/confidence caveats intact. Nothing is scored or emailed twice. No SQL was run by Claude Code. No scraper, no OAuth inbox-read flow, and no central aggregation/redistribution was built.
