# AcquiFlow → NexTax — Build Spec: The Two-Brand Handoff Funnel

**Commit to the repo (e.g. `docs/nextax-handoff-build-spec.md`) and have Claude Code read it in full before every session on this feature.**

---

## 0. The objective and why it matters

AcquiFlow and NexTax.AI currently read as two separate things. They are one staircase:

- **AcquiFlow** finds and evaluates the deal (pre-LOI scoring, benchmarking, underwriting).
- **NexTax.AI** structures, finances, and closes it (entity & tax structure, lender-ready package, lease economics, structured underwriting / broker-defense memo, capital plan, investor pitch deck).

This feature makes the staircase explicit in-app. When a scored deal produces a condition NexTax genuinely addresses — a deal that screens well and is about to move, or a real structural finding like an earnings-quality anomaly or a sub-screen DSCR at asking — the platform surfaces a personalized, evidence-cited handoff that maps the specific finding to the specific advisory service that resolves it. This converts a low/mid-ticket SaaS user into a warm, context-rich advisory lead **at the moment of highest intent** — the highest-margin revenue in the stack.

The mechanism only works if it is trusted. See §2. It is not a banner ad; it is a timed, earned escalation from "here's what we found" to "here's who fixes it."

---

## 1. What already exists — trigger on real computed outputs, REUSE

Do not invent new scoring to drive the handoff. Read what the deal already computed. Trace `app/api/bulk-import/route.ts`, the deal view, and the snapshot reads.

| Signal to trigger on | Where it lives |
|---|---|
| Overall score, risk level | `deal_runs.overall_score`, `risk_level` |
| DSCR (derived at assumed terms — see §2) | `deal_runs.dscr`, `monthly_payment` |
| Valuation vs fair value / offer range | `deal_runs.valuation_multiple`, `fair_value`, `recommended_offer_low/high` |
| Named findings | `deal_runs.red_flags[]`, `green_flags[]`, `score_explanation` |
| Earnings-quality / normalization findings | normalization payload: `normalization_trust_score`, `normalization_flags_json`, `usable_sde` vs `reported_sde`, `manual_review_required` |
| Confidence / provenance | `confidence_score`, `data_source_type`, `benchmark_is_proxy` |
| Benchmark position | market comps / closed comps (Compare tab), `benchmark_source` |
| Structural readiness (categorical) | CP summary read `/api/deals/[id]/summary` (`readiness.classification`, impact ranking) — read-only, do NOT reshape (firewall, §4) |
| Anonymous vs authenticated | `deal_runs.is_anonymous`, `pending_email` |

The raw material to say "here is exactly what we found on your deal" is already stored. The feature is a **rule layer that reads it and maps findings → the advisory service that resolves them.**

---

## 2. Honesty guardrails — this IS the conversion mechanism, not a constraint

An upsell engine that overstates a finding to sell a package destroys the credibility the upsell depends on. For this audience (CPAs, PE-minded buyers), the honest version converts better and is the only version that survives a second deal. These are hard requirements.

1. **A handoff may only cite findings that are actually computed and stored for that deal.** No invented flags, ever. The trigger DECISION is deterministic — a rule reads real fields. (No-fabrication kill-switch.)
2. **State findings in the platform's existing qualified language.** DSCR is derived at assumed standard terms (`80% / 10.5% / 10yr`), so say "estimated DSCR 1.08x at standard SBA terms, below the 1.25x screen lenders typically require — the deal may still work at a different price or structure." NEVER "unbankable." An inventory line flat across years is "reported at an identical value across N years, which often means it isn't actively tracked — worth verifying," NEVER "fraud" or a definitive anomaly verdict.
3. **No manufactured urgency.** No countdown timers, fake scarcity, or "act now." The intent is already real; don't fake it.
4. **Suppress on thin data.** If the deal was scored on low-confidence/sparse inputs (low `normalization_trust_score`, `benchmark_is_proxy`, `manual_review_required`), either suppress the anomaly-based handoff or lead with the confidence caveat. Never sell a $4k+ package off a shaky read.
5. **Respect the QoE boundary.** NexTax is UPSTREAM of QoE. A handoff may offer pre-LOI structured underwriting / broker-defense memo, but must NOT promise proof-of-cash, bank reconciliation, or tax-return-to-book reconciliation. Where a finding genuinely needs verification-grade work, route to the QoE partner lane (Josh / TAS, Ahmed / Rapid Diligence) — do not misrepresent NexTax as doing QoE.
6. **Copy generation is slot-filled, not free-form.** Templates carry the honest framing; real computed values fill the slots. If an LLM renders tone (Sonnet 4.6, prose tier), it may only phrase facts that already exist as computed fields — it never decides a flag exists and never introduces a number. Deterministic rule in, honest sentence out.
7. **Price is a quality signal, never an apology.** Lead with the value (build the broker-defense memo; structure a financeable offer). Show price with confidence; never discount or hedge it. Reframe deal economics, not price.

---

## 3. Finding → service mapping (proposed catalog — confirm current scope/prices in Stage 0)

The handoff maps a specific computed condition to a specific service. Confirm the live service catalog, tier names, prices, and exact deliverable scope in Stage 0 — do NOT hardcode prices that may be stale; treat the values below as Steve's stated anchors to verify.

| Trigger condition (computed) | Honest handoff framing | Mapped NexTax service | Tier (confirm) | QoE-boundary note |
|---|---|---|---|---|
| Scores well + financeable + clean | "Ready to structure this? Here's what NexTax handles next." | Entity & tax structure + lender-ready package | Tier 1–2 | Structuring, not verification |
| Est. DSCR below 1.25x screen at asking (assumed terms) | Sub-screen DSCR at asking; may clear at a different price/structure | Structured underwriting / offer restructuring | Tier 2 (~$4,495) | Models price/structure; not a lender commitment |
| Earnings-quality / add-back / inventory-tracking anomaly | Named finding, stated as "worth verifying," with working-capital/earnings implication | Pre-LOI deep analysis / broker-defense memo | Tier 2–3 | Upstream of QoE; if it needs bank rec → partner lane |
| Real estate / lease involved | Lease economics affects the deal materially | Lease review / lease economics | (confirm) | — |
| Customer concentration / owner-dependence flag | Transition/operational risk | Operations & transition planning | (confirm) | — |
| Needs outside capital / investor-backed | Capital plan + investor narrative | Capital plan + investor pitch deck | (confirm) | — |

**Anonymous vs authenticated branch:**
- **Anonymous run** → the handoff doubles as email capture: "We found [finding]. Enter your email to unlock the [service]." Creates a lead + `pending_email`.
- **Pro / authenticated** → direct to a booked consult or pre-filled intake (high-ticket advisory is a booked call, not an instant checkout; a productized mid-ticket deliverable like the broker-defense memo may be instant-purchase — confirm in Stage 0).

**Cross-brand visual:** the handoff is the moment the user steps from the AcquiFlow dark SaaS UI into the NexTax institutional brand (Spectral serif, forest green `#3d5443`, terracotta `#c98855`, cream). Use that shift deliberately to signal "you're entering advisory," reinforcing the staircase. Match the NexTax editorial brand, not the dark UI.

---

## 4. Non-negotiable doctrine

1. **No fake precision / honest provenance** — see §2; the whole feature lives or dies here.
2. **Architect first, then STOP** for approval before implementation code.
3. **Never run SQL / migrations.** Output reviewable `.sql`; Steve runs it. No rolling-window date logic in destructive queries.
4. **Two-parallel-systems firewall.** May READ the CP summary read (`readiness.classification`) to inform a trigger, but must NOT reshape it, must NOT feed `financial_score`/`tension_indicator`/aggregate/prose fields anywhere they don't belong, and must NOT merge snapshot tables. See `TWO-PARALLEL-SYSTEMS-REFERENCE.md`.
5. **Engine/rule layer runs with no HTTP/browser context** where it computes trigger decisions (API-Contract Principle 1).
6. **No LLM in the trigger-decision path.** The rule that decides whether a handoff fires and which service it maps to is deterministic. LLM (if used) only renders tone around already-true facts (§2.6).
7. **Idempotent / non-spammy.** A user is not shown the same handoff repeatedly on the same deal; suppress after dismiss; cap frequency. Track shown/clicked/dismissed.

---

## 5. Data model (propose migration `.sql` in Stage 0)

- **`advisory_leads`** (a.k.a. handoff events + lite CRM): `id`, `user_id` (nullable for anonymous), `deal_run_id`, `trigger_type`, `findings_cited` jsonb (the exact computed values shown — for auditability and a warm handoff), `service_mapped`, `tier`, `is_anonymous`, `pending_email`, `status` ∈ shown|clicked|email_captured|booked|won|lost|dismissed, `created_at`, `updated_at`.
- **Handoff rule config** — code-defined rule set (versioned), or a `handoff_rules` table if Steve wants to tune conditions without a deploy. Confirm preference in Stage 0.
- Reuse all deal computed fields; do not duplicate them into the lead row beyond the `findings_cited` snapshot needed for audit.

`findings_cited` is what makes the lead warm: it carries exactly what triggered the handoff, so the NexTax intake (and Steve) opens the lead already knowing the deal and the finding.

---

## 6. Stage 0 — Audit and plan (do this, then STOP)

- **A. Trigger inventory.** Enumerate which computed fields/flags in §1 are reliably populated on real deals (both anonymous and pro paths). Flag any that are frequently null (e.g., normalization on the record-deal path — Patch E) so triggers depend only on trustworthy signals; prefer the bulk-import-populated fields.
- **B. Service catalog.** Confirm the live NexTax services, tier names, current prices, exact deliverable scope, and the QoE boundary for each. Correct §3 to reality.
- **C. Lead routing.** Confirm the destination for a clicked handoff (booked-consult tool vs pre-filled intake vs instant-purchase for any productized deliverable) and the email/CRM plumbing available.
- **D. Rule model.** Propose the deterministic rule set (condition → service → tier → template) and whether it's code-defined or table-driven. Propose the `advisory_leads` migration `.sql`.
- **E. Staged plan** with a deploy + verify gate after each stage, quick win first.

Output the written plan + migration `.sql`, then STOP for approval.

---

## 7. Proposed staging (refine in Stage 0; build only after approval)

- **Stage 0.5 — Quick win: one honest handoff.** A single deterministic handoff on high-scoring, financeable, clean deals ("Ready to structure this? Here's what NexTax handles next."), with `advisory_leads` capture + routing to a booked consult. No anomaly logic yet. Validates the funnel and lands the lead-capture plumbing. Deploy gate.
- **Stage 1 — Lead model + capture + routing.** `advisory_leads` table, click/show/dismiss tracking, intake/booking routing, anonymous email-capture branch. Deploy gate.
- **Stage 2 — Deterministic rule engine.** Findings → service mapping (§3) with honest slot-filled templates and the §2 guardrails enforced (suppress-on-thin-data, QoE-boundary routing, qualified language). Deploy gate.
- **Stage 3 — Dynamic in-app triggers.** Surface the handoff in the deal view and on the post-run screen (anonymous and pro), styled as the NexTax cross-brand escalation. Frequency caps + dismiss handling. Deploy gate.
- **Stage 4 — Attribution + pipeline view.** Telemetry on which finding-types drive which conversions, and a simple leads pipeline surface for Steve. Deploy gate.

---

## 8. Definition of done

A scored deal that produces a real, trustworthy condition surfaces a handoff that names the actual computed finding in the platform's qualified language, maps it to the specific NexTax service that addresses it (respecting the QoE boundary), and captures a warm `advisory_lead` carrying the exact `findings_cited`. Anonymous runs capture email; pro runs route to a booked consult or intake. No handoff cites a finding that isn't computed and stored; none manufactures urgency, overstates a flag, or fires on thin data. No SQL was run by Claude Code. Price is presented as a quality signal, never discounted or hedged.
