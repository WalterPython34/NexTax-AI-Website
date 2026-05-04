# Snapshot Persistence — Integration Notes

## Files in this drop

**NEW**
- `migration_benchmark_snapshots.sql` — table, indexes, RLS policies
- `app/api/benchmarks/snapshots/route.ts` — GET (list) + POST (create) endpoints
- `app/api/benchmarks/snapshots/[id]/route.ts` — GET (detail) + PATCH (mark saved) endpoints

**REPLACE**
- `app/api/benchmarks/score-deal/route.ts` — auto-creates snapshot after analysis
- `components/FinancialBenchmarksTab.tsx` — Save Snapshot button + Past Analyses + reload

## Deploy order

1. **Run the SQL migration first.** Supabase SQL editor → paste `migration_benchmark_snapshots.sql` → Run. Creates table, indexes, and RLS policies.

2. **Verify the table:**
   ```sql
   select count(*) from benchmark_snapshots;        -- 0 rows expected
   select indexname from pg_indexes where tablename = 'benchmark_snapshots';
   -- should show 3 indexes: deal_idx, user_saved_idx, industry_date_idx
   ```

3. **Push the new files to GitHub** (in `lib/`, `app/api/benchmarks/`, `components/`).

4. **Update `app/buyer-dashboard/page.tsx`** — see edits below.

## Single edit in `app/buyer-dashboard/page.tsx`

Find where `<FinancialBenchmarksTab />` is rendered (around line 9355 in the version we worked with):

```typescript
{activeTab === "benchmarks" && (
  <FinancialBenchmarksTab
    deals={deals}
    isPro={isPro}
    onShowUpgrade={() => setShowUpgradeModal(true)}
  />
)}
```

Add the `userId` prop:

```typescript
{activeTab === "benchmarks" && (
  <FinancialBenchmarksTab
    deals={deals}
    isPro={isPro}
    userId={user?.id ?? null}
    onShowUpgrade={() => setShowUpgradeModal(true)}
  />
)}
```

(`user` is already in scope from your existing auth pattern at line ~8791.)

That's the only change to `page.tsx`.

## What the user experience looks like now

**On every Run Analysis:**
- Score-deal route creates a snapshot row (is_saved = false) automatically
- Response includes `snapshot_id` so the UI knows which snapshot to mark as saved later
- Past Analyses count increments by 1

**On Save Snapshot click:**
- PATCH to `/api/benchmarks/snapshots/{id}` flips `is_saved` to true
- Button text changes to "✓ Saved" and disables
- The Past Analyses list refreshes to show the saved badge

**On deal selection (and on first load):**
- UI fetches snapshot list for that deal
- If snapshots exist, automatically loads the most recent one (full detail)
- Inputs form rehydrates with prior values
- Analysis cards re-render with prior results
- "Last analyzed: [timestamp]" shows next to Run Analysis button

**Past Analyses section:**
- Collapsible, shows version count + saved count badge
- Each row: timestamp, score, tension/risk summary, saved/auto status
- Click any row to load that snapshot
- Currently-loaded snapshot is highlighted

## Analytics moat

Every snapshot writes:
- Raw inputs (financial_inputs JSONB)
- Computed ratios (computed_ratios JSONB, flat key→value)
- Per-metric benchmark rows (benchmark_results JSONB array)
- Full analysis output (analysis_outputs JSONB)
- Deal structure (deal_structure JSONB)
- `revenue_band` denormalized for cheap aggregate queries
- `industry`, `naics_code`, `view_type` for grouping

**Example analytics queries:**

```sql
-- Median DSCR across HVAC deals analyzed in the last 30 days
select percentile_cont(0.5) within group (
  order by (computed_ratios->>'dscr')::numeric
) as median_dscr
from benchmark_snapshots
where industry = 'hvac'
  and created_at > now() - interval '30 days'
  and (computed_ratios->>'dscr') is not null;

-- Distribution of validation outliers — what % of HVAC deals have inflated SDE?
select count(*) filter (where r->>'outlier_kind' = 'validation')::float
       / count(*)::float as validation_outlier_pct
from benchmark_snapshots,
     jsonb_array_elements(benchmark_results) r
where industry = 'hvac'
  and r->>'metric_key' = 'sde_margin_pct'
  and r->>'benchmark_source' = 'rma';

-- Saved snapshots by industry (signal of "interesting" deals)
select industry, count(*)
from benchmark_snapshots
where is_saved = true
group by industry
order by count(*) desc;
```

## Privacy boundary

- **User-facing reads:** all queries scoped by `user_id`. RLS policy enforces this for direct Supabase client reads.
- **Analytics queries (your moat):** can run without `user_id` filter for aggregates. None of the example queries above expose user identity.
- **Raw deal names / locations:** NOT stored in benchmark_snapshots. Industry + revenue_band only. Cross-referencing back to a specific deal still requires the deal_id (and that requires auth).

## Test plan after deploy

1. Open Financial Benchmarks tab, pick a saved deal, fill inputs, click Run Analysis
2. **Verify in Supabase:** `select * from benchmark_snapshots order by created_at desc limit 1` — should show the row with is_saved=false
3. Click "Save Snapshot" → button should change to "✓ Saved"
4. **Re-verify in Supabase:** the row's is_saved should be true
5. Click Run Analysis again with different inputs → second row appears, is_saved=false
6. Reload the page, navigate back to Financial Benchmarks → past analyses appear, latest one auto-loads
7. Click an older snapshot in the list → inputs and analysis rehydrate to that version
8. Pick a different deal → past analyses for that deal load (or empty if none)

## Edge cases handled

- **Anonymous test calls:** if `user_id` isn't passed (e.g. DevTools fetch without auth), the route returns the analysis but skips snapshot creation. Logged-in users always get snapshots.
- **Snapshot insert fails:** logged but doesn't block the analysis response. User gets their analysis; the persistence is best-effort.
- **Deal with no history:** UI shows blank inputs/analysis. No errors.
- **Reload latest snapshot fails:** falls back to blank state.

If you see any rough edges in actual usage, screenshot and I'll iterate.
