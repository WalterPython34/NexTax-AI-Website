# AcquiFlow — Two Parallel Scoring Systems: Comprehensive Reference

**Document status:** Active known-issue / deferred-integration reference
**Created:** 2026-05-21
**Audience:** Any future Claude instance or engineer picking up AcquiFlow platform-convergence work
**Prerequisite reading:** None. This document is self-contained by design.
**Related:** `CONSTITUTION-AND-HANDOFF.md` (the CP engine constitution + integration history). This document expands the "TWO PARALLEL SNAPSHOT SYSTEMS" finding recorded there.

---

## 0. TL;DR (read this first)

AcquiFlow currently runs **two completely separate scoring/snapshot systems on the same deals**. They were built at different times, for different purposes, and **they do not share inputs, storage, or output semantics**. They have never been reconciled.

1. **Legacy benchmark engine** — the user-facing production system. Rich inputs (Financial benchmarks tab, DealStats data). Produces an **aggregate `financial_score` (0–100)** and **prose** (`tension_indicator`). Stored in `benchmark_snapshots`. Gates PDF report pages 6–8.

2. **CP pipeline (CP-2→CP-10)** — the constitutional intelligence engine. Currently runs in **shadow mode** on **sparse inputs only** (whatever the `/api/record-deal` body carries). Produces **categorical, no-score, no-prose** institutional output. Stored in `evaluation_snapshots`. Read via `/api/deals/[id]/summary`.

**The critical facts:**
- A single deal can have a row in BOTH tables, keyed by the same `deal_id`, with **disjoint inputs and incompatible output vocabularies**.
- The rich data (benchmarks tab) flows ONLY to the legacy system. CP never sees it.
- The legacy system produces exactly what CP's constitution **forbids** (aggregate score + prose). **These must never be wired into CP.**
- Connecting CP to the rich input path is **substantial integration work**, not a tweak, and it overlaps with the deliberately-deferred "engine reconciliation" decision.

**Current posture:** This is a KNOWN, ACCEPTED state for v1 shadow mode. It is recorded as a deferred item to fix later — NOT a bug to fix reactively. Do not start fixing this without an explicit decision to take on the reconciliation work.

---

## 1. Why two systems exist (history)

AcquiFlow's user-facing scoring was built first and entirely client-side:
- A user opens the Analyze modal and enters deal data.
- `computeModalScore()` runs **in the browser** (`app/buyer-dashboard/page.tsx`).
- SDE normalization runs via `normalizeDealFinancials()` (`lib/normalizationEngine.ts` / `lib/normalizationIntegration`).
- The finished, fully-computed results are POSTed to `/api/record-deal`, which inserts them into `deal_runs`. The route does **no scoring** — it stores finished values.
- Separately, the **Financial benchmarks tab** lets the user pull real DealStats benchmark data and "save snapshot," which writes to `benchmark_snapshots` via a `snapshots` / `score-deal` endpoint path.

The **CP pipeline (CP-2 through CP-10)** was built much later, in isolation, as a constitutionally-governed intelligence engine (deterministic, categorical, no aggregate scores, no prose, no LLM in the hot path). It was fully built and unit-tested but **had never executed in production** until 2026-05-14, when it was wired into `/api/record-deal` in **shadow mode** (Phase 0).

Because CP was attached at `/api/record-deal` — which only ever received the sparse finished-deal body — CP inherited only the sparse inputs. The rich benchmark-tab data was already flowing down a *different* pipe (the legacy `benchmark_snapshots` path) and CP was never connected to that pipe.

Hence: two systems, same deals, different inputs, never reconciled.

---

## 2. System 1 — Legacy benchmark engine (user-facing, rich input)

### 2.1 What feeds it
- **`computeModalScore()`** — client-side scoring in `app/buyer-dashboard/page.tsx`. The canonical user-facing score.
- **Financial benchmarks tab** — pulls real DealStats benchmark multiples (`dealstats_benchmarks` table, `size_band IS NULL` for the all-sizes aggregate) and comparable transactions (`dealstats_transactions`).
- **`/api/benchmarks?industry=X`** — returns RMA margin data used during scoring.
- **`score-deal` endpoint** — produces the benchmark snapshot when the user saves from the benchmarks tab.

### 2.2 Where it stores
- **`deal_runs`** — the finished computed deal (overall_score, dscr, fair_value, risk_level, red_flags, green_flags, evidence_profile, normalization fields, etc.). Inserted by `/api/record-deal`.
- **`benchmark_snapshots`** — the rich benchmark analysis. Keyed by `deal_id` + `user_id`.

### 2.3 What it produces (verified output shape, 2026-05-21)
A real `benchmark_snapshots` row for HVAC deal `d501dbb3-40f7-4511-9c3c-d1e0b8315386`:
```json
{
  "snapshot_id": "bc2e777b-99e9-48b4-aa43-f15e5eba50a6",
  "deal_id": "d501dbb3-40f7-4511-9c3c-d1e0b8315386",
  "industry": "hvac",
  "revenue_band": "1M-2.5M",
  "view_type": "buyer_adjusted",
  "is_saved": true,
  "financial_score": 95,
  "tension_indicator": "Mixed signals: cash-flow strength is dependent on elevated SDE. Further diligence required.",
  "risk_flag_count": 2,
  "interaction_insight_count": 1
}
```

**Note the two constitutionally-significant fields:**
- `financial_score: 95` — an **AGGREGATE NUMERIC SCORE** (0–100).
- `tension_indicator: "..."` — free **PROSE**.

### 2.4 What it gates
- **PDF report pages 6–8** (`/api/reports/[dealId]`). When a `benchmark_snapshots` row exists, the report renders pages 6–8 (page 8 additionally gates on committee-memo prose generation succeeding). When absent, the report renders 5 pages. (This is why minimal deals print 5 pages — see the separate PDF open item.)

---

## 3. System 2 — CP pipeline (shadow mode, sparse input)

### 3.1 What feeds it
- **`/api/record-deal` shadow write ONLY.** After the `deal_runs` insert succeeds, an awaited, isolated, never-throwing block fires:
  - `mapRecordDealBodyToRuleInputs(body)` (`lib/intelligence/orchestrator/map-live-inputs.ts`) → CP `RuleEngineInputs`
  - `runCpPipelineAndPersist(...)` (`lib/intelligence/orchestrator/run-cp-pipeline.ts`) → runs CP-2→CP-8 + buildSnapshot + writeSnapshot
- The adapter consumes ONLY: industry, revenue, sde, asking_price, top_customer_pct, and the debt terms (debt_percent, interest_rate, term_years). It derives `total_debt` and lets CP compute its own DSCR. It **omits** `ebitda_margin_pct` (no numeric benchmark margin available in the record-deal route) and omits all Category-3 fields (prior-year trajectory, addbacks, balance-sheet ratios) the modal doesn't collect.

### 3.2 Where it stores
- **`evaluation_snapshots`** — the CP snapshot bundle (append-only, content-addressed via canonical hash). Written by the CP-9 `cp9_insert_snapshot_bundle` RPC.

### 3.3 What it produces (verified output shape, 2026-05-21)
CP output is **categorical, count-based, no aggregate scores, no prose**. Real summary for deal `21f96863`:
- `readiness.classification`: e.g. `structurally_blocked` (one of: decision_ready, decision_ready_with_caveats, evidence_insufficient, structurally_blocked, all_paths_declined)
- `readiness.contributing_factors`: named axis/dimension + state + band (e.g. durability_score / dominant_constraint / moderate)
- `impact_ranking`: critical/high/moderate/low **counts** + ranked items (positional rank only, NOT a score) with boolean/count impact dimensions
- `structural_trajectories`: worsening/improving/emerging/etc. counts
- `material_changes`: null for a root snapshot
- Every primitive carries `provenance` (computed_at, operations_version, threshold_manifest_id, derived_from_snapshot_ids)

There is **no `financial_score`** and **no prose** anywhere in CP output. This is constitutionally mandated (see §5).

### 3.4 What it gates
- Currently **nothing user-facing.** Shadow mode. Read only via `/api/deals/[id]/summary` (auth: Bearer token from localStorage → verified user → ownership gate). The eventual dashboard presentation (integration step 5) will consume this.

---

## 4. The collision — same deal, two systems, disjoint inputs

**Verified 2026-05-21:** HVAC deal `d501dbb3-40f7-4511-9c3c-d1e0b8315386` has:
- a `benchmark_snapshots` row: `financial_score: 95` + prose tension indicator (from the Financial benchmarks tab)
- an `evaluation_snapshots` row: `structurally_blocked`, durability constraint, categorical ranked items (from the sparse record-deal shadow write)

Same `deal_id`. Two systems. **The benchmark-tab richness went to system 1; CP (system 2) never saw it.**

### 4.1 Observable symptom that exposed this
Across 5 shadow deals (hvac, saas, dental, restaurant), CP reads differentiated **only at the industry-fingerprint level (CP-2)**, not at the deal-financial level:
- **dental** (`571d5761`) → operator-dependency flagged #1, personas 2i/0c/2d (polarized) — dental fingerprint emphasizes owner-dependence
- **restaurant** (`5d784c8b`) → `evidence_insufficient` (not blocked), 3 cautious personas — different fingerprint
- **hvac** (`d501dbb3`) and **saas** (`b35eda8d`) → **near-identical** reads (durability/moderate, 2i/1c/1d, 0C/2H/3M/4L)

HVAC and SaaS are radically different risk profiles (labor/seasonal vs. recurring-revenue/high-margin). They should NOT read identically. They did — because the only thing differentiating CP's inputs was the fingerprint, and their benchmark-multiple bands are similar enough that the fingerprints didn't diverge much. **The deal-specific financial nuance that would separate them lives in the benchmark data, which never reached CP.**

Critically: the **dental deal had the Financial benchmarks tab filled out**, yet its CP read was still fingerprint-driven, not benchmark-driven. The benchmark data went to `benchmark_snapshots`, not to CP. This is the clean proof that the two systems don't share inputs.

---

## 5. The constitutional firewall (DO NOT CROSS)

This is the most important section for a future instance. **The two systems are not just unconnected — they are constitutionally incompatible at the output level, and connecting them naively would violate the CP constitution.**

The legacy system produces:
- `financial_score: 95` — an **aggregate numeric score**
- `tension_indicator: "..."` — **prose**

The CP constitution (see CONSTITUTION-AND-HANDOFF.md, Invariant #4 and the prose prohibition) **forbids both**:
- **Invariant #4 — No Aggregate Scores.** CP produces categorical classifications and single-dimension counts ONLY. No overall/health/quality/composite/weighted/blended numeric scores. `financial_score` is precisely the kind of artifact CP exists to NOT produce.
- **Prose prohibition.** CP produces no narrative/summary/message/description prose artifacts in its hashable institutional output. `tension_indicator` is precisely such prose.
- The CP-10 boundary suite enforces these at build time (banned-field patterns, permitted-field allowlists). It will literally fail the build if a prose/score field name enters a CP type.

**THEREFORE, the following are HARD PROHIBITIONS:**
1. **NEVER** feed `financial_score`, `tension_indicator`, `risk_flag_count`, or any legacy aggregate/prose field into a CP input (RuleEngineInputs) or CP output (any snapshot artifact).
2. **NEVER** "enrich" CP by importing the legacy benchmark conclusions. CP must compute its OWN reads from RAW inputs.
3. **NEVER** merge the two snapshot tables or blend their outputs into a single score/view.
4. If you find yourself wanting to "just pass the financial_score into CP for context" — STOP. That is the violation. CP's value is that it does NOT do aggregate scoring; importing one defeats the entire constitutional design.

What IS permitted: feeding CP the **same RAW inputs** the legacy system started from (raw financials, raw benchmark *multiples* as reference data for CP-3's own rules), so CP can compute independently. The distinction is RAW INPUTS (allowed) vs. CONCLUSIONS (forbidden).

---

## 6. Why connecting them is deferred (and what it would actually take)

"Make the rich benchmark data reach CP" sounds like an adapter tweak. **It is not.** Here's the real shape of the work:

### 6.1 The rich data flows through a different pipe
The benchmark-tab data flows: Financial benchmarks tab → `score-deal` / `snapshots` endpoint → `benchmark_snapshots`. It does NOT pass through `/api/record-deal` (where the CP shadow write lives). So CP can't see it from where it's currently attached.

### 6.2 Options for connecting (each non-trivial)
- **Option A — widen the record-deal body.** Make the modal POST the benchmark-tab fields (raw multiples, RMA margin, etc.) to `/api/record-deal` so the adapter can map them. Requires client changes to the modal/save flow + confirming which raw (non-conclusion) fields are safe to pass. Medium effort.
- **Option B — attach a second CP shadow write to the benchmark-snapshot path.** Fire CP from the `score-deal`/`snapshots` endpoint too, with the richer inputs available there. Requires finding/instrumenting that endpoint + ensuring the same deal_id keys both systems consistently. Medium-high effort.
- **Option C — full reconciliation.** Decide which engine is canonical, unify the input path, and resolve what happens when the two disagree on the same deal. This is the big one (see §6.3).

### 6.3 The reconciliation question (the real deferred decision)
The moment CP runs on the same rich inputs as the legacy engine, the two will produce reads for the same deal that **may disagree** (legacy says financial_score 95 / "looks strong"; CP might say structurally_blocked). Then someone must decide:
- Which engine is the source of truth for the user-facing product?
- Does the user see legacy output, CP output, or both?
- Do they need to agree? What does disagreement mean?
- Is `computeModalScore` eventually replaced by CP, or do they coexist permanently?

This is a **product + architecture decision**, deliberately deferred. The shadow-mode design exists precisely so this decision can be made from OBSERVED divergence between the engines, not predicted at a whiteboard. (Same philosophy as "CP-11 emerges from observed operational behavior.")

**DO NOT make this decision unilaterally or start the reconciliation work without Steve's explicit sign-off.** It is the single biggest architectural commitment remaining on the platform.

---

## 7. Current accepted state (v1 baseline)

This is all FINE for now, by deliberate decision:
- CP runs in shadow mode on sparse inputs.
- CP differentiates by fingerprint (industry), not yet by deal-specific financials.
- The legacy system remains canonical and user-facing.
- `computeModalScore` stays the user-facing score.
- The two systems coexist, unreconciled, on the same deals.
- This generates real institutional telemetry to observe how CP behaves on real deals.

"CP on sparse inputs, differentiating by fingerprint" is a **valid v1 baseline**, not a defect. The goal of Phase 0 was reliable snapshot generation, which is achieved.

---

## 8. Explicit DO / DON'T for the next session

**DO:**
- Treat the two systems as separate layers with separate purposes.
- Keep CP reading from raw inputs and computing independently.
- If asked to enrich CP inputs, first re-read §5 and §6, then surface the reconciliation question to Steve before building.
- Record any new divergence observations between the systems as telemetry.
- Keep `computeModalScore` and the legacy benchmark engine untouched and canonical unless Steve explicitly decides to reconcile.

**DON'T:**
- DON'T wire `financial_score`, `tension_indicator`, or any legacy aggregate/prose field into CP. (Constitutional violation.)
- DON'T merge the two snapshot tables or blend outputs.
- DON'T treat "make benchmark data reach CP" as a quick adapter fix — it's substantial integration overlapping reconciliation.
- DON'T start reconciliation work without explicit sign-off.
- DON'T conflate this with the separate legacy-PDF-page-6–8 issue (that's about `benchmark_snapshots` existence gating report rendering — related to system 1, but a different problem).
- DON'T assume HVAC≈SaaS sameness is a CP bug — it's the input-starvation symptom described in §4.1.

---

## 9. Key identifiers reference (for grepping the codebase)

| Concern | Identifier |
|---|---|
| Legacy snapshot table | `benchmark_snapshots` |
| CP snapshot table | `evaluation_snapshots` |
| Legacy save endpoints | `score-deal`, `snapshots` (POST), Financial benchmarks tab |
| CP shadow write location | `/api/record-deal` (after deal_runs insert) |
| CP adapter | `lib/intelligence/orchestrator/map-live-inputs.ts` |
| CP orchestrator | `lib/intelligence/orchestrator/run-cp-pipeline.ts` |
| CP read route | `/api/deals/[id]/summary` |
| Client scoring | `computeModalScore()` in `app/buyer-dashboard/page.tsx` |
| Normalization | `normalizeDealFinancials()` in `lib/normalizationEngine.ts` |
| Benchmark data tables | `dealstats_benchmarks` (size_band IS NULL = all-sizes), `dealstats_transactions` |
| Forbidden-in-CP fields | `financial_score`, `tension_indicator`, `risk_flag_count`, any aggregate/prose |
| Verified collision deal | `d501dbb3-40f7-4511-9c3c-d1e0b8315386` (HVAC, has rows in BOTH tables) |
| Benchmarks-filled deal | `571d5761-a2d0-4ac0-9518-871234553f23` (dental — benchmark data went to legacy, not CP) |

---

## 10. One-paragraph summary for a future Claude

AcquiFlow runs two unreconciled scoring systems on the same deals: a legacy user-facing benchmark engine (rich inputs via the Financial benchmarks tab; produces an aggregate `financial_score` and prose `tension_indicator`; stored in `benchmark_snapshots`; gates PDF pages 6–8) and the constitutional CP pipeline (currently shadow mode on sparse `/api/record-deal` inputs; produces categorical no-score no-prose output; stored in `evaluation_snapshots`; read via `/api/deals/[id]/summary`). The rich data reaches only the legacy system, so CP currently differentiates deals only by industry fingerprint, not deal-specific financials — that's why different-risk deals like HVAC and SaaS can read identically. This is an accepted v1 baseline, not a bug. Connecting CP to the rich inputs is substantial integration that overlaps the deliberately-deferred engine-reconciliation decision, and must NOT be done by importing the legacy aggregate/prose fields (that would violate CP Invariant #4 and the prose prohibition). Feed CP raw inputs only; let it compute independently; surface the reconciliation question to Steve before building anything that connects the two.
