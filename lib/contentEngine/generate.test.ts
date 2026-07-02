// lib/contentEngine/generate.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Stage 2 generation — prompt containment + parse robustness tests.
// No real API call anywhere (mocked fetch). Also validates template
// integrity against the topic triggers.
// Run with: npx tsx lib/contentEngine/generate.test.ts
// ─────────────────────────────────────────────────────────────────────────────

import { buildDraftPrompt, generateDraft, GENERATION_MODEL } from "./generate";
import { TEMPLATES, selectTemplates } from "./templates";
import { buildFactSheet, deriveDscrAtHaircut } from "./factSheet";
import { anonymizeSingleDeal } from "./anonymize";
import { verifyDraft } from "./verify";
import type { FetchLike } from "./generate";
import type { SanitizedDealFacts } from "./types";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

function mkDeal(): SanitizedDealFacts {
  return {
    deal_run_id: "aaaaaaaa-0000-0000-0000-000000000001",
    industry: "hvac", state: "OH",
    revenue: 1_234_567, sde: 400_000, reported_sde: 400_000, usable_sde: 320_000,
    asking_price: 1_200_000, fair_value: 1_050_000, monthly_payment: 15_000,
    dscr: 1.4444, valuation_multiple: 3.75, employees: 12, years_in_business: 15,
    confidence_score: "high", normalization_trust_score: 72,
  };
}

const sheet = buildFactSheet({
  mode: "single_deal",
  dealRunIds: ["aaaaaaaa-0000-0000-0000-000000000001"],
  anonymizedFacts: anonymizeSingleDeal(mkDeal()),
  derivations: [deriveDscrAtHaircut(320_000, 15_000, 20)!],
});
const template = TEMPLATES.find((t) => t.template_key === "sba_dscr_broker_didnt_tell_you")!;

console.log("template integrity");
{
  check("templates exist for every trigger topic",
    ["sba_dscr", "addbacks_sde_pressure", "phantom_sde", "preloi_haircut"]
      .every((k) => TEMPLATES.some((t) => t.topic_key === k)));
  check("all weights positive", TEMPLATES.every((t) => t.weight > 0));
  check("all templates buyer-side default (no seller-side)", TEMPLATES.every((t) => !/sell/i.test(t.topic_key)));
  check("top tier is heaviest (metrics prior)",
    TEMPLATES.filter((t) => t.tier === "top").every((t) =>
      TEMPLATES.filter((x) => x.tier === "high").every((x) => t.weight > x.weight)));
  const sel = selectTemplates("sba_dscr", "single_deal");
  check("selectTemplates returns the sba template", sel.length === 1 && sel[0].template_key === template.template_key);
  check("selectTemplates empty for unknown topic", selectTemplates("nope", "single_deal").length === 0);
}

console.log("buildDraftPrompt — containment");
{
  const prompt = buildDraftPrompt({ template, sheet, mode: "single_deal" });

  check("contains fact displays", prompt.includes("$1.2M") && prompt.includes("1.44x"));
  check("contains dscr qualifier as required accompaniment", prompt.includes("standard SBA terms"));
  check("contains anatomy", prompt.includes("worked numeric example"));
  check("contains do-not on fabrication", prompt.includes("NO NUMBER"));
  check("contains incidental-numeral rule", prompt.includes("incidental numerals"));
  check("single-deal mode directive present", prompt.includes("MODE: SINGLE DEAL"));
  check("JSON output contract present", prompt.includes('{"title"'));

  // Raw precision and screening-only fields must never reach the prompt.
  check("raw revenue (1,234,567) absent", !prompt.includes("1234567") && !prompt.includes("1,234,567"));
  check("raw dscr (1.4444) absent", !prompt.includes("1.4444"));
  check("state (OH) absent", !/\bOH\b/.test(prompt));
  check("deal_run_id absent", !prompt.includes("aaaaaaaa-0000"));

  const composite = buildDraftPrompt({ template, sheet: { ...sheet, mode: "composite" }, mode: "composite" });
  check("composite mode directive present", composite.includes("MODE: COMPOSITE"));
}

console.log("generateDraft — parse robustness (mocked fetch)");
{
  const mkFetch = (payload: unknown, ok = true, status = 200): FetchLike =>
    async () => ({ ok, status, json: async () => payload });

  const good = {
    content: [{ type: "text", text: '{"title": "A title", "body_md": "A body with $1.2M."}' }],
  };

  (async () => {
    const r1 = await generateDraft({ template, sheet, mode: "single_deal", apiKey: "k", fetchImpl: mkFetch(good) });
    check("valid response parses", r1.draft !== null && r1.draft.title === "A title", r1.error ?? "");
    check("model recorded", r1.draft?.model_used === GENERATION_MODEL);

    const r2 = await generateDraft({ template, sheet, mode: "single_deal", apiKey: "k", fetchImpl: mkFetch({}, false, 529) });
    check("HTTP error → null draft with reason", r2.draft === null && /529/.test(r2.error ?? ""));

    const r3 = await generateDraft({
      template, sheet, mode: "single_deal", apiKey: "k",
      fetchImpl: mkFetch({ content: [{ type: "text", text: "not json at all" }] }),
    });
    check("non-JSON output → null draft", r3.draft === null);

    const r4 = await generateDraft({
      template, sheet, mode: "single_deal", apiKey: "k",
      fetchImpl: mkFetch({ content: [{ type: "text", text: '{"title": "", "body_md": "x"}' }] }),
    });
    check("empty title → null draft", r4.draft === null);

    const r5 = await generateDraft({
      template, sheet, mode: "single_deal", apiKey: "k",
      fetchImpl: async () => { throw new Error("network down"); },
    });
    check("thrown fetch → null draft with reason", r5.draft === null && /network down/.test(r5.error ?? ""));

    // ── End-to-end wiring: generated output flows into verifyDraft ──────────
    const cleanBody =
      "An hvac deal asking $1.2M with $320K of usable SDE. Coverage is 1.44x at standard SBA terms (80% financed / 10.5% / 10yr). If SDE comes in 20% lower, that falls to 1.42x against the 1.15 SBA floor.";
    const r6 = await generateDraft({
      template, sheet, mode: "single_deal", apiKey: "k",
      fetchImpl: mkFetch({ content: [{ type: "text", text: JSON.stringify({ title: "T", body_md: cleanBody }) }] }),
    });
    const v6 = verifyDraft({ title: r6.draft!.title, body: r6.draft!.body_md, sheet, mode: "single_deal" });
    check("e2e: clean generated draft verifies", v6.passed, v6.unmatched.join(", "));

    const dirtyBody = "This hvac deal does $1.2M with a $47K tax shield in year one.";
    const r7 = await generateDraft({
      template, sheet, mode: "single_deal", apiKey: "k",
      fetchImpl: mkFetch({ content: [{ type: "text", text: JSON.stringify({ title: "T", body_md: dirtyBody }) }] }),
    });
    const v7 = verifyDraft({ title: r7.draft!.title, body: r7.draft!.body_md, sheet, mode: "single_deal" });
    check("e2e: fabricated figure in generated draft is caught", !v7.passed && v7.unmatched.length > 0);

    if (failures > 0) {
      console.error(`\n${failures} check(s) FAILED`);
      process.exit(1);
    }
    console.log("\nAll generation checks passed.");
  })();
}
