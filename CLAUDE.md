# CLAUDE.md

Ambient context for Claude Code. Read this first, every session.

## What this repo is
AcquiFlow + NexTax.AI — SMB acquisition intelligence. **AcquiFlow** is a pre-LOI deal-scoring / underwriting product; **NexTax.AI** is the parent advisory brand. Stack: Next.js 15.5 (App Router) + TypeScript, deployed on Vercel Pro, backed by Supabase (project `sgrosezedxunoicmglpj`) and the Anthropic API.

## Repo conventions
- Path alias `@/` → repo root. Library code in `lib/`, components in `components/`, routes in `app/`.
- Server code talks to Supabase directly with the service-role client. Don't add an HTTP round-trip where a direct query works — see `app/api/bulk-import/route.ts` and `app/api/cron/ingest-signals/route.ts` for the pattern.
- Env vars in use: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`. Never hardcode secrets; never print them.

## How to work here (default operating procedure)
1. **Architect first, then STOP.** For any non-trivial change, propose the structure/plan and wait for explicit approval before writing implementation code. Lock decisions before coding.
2. **Staged delivery with gates.** Build in deployable increments; stop at each deploy/verify gate.
3. **Read before building.** Read the relevant `/docs` reference (below) and trace the real code before proposing. Reuse existing engines; don't reinvent.
4. For large change sets, deliver complete files, not scattered fragments; strictly sequence or merge patches that touch the same file.

## Non-negotiable doctrine
These override convenience. Violating any of them is a failed change.

- **No fake precision / honest provenance.** Every number is sourced. Never fabricate a figure or turn uncertainty into false certainty. Flag assumptions explicitly; carry provenance/confidence fields end to end. If data is missing, say so or reject it — never infer silently.
- **Never run SQL. Never run migrations.** Produce SQL/migrations as reviewable `.sql` files for a human to run, and flag every SQL operation. **No rolling-window date logic in any delete or destructive query** — scope by fixed dates or a batch id. (A rolling window once deleted production deal data.)
- **Two-parallel-systems firewall.** The legacy benchmark engine (`benchmark_snapshots`; produces `financial_score` + prose `tension_indicator`) and the CP pipeline (`evaluation_snapshots`; categorical, no score, no prose) are separate by constitution. NEVER feed `financial_score`, `tension_indicator`, `risk_flag_count`, or any aggregate/prose field into CP inputs or outputs. NEVER merge `deal_runs`, `benchmark_snapshots`, `evaluation_snapshots`. Feed CP raw inputs only; let it compute independently. Do NOT start engine reconciliation without explicit sign-off. See `docs/TWO-PARALLEL-SYSTEMS-REFERENCE.md`.
- **Engine stays transport-ignorant.** Scoring/engine code must run with no HTTP/browser/React context (must work from a cron or CLI). HTTP concerns live in the route layer. See `docs/API-CONTRACT-PRINCIPLES.md`.
- **API layer transports truth, doesn't reshape it.** No collapsing categoricals into traffic lights, no invented aggregate/health scores, no auto-hiding caveats or "pending" states. See `docs/API-CONTRACT-PRINCIPLES.md`.

## Known traps (don't get bitten)
- **`record-deal` server-side normalization is broken (Patch E).** Its normalization columns write null. For anything needing normalization server-side, use the **bulk-import** path (`scoreDeal` from `lib/scoringEngine` + `normalizeDealFinancials`/`buildNormalizationPayload` from `lib/normalizationIntegration`), which persists correctly.
- **Two unreconciled scoring systems** run on the same deals (see firewall). CP currently runs shadow-mode on sparse inputs; that is an accepted v1 baseline, not a bug to fix reactively.
- **PDF generation:** Vercel function logs filtered by `[committee-diag]` are authoritative for failures. `stop_reason: "max_tokens"` = truncation, not a timeout.

## Model routing (Anthropic API)
- `claude-haiku-4-5` — dashboard surfaces and interpretive one-liners.
- `claude-sonnet-4-6` — PDF generation, exported reports, exec summaries, negotiation posture, Investment Memo prose.
- Keep LLMs out of deterministic scoring hot paths. Any generated prose containing a number must pass a no-fabrication check: the number must already exist as a computed field.

## User-facing copy (product UI, emails, onboarding)
- Institutional, never promotional. Plain and honest over hype.
- In tax surfaces, forbidden language: "tax savings," "best structure," "recommended," "better/worse," "winner." Approved framing: "tax shield preview," "basis recovery," "estimated deduction effect."
- Em dashes: fine in headers, bullets, and outlines; remove them from paragraph prose.

## Reference docs (read the relevant one before working in that area)
In `/docs`:
- `TWO-PARALLEL-SYSTEMS-REFERENCE.md` — the two scoring systems + firewall.
- `API-CONTRACT-PRINCIPLES.md` — route-layer governance.
- `DB-SCHEMA-REFERENCE.md` — core table shapes (`deal_runs`, `benchmark_snapshots`, `evaluation_snapshots`) and the verify SQL to confirm them.
- Feature build specs (e.g. `deal-flow-build-spec.md`) — read the relevant one in full before touching that feature; each carries its own staged plan and gates.
- (Plus the underwriting + UI constitutions if committed.)

## Operational limits for Claude Code specifically
- Do not execute database migrations or any destructive DB command. Output SQL as a file for Steve to run.
- Do not deploy or push to production without explicit approval.
- Do not build web scrapers against ToS-restricted sites, and do not build OAuth inbox-read flows, without explicit approval.
- When uncertain, ask. A wrong assumption baked into several files costs more than a question.
