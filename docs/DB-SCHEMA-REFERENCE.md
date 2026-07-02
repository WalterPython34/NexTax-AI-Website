AcquiFlow — Database Schema Reference
Purpose: Quick reference for the three core tables, so sessions don't reconstruct table shapes from memory. Drop this in the project folder.
Supabase project ref: sgrosezedxunoicmglpj
Owner user_id: fd51b1c2-d682-4278-8b58-6abad29a2a07
Last assembled: 2026-05-22
CONFIDENCE LEGEND:

✅ CONFIRMED — dumped directly via information_schema.columns
👁️ OBSERVED — seen in real query results / route code this session, but not a full schema dump
🔎 INFERRED — deduced from reads/writes; verify before relying on for writes

To upgrade any 👁️/🔎 section to ✅, run the verification SQL at the bottom and replace the section.

1. benchmark_snapshots — ✅ CONFIRMED (full information_schema dump)
The legacy benchmark engine's output. Written by /api/benchmarks/score-deal. One row per score run (is_saved=false), flipped to is_saved=true by the snapshots save endpoint.
columntypenullablesnapshot_iduuidNOdeal_iduuidNOuser_iduuidNOcreated_attimestamptzNOindustrytextYESnaics_codetextYESrevenue_bandtextYESview_typetextNOis_savedbooleanNOfinancial_inputsjsonbNOcomputed_ratiosjsonbNObenchmark_resultsjsonbNOanalysis_outputsjsonbNOdeal_structurejsonbYESclient_run_idtextYESgenerated_attimestamptzYES
JSONB structures (from a real HVAC row):

financial_inputs (raw, 🟢 CP-safe): sde, cash, cogs, revenue, industry, inventory, total_debt, loan_term_years, accounts_payable, interest_rate_pct, operating_expenses, accounts_receivable, _deal_structure_inputs{ sde, seller_note, senior_debt, buyer_equity, purchase_price, annual_debt_service, working_capital_needed }
computed_ratios (flattened value-or-null, 🟢 CP-safe): dscr, current_ratio, debt_to_equity, sde_margin_pct, solvency_ratio, gross_margin_pct, inventory_turnover, annual_debt_service, operating_margin_pct, days_inventory_outstanding
benchmark_results (array of per-metric rows, 🟡 mostly evidence + some 🔴 conclusions): each has metric_key, metric_label, benchmark_source(rma|dealstats|null), deal_value, industry_q1, industry_median, industry_q3, raw_percentile, display_percentile, direction, status, status_color, outlier_kind, median_only, insufficient_data, reason
analysis_outputs (🔴 CONCLUSIONS — FIREWALLED from CP): financial_score, tension_indicator, score_drivers, score_risk_dependencies, risk_flags[], strengths[], interaction_insights[], sensitivity{ normalized_sde, normalized_dscr, reported_sde, reported_dscr, ... }, unsupported_metrics[], generated_at
deal_structure (🟡): flags[], metrics[]{ key,label,value,status,display,explanation,status_color }, sources_uses{ purchase_price, buyer_equity, senior_debt, seller_note, working_capital_needed, total_uses, total_sources, balanced }, interpretation[]

⚠️ CONSTITUTIONAL FIREWALL: the CP enrichment bridge reads ONLY computed_ratios + financial_inputs. It must NEVER read analysis_outputs or benchmark_results (those carry financial_score, tension_indicator, percentiles, normalized_sde — aggregate scores + prose forbidden in CP). See TWO-PARALLEL-SYSTEMS-REFERENCE.md.

2. deal_runs — 👁️ OBSERVED (not a full dump)
Source of truth for a saved deal. Inserted by /api/record-deal (stores finished, client-computed values; the route does no scoring). Keyed id. Fires exactly once per deal — no re-save exists.
Columns seen this session (NOT exhaustive):
columntype (observed)notesiduuidPK; = deal_id everywhere elseuser_iduuidownerindustrytexte.g. "hvac", "dental", "landscaping", "saas", "restaurant"revenuenumericsdenumericasking_pricenumericdebt_percentnumericused to derive total_debt for CPinterest_ratenumericterm_yearsnumericcustomer_concentrationnumeric→ maps to CP top_customer_pctcreated_attimestamptzfingerprinttext?dedup key (record-deal re-fetches inserted by it)
Also believed present (from route code / reports route, 🔎 INFERRED): scoring/verdict fields written at save — overall_score, dscr, fair_value, risk_level, red_flags, green_flags, evidence_profile, normalization fields, normalization_trust_score (seen null on minimal deals). Run the verify SQL to get the authoritative list.
Adapter mapping (mapDealRunRowToRuleInputs in map-live-inputs.ts): industry→industry_key, revenue, sde, asking_price→purchase_price, customer_concentration→top_customer_pct, asking_price×debt_percent/100→total_debt, sde/revenue×100→sde_margin_pct. CP derives its OWN dscr (never mapped).

3. evaluation_snapshots — 🔎 INFERRED (shape from reads/writes, not dumped)
CP pipeline output (shadow mode). Append-only, content-addressed via canonical hash. Written by the CP-9 writer (cp9_insert_snapshot_bundle RPC) via runCpPipelineAndPersist. Read by /api/deals/[id]/summary.
Known fields (from writer args + summary reads):
fieldnotessnapshot_iduuid, PKdeal_iduuid → deal_runs.iduser_iduuid (owner gate uses this)created_attimestamptzevaluation_iduuid (= deal_id for root snapshots)triggered_byuuid (NOT text — passing a string like "backfill" fails; use a real uuid)raw_input_payloadjsonb (carries _cp_enrichment_benchmark_snapshot_id, _source, _backfill markers)(bundle columns)the CP snapshot bundle — readiness, impact_ranking, structural_trajectories, stalled_paths, material_changes, provenance
The summary route returns (this is the consumed shape, the authoritative read contract):
data: {
  deal_id, snapshot_id, material_changes,
  impact_ranking: { critical_count, high_count, moderate_count, low_count,
    ranked_items[]{ item_kind, item_id, item_label, rank, impact_classification,
      impact_dimensions{ affects_binding_constraint, affects_closest_path,
        affected_personality_count, blocks_comfort_condition_count,
        is_on_critical_fragility_node, days_open }, provenance },
    workflow_groups, provenance },
  stalled_paths: { stalled_path_count, stalled_paths[], provenance },
  structural_trajectories: { worsening_count, improving_count,
    persistent_stable_count, intermittent_count, emerging_count,
    resolved_count, trajectories[], provenance },
  readiness: { snapshot_id, classification, missing_evidence_count,
    blocking_structural_concern_count, interested_personality_count,
    cautious_personality_count, declined_personality_count,
    contributing_factors[]{ axis_or_dimension, state, band }, provenance }
}
manifest_id, generated_at
Error envelope: { success:false, error_kind, reason }.
classification ∈ { decision_ready, decision_ready_with_caveats, evidence_insufficient, structurally_blocked, all_paths_declined }.
NO financial_score, NO prose anywhere — categorical only (constitutional).

Key relationships

deal_runs.id === benchmark_snapshots.deal_id === evaluation_snapshots.deal_id === evaluation_snapshots.evaluation_id (root). One deal can have MANY benchmark_snapshots (one per score run) and MANY evaluation_snapshots (shadow write + backfills).
Two parallel systems on the same deal_id, disjoint inputs — see TWO-PARALLEL-SYSTEMS-REFERENCE.md.


Verification SQL (run in Supabase to upgrade 👁️/🔎 → ✅)
sql-- deal_runs full schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'deal_runs'
ORDER BY ordinal_position;

-- evaluation_snapshots full schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'evaluation_snapshots'
ORDER BY ordinal_position;
Paste the results back and the 👁️/🔎 sections can be replaced with ✅ confirmed dumps.
