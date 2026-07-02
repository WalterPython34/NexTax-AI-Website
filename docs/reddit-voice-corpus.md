# AcquiFlow — Reddit Voice & Format Corpus

**Purpose:** the voice/format DNA the Reddit content engine must draft in. Distilled from Steve's real posts (as `NexTax-AI` on r/buyingabusiness / r/smallbusiness / r/SellMyBusiness) and their performance data. Read this before writing any draft template. Companion to `docs/reddit-content-engine-build-spec.md`.

**Inputs it was built from:**
- `docs/reddit-posts-raw.*` — the full text of Steve's posts (commit the PDF or a text export).
- `docs/reddit-post-metrics.csv` — views / upvote rate / comments / shares per post.

---

## 1. How to use this

Every draft is Steve's editorial voice, illustrated by a real (anonymized) or composite deal. The deal is fuel; the voice is Steve's. Match the anatomy in §3, the tone in §4, and pick the hook + format from the performance-ranked map in §6. Do not invent a voice — reproduce this one.

---

## 2. What the performance data says (use as a pre-loaded prior)

Ranked by reach, from `reddit-post-metrics.csv` (views as of 2026-07-02; several titles were posted multiple times, so totals span reposts/cross-posts):

- **Top tier:** "What your broker probably didn't tell you about SBA loans" (66.4K views, 249 shares — the runaway winner). Asset-vs-stock tax (23.4K, 134 shares, ~100% upvote). Working capital (21.0K). SBA July-4th rule changes (19.9K + 28.5K across two posts — timely peg). Earnouts "brokers describe vs. how they play out" (19.2K, 100% upvote).
- **High tier:** Phantom SDE / family labor (16.8K). Pre-LOI diligence checklist (16.0K, 116 shares, 100% upvote). Seller dependency "the seller IS the business" (12.1K). Add-backs "what your broker didn't tell you" (12.3K, 100% upvote).
- **Lower:** Customer concentration (3.9K — evergreen but quieter). The "five add-backs" listicle (7.9K, and the lowest upvote rate at 0.77).
- **Negative signals to encode:** seller-side content underperforms hard — the two r/SellMyBusiness posts landed at 1.5K and 5.4K vs. buyer-side posts in the 15–65K range. The lone lower-upvote post was a list-of-five without a worked numeric example.

**Implications for the engine:** default to buyer-side framing; lead with a worked numeric example, not a listicle; weight topic/template selection toward the top-tier topics; treat shares as the utility signal worth optimizing for (they correlate with "save-this" teardown posts).

---

## 3. The post anatomy (the skeleton every draft follows)

1. **Hook / title** — authority-positioning or a named trap (see §5). Buyer-side.
2. **The wrong mental model** — open by naming the misconception or scenario the reader currently holds. e.g. buyers think SBA is "10% down, bank covers 90%, done"; or "Every week I see someone talking about a 'beautiful' business doing $400k SDE at a clean 3x."
3. **Optional credibility line (sparingly)** — used in some posts, not all: the Big 4 (EY) / PE (Morgan Stanley) background, or "what I tell buyers when they call me." Never more than a sentence; never in every post.
4. **Plain-English promise** — "Here's my easy-to-read version I wish more buyers heard up front."
5. **Numbered body sections, bold headers** — each a discrete point. Every substantive section = plain-English explanation **then a worked numeric example**. The math is the differentiator (the replacement-wage teardown, the DSCR tailspin, the $180K allocation swing). Define jargon inline: "DSCR is just a fancy way of saying how many dollars of cash flow you have for every dollar of loan payment."
6. **Authority thresholds** — specific numbers stated as fact: DSCR 1.15 SBA floor / 1.25 lender target / 1.5 comfortable; concentration 15–20% attention, 30%+ often un-lendable; owner/seller dependency compresses the multiple 1–2 turns of EBITDA. These specifics ARE the authority.
7. **"Where people get burned" / "the trap nobody mentions"** — surface the hidden downside and the late-stage consequence (the deal dies after you've spent time and money).
8. **Bottom line / takeaway** — one tight paragraph.
9. **CTA — an open question + a soft help offer** (see §7). Never a product pitch.

---

## 4. Voice & tone rules

- **Second person, direct.** "your deal," "you'll get burned on," "what you actually pay."
- **Plain English; define every term** the moment it appears.
- **Confident and teacherly, never salesy.** Authority comes from specificity and worked math, not adjectives.
- **Lived-experience "I" statements**, grounded and concrete: "I've seen buyers spend 20–30 hours a quarter on earnout admin," "I had two clients last month bring me revenue-earnout deals." Real, not boastful.
- **Sharp analogies:** the personal guarantee as "a backdoor to your personal bank account — the LLC is the front door that stops vendors; the SBA guarantee lets the bank walk right through the back."
- **Honest about incentives:** "Brokers evaluate businesses to sell them. Banks evaluate assuming they'll fail." Name the seller/broker incentive without vilifying.
- **Measured, not hype:** "None of these are automatic deal-killers, but each one gives you information."
- **Em dashes:** fine in titles/headers/bullets (per Steve's convention); minimize in paragraph prose.
- **Tax framing note:** on Reddit, Steve speaks in his own editorial voice and uses confident tax language ("tax savings," "you almost always want an asset deal as a buyer"). That is correct here — it is personal expert commentary. It is NOT the product's tax surface, so the CLAUDE.md forbidden-tax-language rule (which governs automated in-app tax output) does not neuter the editorial voice. Conversely, do NOT launder the product's deliberately-hedged tax output into public advice — the post is Steve's voice illustrated by a deal, not the software speaking.

---

## 5. Proven hooks (performance-ranked)

1. **"What your broker (probably) didn't tell you about [X]"** — the top performer. Best for SBA structure, add-backs.
2. **Named trap / provocative reframe** — "The Phantom SDE Trap," "The customer concentration trap," "The seller IS the business," "Your business is worth less than you think if the revenue lives in your head."
3. **Timely news peg** — "SBA is changing the rules on [date]. Here's what it actually means if you're trying to buy a business right now." (High reach, ephemeral.)
4. **Contrarian insider** — "Earnouts: what brokers describe vs. how they actually play out," "…the SBA trap nobody mentions."
5. **Utility / checklist** — "The pre-LOI diligence checklist I wish more buyers used before spending $20k on QoE." (High shares.)

---

## 6. Topic → computed finding → template map (ranked)

The reason this engine works: Steve's best-performing topics ARE the findings AcquiFlow computes. A scored deal that trips one of these flags drafts in the matching proven format.

| Topic (proven) | Best hook | Triggering computed finding | Perf tier |
|---|---|---|---|
| SBA structure / equity injection / DSCR at asking | "what your broker didn't tell you about SBA loans" | `dscr`, `monthly_payment`, debt-structure inputs | TOP |
| Add-backs / SDE pressure-test | "what your broker didn't tell you about add-backs" | `usable_sde` vs `reported_sde`, `normalization_flags_json`, `normalization_trust_score` | HIGH |
| Phantom SDE / replacement wage | "The Phantom SDE Trap" | owner-comp normalization (SBA-checker owner-comp benchmark), `usable_sde` adjustment | HIGH |
| Asset vs stock / tax structure | "what you actually pay in taxes" | structural comparison / tax layer (editorial voice — see §4 tax note) | HIGH |
| Working capital | "the quiet way buyers overpay" | working-capital peg in deal structure | HIGH |
| Pre-LOI DSCR haircut scenarios | pre-LOI checklist framing | `dscr` under SDE haircuts, `recommended_offer_low/high` | HIGH |
| Earnouts | "brokers describe vs. how they play out" | deal structure / seller-note fields | MID-HIGH |
| Seller dependency | "the seller IS the business" | `owner_operated` flag | MID |
| Customer concentration | "the concentration trap" | `customer_concentration` / `top_customer_pct` | LOWER (evergreen) |
| Timely SBA/policy change | news peg + date | not deal-driven — pair with a signal from `community_signals` | HIGH, ephemeral |

Default sub: **r/buyingabusiness (buyer-side).** Seller-side (r/SellMyBusiness) is secondary and underperforms — only draft seller-side deliberately, not by default.

---

## 7. CTA pattern (protects mod credibility)

Always close with **an open question that invites the community to share**, plus a **soft offer to help in the comments** — never a product pitch. Real examples:
- "What's the weirdest family labor arrangement you've spotted in a CIM?"
- "Has anyone here walked away from an SMB deal specifically because of customer concentration?"
- "If you're currently evaluating a deal and [topic] is something you're wrestling with, drop your situation in the comments and I'll respond below."

Product mention, if any, is at most a subtle signature — never in the body, never a sell. Steve moderates these communities; the post must clear the bar he'd hold others to.

---

## 8. Do-NOT list

- No product pitch in the body; no hype adjectives standing in for specifics.
- No fabricated numbers. Worked examples are real (anonymized) or composite labeled as a pattern — which is already Steve's native style (he teaches with illustrative examples like "a landscaping company for $500K," not a specific identifiable deal).
- No seller-side framing by default.
- No listicle without a worked numeric example (the one lower-upvote pattern in the data).
- No manufactured urgency.
- No laundering the product's hedged tax output into public advice (see §4).

---

## 9. Anonymization is native to this voice

Steve's existing posts already teach with illustrative/composite numbers framed as patterns, not specific real deals. So the content engine's anonymization requirement is not a constraint imposed on the voice — it IS the voice. Single-deal drafts round/range and de-identify; composites are framed as "across the deals I've scored." Either way, honest and on-brand.
