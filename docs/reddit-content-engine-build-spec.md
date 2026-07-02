Read docs/reddit-content-engine-build-spec.md in full, plus the docs it references
(CLAUDE.md, TWO-PARALLEL-SYSTEMS-REFERENCE.md, DB-SCHEMA-REFERENCE.md). Then trace
app/api/bulk-import/route.ts, app/api/cron/ingest-signals/route.ts, the community_signals
table, and the deal_runs source/provenance fields (data_source_type, tool_used,
source_platform).

Do ONLY Stage 0 (audit + plan) from the spec. In your written plan, specifically confirm:
 - the exact eligibility predicate that separates PUBLIC-MARKETPLACE deals from
   confidential/client deals in deal_runs — and confirm the pipeline fails CLOSED
   (treats a deal as ineligible) whenever the distinction is unclear (§2.1);
 - the anonymization rules and the re-identification check, including what combinations
   force suppression or composite mode (§2.2);
 - that generation never fabricates a figure: single-deal drafts round/range real values,
   composites are labeled as patterns, every number traces to a real computed field (§2.3);
 - that the tool NEVER posts to Reddit or schedules a publish — it ends at a staged draft
   for Steve (§2.4);
 - the surface is owner-gated internal only, never exposed to product users (§3.5);
 - where Steve's voice corpus (his top posts) will live, since templates must be seeded
   from real examples, not an invented voice (§5B).

Produce the written plan and the content_drafts migration .sql for my review, then STOP
for approval. Do not write implementation code, do not run any SQL, do not build any
Reddit posting/scheduling integration, and do not generate templates until the voice
corpus is provided.
