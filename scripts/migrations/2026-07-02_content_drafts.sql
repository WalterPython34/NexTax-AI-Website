-- ============================================================================
-- Migration: content_drafts (Reddit Content Engine, Stage 1 foundation)
-- Date:      2026-07-02
-- Author:    Claude Code (Stage 0 deliverable) — TO BE REVIEWED AND RUN
--            MANUALLY BY STEVE. Claude Code never executes SQL.
--
-- FLAGGED SQL OPERATIONS IN THIS FILE (review each):
--   [1] CREATE TABLE public.content_drafts        (additive — new table only)
--   [2] CREATE INDEX x2 on content_drafts         (additive)
--   [3] ALTER TABLE ... ENABLE ROW LEVEL SECURITY (restrictive — deny-by-default;
--       no policies are created, so ONLY the service-role key can read/write.
--       This is intentional: the surface is owner-gated internal only.)
--   [4] CREATE TRIGGER for updated_at             (additive, this table only)
--
-- NO destructive statements. NO ALTER of any existing table. NO deletes.
-- NO rolling-window date logic (none anywhere in this file).
--
-- Constitutional notes encoded in the schema:
--   - status enum has NO 'scheduled' or automated 'posted' state. The pipeline
--     terminates at 'staged'. 'posted_manually' is bookkeeping Steve sets by
--     hand AFTER posting himself; no code path performs a publish.
--   - eligibility_snapshot / anonymization / fact_sheet / numeric_check persist
--     the compliance audit trail per draft (§2.1–§2.3 of the Stage 0 plan).
--   - source_deal_ids has no FK into deal_runs on purpose: it is an audit
--     trail, not a join dependency; deal cleanup must never cascade here.
-- ============================================================================

-- [1] Table
CREATE TABLE public.content_drafts (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid,                 -- owner user id (auth.users.id)

  -- Lifecycle. Terminal automated state is 'staged'. 'approved' / 'discarded'
  -- / 'posted_manually' are set only by Steve in the review surface.
  status               text        NOT NULL DEFAULT 'draft'
                       CHECK (status IN
                         ('draft','staged','approved','discarded','posted_manually')),

  -- Content
  mode                 text        NOT NULL
                       CHECK (mode IN ('single_deal','composite','signal_peg')),
  topic_key            text        NOT NULL,      -- e.g. 'sba_dscr', 'addbacks', 'phantom_sde'
  template_key         text,                      -- Stage 2 template id (null until templates exist)
  target_subreddit     text        NOT NULL DEFAULT 'buyingabusiness',
  title                text,
  body_md              text,
  model_used           text,                      -- e.g. 'claude-sonnet-4-6'

  -- Provenance + compliance audit trail (all populated by lib/contentEngine)
  source_deal_ids      uuid[]      NOT NULL DEFAULT '{}',  -- eligible deal_runs.id used as fuel
  source_signal_ids    uuid[]      NOT NULL DEFAULT '{}',  -- community_signals.id (topic pegs only; never numbers)
  eligibility_snapshot jsonb,      -- §2.1 predicate evaluation per source deal, at generation time
  anonymization        jsonb,      -- §2.2 decisions: k values, suppressed fields, forced mode
  fact_sheet           jsonb,      -- §2.3 whitelisted numbers w/ provenance {deal_run_id, column, raw, transform|formula}
  numeric_check        jsonb,      -- §2.3 verification result: extracted numbers, matches, failures
  numeric_check_passed boolean     NOT NULL DEFAULT false, -- draft cannot reach 'staged' while false

  -- Manual bookkeeping ONLY (set by Steve after he posts by hand; never by code)
  reviewed_at          timestamptz,
  posted_url           text,
  posted_at            timestamptz
);

COMMENT ON TABLE public.content_drafts IS
  'Reddit content engine staged drafts. Internal, owner-gated only. Pipeline terminates at status=staged; no automated posting or scheduling exists by constitution.';
COMMENT ON COLUMN public.content_drafts.numeric_check_passed IS
  'Deterministic no-fabrication check: every number in body_md matched the fact_sheet/whitelist. Application refuses to stage a draft while false.';
COMMENT ON COLUMN public.content_drafts.posted_url IS
  'Manual bookkeeping set by Steve after posting by hand. No code path posts to Reddit.';

-- [2] Indexes (review-surface list queries)
CREATE INDEX content_drafts_status_created_idx
  ON public.content_drafts (status, created_at DESC);
CREATE INDEX content_drafts_topic_idx
  ON public.content_drafts (topic_key);

-- [3] RLS: enabled with NO policies = deny-by-default for anon/authenticated
-- keys. Only the service-role client (behind the owner-gated /api/content/*
-- routes) can access this table. Product users can never read drafts.
ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;

-- [4] Keep updated_at fresh (scoped to this table only)
CREATE OR REPLACE FUNCTION public.content_drafts_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_drafts_updated_at
  BEFORE UPDATE ON public.content_drafts
  FOR EACH ROW EXECUTE FUNCTION public.content_drafts_set_updated_at();

-- ============================================================================
-- Post-run verification (read-only) — paste results back to upgrade the
-- schema reference:
--
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'content_drafts'
--   ORDER BY ordinal_position;
--
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'content_drafts';
-- ============================================================================
