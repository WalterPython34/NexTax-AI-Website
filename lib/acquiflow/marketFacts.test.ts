// lib/acquiflow/marketFacts.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Patch C — readMarketFacts unit tests.
//
// Run with: npx tsx lib/acquiflow/marketFacts.test.ts
//
// Verifies the three closed-comp tier outcomes (size-matched, national,
// unavailable) plus the honest-absence guarantee that NO synthetic values
// are produced when data is missing. Uses a hand-rolled mock Supabase
// client — no real DB needed.
// ─────────────────────────────────────────────────────────────────────────────
import { readMarketFacts, type MarketFacts } from "./marketFacts";

// ── Hand-rolled mock Supabase client ────────────────────────────────────────
// Records what was queried and returns canned responses per table.
type MockTable = Record<string, unknown[]>;
function makeMockSupabase(tables: MockTable) {
  const mkQuery = (rows: unknown[]) => {
    const q: any = {
      _rows: rows,
      _filters: [] as Array<[string, unknown]>,
      select() { return q; },
      eq(col: string, val: unknown) {
        q._rows = q._rows.filter((r: any) => r?.[col] === val);
        return q;
      },
      is(col: string, val: unknown) {
        q._rows = q._rows.filter((r: any) => (r?.[col] ?? null) === val);
        return q;
      },
      order() { return q; },
      single() {
        return Promise.resolve(q._rows.length === 1
          ? { data: q._rows[0], error: null }
          : { data: null, error: q._rows.length === 0 ? { message: "no rows" } : { message: "multiple rows" } });
      },
      then(onF: any, onR: any) {
        // Awaiting the query without .single() — returns the array
        return Promise.resolve({ data: q._rows, error: null }).then(onF, onR);
      },
    };
    return q;
  };
  return {
    from(table: string) {
      return mkQuery(tables[table] ?? []);
    },
  } as any;
}

// ── Test harness ────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const errors: string[] = [];
function T(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => { pass++; console.log(`  ✓ ${name}`); })
    .catch(e => { fail++; const m = e instanceof Error ? e.message : String(e); errors.push(`${name}: ${m}`); console.log(`  ✗ ${name}\n      ${m}`); });
}
function A(cond: boolean, msg = "assertion failed") { if (!cond) throw new Error(msg); }
function AE<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── Cases ───────────────────────────────────────────────────────────────────
async function run() {
  console.log("── Patch C: readMarketFacts ──");

  await T("size-matched (≥5 samples) → industry_size_matched basis with quantiles", async () => {
    const supabase = makeMockSupabase({
      dealstats_benchmarks: [
        { industry_key: "marketing", size_band: "1m_3m", sample_size: 25, median_mvic_to_sde: 2.16, p25_mvic_to_sde: 1.91, p75_mvic_to_sde: 2.82 },
        { industry_key: "marketing", size_band: null,    sample_size: 312, median_mvic_to_sde: 3.10, p25_mvic_to_sde: 2.20, p75_mvic_to_sde: 4.40 },
      ],
    });
    const facts: MarketFacts = await readMarketFacts(supabase, {
      industry: "marketing", revenue: 1_102_000, sde: 792_000, asking_price: 3_300_000, state: null,
    });
    AE(facts.closed_comp_basis, "industry_size_matched", "basis");
    AE(facts.closed_comp_median, 2.16, "median");
    AE(facts.closed_comp_p25, 1.91, "p25");
    AE(facts.closed_comp_p75, 2.82, "p75");
    AE(facts.closed_comp_sample_size, 25, "sample_size");
    AE(facts.deal_multiple, 4.17, "deal_multiple (3.3M/792K rounded to 2 dp)");
    AE(facts.deal_vs_closed_position, "above_p75", "above p75 since 4.17 > 2.82");
  });

  await T("size-band tier rejected (<5 samples) → falls through to national (≥10) basis", async () => {
    const supabase = makeMockSupabase({
      dealstats_benchmarks: [
        { industry_key: "marketing", size_band: "1m_3m", sample_size: 3, median_mvic_to_sde: 1.5, p25_mvic_to_sde: 1.0, p75_mvic_to_sde: 2.0 },   // below threshold
        { industry_key: "marketing", size_band: null,    sample_size: 50, median_mvic_to_sde: 3.0, p25_mvic_to_sde: 2.4, p75_mvic_to_sde: 3.8 },
      ],
    });
    const facts = await readMarketFacts(supabase, {
      industry: "marketing", revenue: 1_102_000, sde: 792_000, asking_price: 3_300_000, state: null,
    });
    AE(facts.closed_comp_basis, "industry_national", "should fall to national");
    AE(facts.closed_comp_median, 3.0, "median from national row");
    AE(facts.closed_comp_sample_size, 50, "sample_size from national row");
  });

  await T("no rows in dealstats_benchmarks → closed_comp_basis 'unavailable', all quantile fields null", async () => {
    const supabase = makeMockSupabase({ dealstats_benchmarks: [] });
    const facts = await readMarketFacts(supabase, {
      industry: "marketing", revenue: 1_102_000, sde: 792_000, asking_price: 3_300_000, state: null,
    });
    AE(facts.closed_comp_basis, "unavailable", "basis must be unavailable");
    AE(facts.closed_comp_median, null, "median null");
    AE(facts.closed_comp_p25, null, "p25 null");
    AE(facts.closed_comp_p75, null, "p75 null");
    AE(facts.closed_comp_sample_size, null, "sample_size null");
    AE(facts.deal_vs_closed_position, null, "position null when no benchmark");
    // Honest-absence GUARANTEE: deal_multiple is still computed (it's just asking/sde)
    AE(facts.deal_multiple, 4.17, "deal_multiple still computed from deal inputs");
  });

  await T("national tier exists but below ≥10 threshold → still unavailable (no fabrication)", async () => {
    const supabase = makeMockSupabase({
      dealstats_benchmarks: [
        { industry_key: "marketing", size_band: null, sample_size: 7, median_mvic_to_sde: 2.5, p25_mvic_to_sde: 1.8, p75_mvic_to_sde: 3.5 },
      ],
    });
    const facts = await readMarketFacts(supabase, {
      industry: "marketing", revenue: 1_102_000, sde: 792_000, asking_price: 3_300_000, state: null,
    });
    AE(facts.closed_comp_basis, "unavailable", "below national threshold → unavailable, NOT national");
    AE(facts.closed_comp_median, null, "median null");
  });

  await T("empty industry string → EMPTY_FACTS (no DB queries)", async () => {
    const supabase = makeMockSupabase({ dealstats_benchmarks: [] });
    const facts = await readMarketFacts(supabase, {
      industry: "", revenue: 1_102_000, sde: 792_000, asking_price: 3_300_000, state: null,
    });
    AE(facts.closed_comp_basis, "unavailable", "no industry → unavailable");
    AE(facts.deal_multiple, null, "no industry → no deal_multiple computed");
  });

  await T("null revenue → EMPTY_FACTS (size-band undefined without revenue)", async () => {
    const supabase = makeMockSupabase({ dealstats_benchmarks: [{ industry_key: "marketing", size_band: null, sample_size: 100, median_mvic_to_sde: 2.0 }] });
    const facts = await readMarketFacts(supabase, {
      industry: "marketing", revenue: null, sde: 792_000, asking_price: 3_300_000, state: null,
    });
    AE(facts.closed_comp_basis, "unavailable", "null revenue → unavailable");
  });

  await T("deal at p25 boundary → between_p25_median (NOT below_p25)", async () => {
    const supabase = makeMockSupabase({
      dealstats_benchmarks: [
        { industry_key: "marketing", size_band: "1m_3m", sample_size: 25, median_mvic_to_sde: 2.5, p25_mvic_to_sde: 2.0, p75_mvic_to_sde: 3.0 },
      ],
    });
    const facts = await readMarketFacts(supabase, {
      industry: "marketing", revenue: 1_102_000, sde: 1_000_000, asking_price: 2_000_000, state: null,
    });
    // deal_multiple = 2.0; p25 = 2.0 → not strictly below
    AE(facts.deal_vs_closed_position, "between_p25_median", "boundary case: p25=deal → between_p25_median");
  });

  await T("deal far above p75 → above_p75 (acceptance-test case from marketing screenshot)", async () => {
    const supabase = makeMockSupabase({
      dealstats_benchmarks: [
        { industry_key: "marketing", size_band: "1m_3m", sample_size: 25, median_mvic_to_sde: 2.16, p25_mvic_to_sde: 1.91, p75_mvic_to_sde: 2.82 },
      ],
    });
    const facts = await readMarketFacts(supabase, {
      industry: "marketing", revenue: 1_102_000, sde: 792_000, asking_price: 3_300_000, state: null,
    });
    AE(facts.deal_vs_closed_position, "above_p75", "matches Intel memo screenshot conclusion");
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log("\n── failed test details ──");
    errors.forEach(e => console.log("  " + e));
    (globalThis as unknown as { process?: { exit?: (n: number) => void } }).process?.exit?.(1);
  }
}

run();
