import type { Metadata } from "next";
import Link from "next/link";
import "./acquiflow.css";
import { AcquiflowVideo } from "@/components/acquiflow-video";
import { StripeCheckoutButton } from "@/components/stripe-checkout-button"

const PRO_PRICE_ID = "price_1TsamtGA3ir6ndSx3alTZQ3z"

export const metadata: Metadata = {
  title: "AcquiFlow — Pre-LOI Deal Intelligence | NexTax.AI",
  description:
    "Know if a deal is worth an LOI before you spend a dollar finding out. AcquiFlow scores deals against 17,000+ closed transactions, stress-tests DSCR, and gives you a clear verdict in under 60 seconds.",
  openGraph: {
    title: "AcquiFlow — Pre-LOI Deal Intelligence",
    description:
      "Score any SMB acquisition against 17,000+ closed comps. Get a verdict, negotiation anchor, and lender readiness — before you sign an LOI.",
    type: "website",
  },
};

export default function AcquiFlowPage() {
  return (
    <div className="acquiflow-root">
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500;600;700&family=Geist:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ============= NAV ============= */}
      <nav>
        <div className="container nav-inner">
          <div className="logo">
            <span className="logo-mark"></span>
            <span>AcquiFlow</span>
          </div>
          <ul className="nav-links">
            <li><a href="#how">How it works</a></li>
            <li><a href="#example">Live example</a></li>
            <li><a href="#features">Platform</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
          <div className="nav-cta">
            {/* TODO: Wire to your dashboard auth */}
            <Link href="/login" className="btn btn-ghost">Sign in</Link>
            <Link href="/buyer-dashboard" className="btn btn-primary">Analyze a deal →</Link>
          </div>
        </div>
      </nav>

      {/* ============= HERO ============= */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">Pre-LOI Deal Intelligence Platform</div>
            <h1 className="hero-headline">
              Know if a deal is<br />
              worth an LOI <span className="accent">before</span><br />
              you spend a dollar<br />
              finding out.
            </h1>
            <p className="hero-sub">
              AcquiFlow scores deals against <strong>17,000+ closed transactions</strong>,
              stress-tests DSCR, and gives you a clear verdict — in under 60 seconds.
            </p>
            <div className="hero-ctas">
              {/* TODO: Wire to your signup / dashboard route */}
              <Link href="/buyer-dashboard" className="btn btn-primary">Analyze Your First Deal Free →</Link>
              <a href="#video" className="btn btn-secondary">Watch 90-sec demo</a>
            </div>
            <div className="micro-proof">
              <span className="stars">★★★★★</span>
              <span>Backed by RMA / ProSight</span>
              <span className="sep">·</span>
              <span>17,000+ closed comps</span>
              <span className="sep">·</span>
              <span>41 industries</span>
            </div>
          </div>

          {/* PRODUCT PANEL */}
          <div className="product-panel">
            <div className="float-tag float-tag-1">
              <div className="lbl">Stress test</div>
              <div className="val">DSCR holds at −25%</div>
            </div>
            <div className="float-tag float-tag-2">
              <div className="lbl">Mkt position</div>
              <div className="val">31% below fair value</div>
            </div>

            <div className="panel-header">
              <div className="panel-title-block">
                <div className="label">Underwriting Output</div>
                <h3>Veterinary Practice</h3>
                <div className="meta">SDE 2.45× · ASK $895,000</div>
              </div>
              <span className="verdict-badge">High Conviction</span>
            </div>

            <div className="panel-grid">
              <div className="score-ring">
                <svg viewBox="0 0 130 130" width="130" height="130">
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10D597" />
                      <stop offset="100%" stopColor="#22D3EE" />
                    </linearGradient>
                  </defs>
                  <circle cx="65" cy="65" r="56" className="ring-bg" fill="none" strokeWidth="6" />
                  <circle
                    cx="65" cy="65" r="56"
                    className="ring-fg"
                    fill="none"
                    strokeWidth="6"
                    strokeDasharray="351.86"
                    strokeDashoffset="38.7"
                  />
                </svg>
                <div className="score-text">
                  <div>
                    <div className="num">89</div>
                    <div className="denom">/ 100 SCORE</div>
                  </div>
                </div>
              </div>

              <div className="metrics-stack">
                <div className="metric-row"><span className="key">DSCR</span><span className="val up">3.15×</span></div>
                <div className="metric-row"><span className="key">Lender Verdict</span><span className="val cyan">SBA 7(a) Ready</span></div>
                <div className="metric-row"><span className="key">Risk Tier</span><span className="val up">Low</span></div>
                <div className="metric-row"><span className="key">Comps Pulled</span><span className="val">7 closed</span></div>
              </div>
            </div>

            <div className="panel-footer">
              <div>
                <div className="label">NexTax Fair Value</div>
                <div className="delta-sub">vs. asking $895K</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="delta">$1.29M</div>
                <div className="delta-sub" style={{ color: "var(--emerald)" }}>+44% upside</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= TRUST BAR ============= */}
      <section className="trust-bar">
        <div className="container">
          <div className="trust-grid">
            <div className="trust-item"><div className="num">17,000+</div><div className="desc">Closed Transactions</div></div>
            <div className="trust-item"><div className="num">20,000+</div><div className="desc">Financial Statement Sets</div></div>
            <div className="trust-item"><div className="num">41</div><div className="desc">Industries Covered</div></div>
            <div className="trust-item"><div className="num">RMA</div><div className="desc">Backed by ProSight Data</div></div>
            <div className="trust-item"><div className="num">Big 4</div><div className="desc">+ PE Underwriting Logic</div></div>
          </div>
        </div>
      </section>

      {/* ============= PROBLEM ============= */}
      <section className="problem">
        <div className="container">
          <p className="problem-quote">
            Most SMB buyers don&apos;t know if a deal actually works financially until they&apos;re <em>deep in diligence</em> — or worse, after LOI. Add-backs that don&apos;t hold. DSCR that collapses under mild downside. Pricing that ignores what comparable deals actually closed at.
            <span className="resolve">→ AcquiFlow solves this before you commit.</span>
          </p>
        </div>
      </section>

      {/* ============= HOW IT WORKS ============= */}
      <section className="block" id="how">
        <div className="container">
          <div className="section-eyebrow">The Workflow</div>
          <h2 className="section-headline">From asking price to <span className="accent">verdict</span> in three steps.</h2>
          <p className="section-sub">No spreadsheets. No modeling. Each step answers a question you already had.</p>

          <div className="steps">
            <div className="step-card">
              <div className="step-num">Input</div>
              <h3 className="step-title">Drop in the deal</h3>
              <p className="step-desc">Asking price, revenue, SDE, industry. Thirty seconds of typing.</p>
              <div className="step-visual">
                <div className="field"><span>Industry</span><span className="v">Veterinary</span></div>
                <div className="field"><span>Asking Price</span><span className="v">$895,000</span></div>
                <div className="field"><span>SDE</span><span className="v">$365,000</span></div>
                <div className="field"><span>Revenue (TTM)</span><span className="v">$1.42M</span></div>
              </div>
            </div>

            <div className="step-card">
              <div className="step-num">Analyze</div>
              <h3 className="step-title">Get your verdict</h3>
              <p className="step-desc">Earnings normalized, benchmarked against 17,000+ comps, DSCR stress-tested, scored 0–100.</p>
              <div className="step-visual">
                <div className="verdict-pills">
                  <span className="pill active">High Conviction</span>
                  <span className="pill">Pursue</span>
                  <span className="pill">Investigate</span>
                  <span className="pill">Pass</span>
                </div>
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed var(--border)" }}>
                  <div className="field"><span>Deal Score</span><span className="v">89 / 100</span></div>
                  <div className="field"><span>DSCR</span><span className="v">3.15×</span></div>
                </div>
              </div>
            </div>

            <div className="step-card">
              <div className="step-num">Decide</div>
              <h3 className="step-title">Know what to do next</h3>
              <p className="step-desc">Negotiation anchor, walk-away ceiling, lender readiness, market saturation, full deal memo.</p>
              <div className="step-visual">
                <div className="field"><span>Anchor Offer</span><span className="v">$1.16M</span></div>
                <div className="field"><span>Walk-Away</span><span className="v">$1.32M</span></div>
                <div className="field"><span>Lender</span><span className="v">SBA 7(a) ✓</span></div>
                <div className="field"><span>Mkt Saturation</span><span className="v">Tier 2</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

     {/* ============= VIDEO WALKTHROUGH ============= */}
<section className="video-section" id="video">
  <div className="container">
    <div className="video-header">
      <div className="section-eyebrow">Product Walkthrough</div>
      <h2 className="section-headline">See AcquiFlow run a <span className="accent">live deal</span>.</h2>
      <p className="section-sub">
        Watch a complete pre-LOI cycle — from raw listing to score, verdict,
        and lender-aware structure. Thirty-nine seconds.
      </p>
    </div>
    <AcquiflowVideo />
  </div>
</section>

      {/* ============= LIVE DEAL EXAMPLE ============= */}
      <section className="deal-example" id="example">
        <div className="container">
          <div className="deal-example-grid">
            <div>
              <div className="section-eyebrow">Real Output</div>
              <h2 className="section-headline">A real deal, run on the <span className="accent">platform</span>.</h2>
              <p className="section-sub" style={{ marginBottom: "32px" }}>
                Veterinary practice, asking $895K. Here&apos;s exactly what AcquiFlow surfaced — and why this one passes the financeability test on day one.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: "var(--mono)", fontSize: "13px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--emerald)", fontSize: "16px" }}>✓</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--text)" }}>DSCR holds at 2.36×</strong> under −25% revenue stress test
                  </span>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--emerald)", fontSize: "16px" }}>✓</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--text)" }}>31% below fair value</strong> — pricing inefficiency confirmed by 7 closed comps
                  </span>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--emerald)", fontSize: "16px" }}>✓</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--text)" }}>Lender-ready</strong> — passes SBA 7(a) underwriting thresholds
                  </span>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--cyan)", fontSize: "16px" }}>→</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--text)" }}>Negotiation anchor: $1.16M</strong> · Walk-away ceiling: $1.32M
                  </span>
                </div>
              </div>
            </div>

            <div className="deal-callout-card">
              <div className="callout-header">
                <div className="industry">▲ Veterinary Practice</div>
                <div className="deal-title">Asking $895,000</div>
                <div className="ask">2.45× SDE Multiple · TTM Revenue $1.42M</div>
              </div>

              <div className="callout-row"><span className="lbl">Deal Score</span><span className="val emerald">89 / 100</span></div>
              <div className="callout-row"><span className="lbl">Verdict</span><span className="val emerald">High Conviction</span></div>
              <div className="callout-row"><span className="lbl">DSCR (base)</span><span className="val emerald">3.15×</span></div>
              <div className="callout-row"><span className="lbl">DSCR (−25% stress)</span><span className="val emerald">2.36×</span></div>
              <div className="callout-row"><span className="lbl">NexTax Fair Value</span><span className="val cyan">$1.29M</span></div>
              <div className="callout-row"><span className="lbl">Pricing Position</span><span className="val emerald">−31% vs. fair value</span></div>
              <div className="callout-row"><span className="lbl">Lender Readiness</span><span className="val cyan">SBA 7(a) Likely</span></div>
              <div className="callout-row"><span className="lbl">Comps (closed)</span><span className="val">7 · 2.36× – 6.05×</span></div>
              <div className="callout-row"><span className="lbl">Negotiation Range</span><span className="val emerald">$1.16M – $1.32M</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= FEATURES ============= */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-eyebrow">The Platform</div>
          <h2 className="section-headline">Built for buyers who need a <span className="accent">position</span>, not a dashboard.</h2>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </div>
              <h3 className="feature-title">Pre-LOI Decision, Not Just Analysis</h3>
              <p className="feature-desc">Every deal exits with a verdict, negotiation anchor, walk-away price, and lender readiness score. You leave with a position, not a spreadsheet.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 6-6" />
                </svg>
              </div>
              <h3 className="feature-title">Benchmarked Against Real Closed Transactions</h3>
              <p className="feature-desc">17,000+ closed deals across 41 industries. Not broker estimates — actual transaction data from DealStats, RMA, and BizBuySell.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /><path d="M2 12h20" />
                </svg>
              </div>
              <h3 className="feature-title">Local Market Intelligence Included</h3>
              <p className="feature-desc">Most tools stop at the deal. AcquiFlow maps the competitive landscape — saturation, density, tier distribution, AI strategic read.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============= PRICING ============= */}
      <section className="pricing" id="pricing">
        <div className="container">
          <div style={{ textAlign: "center" }}>
            <div className="section-eyebrow" style={{ justifyContent: "center" }}>Pricing</div>
            <h2 className="section-headline" style={{ margin: "0 auto 20px" }}>
              Start free. Upgrade when you&apos;re <span className="accent">running deal flow</span>.
            </h2>
            <p className="section-sub" style={{ margin: "0 auto" }}>First full deal is on us. No credit card.</p>
          </div>

          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-tier">Free</div>
              <div className="price-amount"><span className="num">$0</span><span className="denom">/ forever</span></div>
              <Link href="/buyer-dashboard" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>Start free</Link>
              <ul className="price-features">
                <li className="included">10 deal analyses / month</li>
                <li className="included">Scoring + verdict</li>
                <li className="included">First full deal — all tabs</li>
                <li className="included">1 free unlock per category</li>
                <li>Closed transaction comps</li>
                <li>5-page PDF deal report</li>
                <li>LOI Builder</li>
              </ul>
            </div>

            <div className="price-card pro">
              <div className="price-tier">Pro</div>
              <div className="price-amount"><span className="num">$49</span><span className="denom">/ month</span></div>
              <div style={{ width: "100%", marginBottom: "32px" }}>
                <StripeCheckoutButton priceId={PRO_PRICE_ID} className="w-full h-12 text-base font-semibold">
                 Upgrade to Pro →
                </StripeCheckoutButton>
              </div>
              <ul className="price-features">
                <li className="included">Unlimited deal analyses</li>
                <li className="included">Full underwriting tabs</li>
                <li className="included">Closed transaction comps</li>
                <li className="included">5-9 page PDF deal underwriting report</li>
                <li className="included">4 page institutional read</li>
                <li className="included">Deal comparison + benchmarking</li>
                <li className="included">Asset vs stock sale + tax structuring</li>
                <li className="included">LOI Builder</li>
                <li className="included">Unlimited market saturation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============= TESTIMONIALS ============= */}
      <section className="testimonials" id="testimonials">
        <div className="container">
          <div className="section-eyebrow">What Searchers Are Saying</div>
          <h2 className="section-headline">Built with M&amp;A pros from <span className="accent">Big 4 and PE</span> — used by self-funded searchers in the wild.</h2>
          <p className="section-sub">AcquiFlow has been pressure-tested by professionals from PwC and EY, and is being used by independent searchers as part of their pre-LOI underwriting packages.</p>

          <div className="testimonials-grid">
            <div className="testimonial-card featured">
              <div className="testimonial-deal-tag emerald">▲ Self-Funded Search · Closed</div>
              <div className="quote-mark">&ldquo;</div>
              <p className="testimonial-quote">
                I was three weeks into diligence on a deal I would have walked from on day one if I&apos;d had AcquiFlow. The DSCR stress test alone caught what my CPA missed — <em>the seller&apos;s add-backs didn&apos;t survive a 15% revenue dip</em>. I&apos;ve run every deal through it since.
              </p>
              <div className="testimonial-attribution">
                <div className="avatar a1">MR</div>
                <div className="attribution-text">
                  <div className="name">Marcus R.</div>
                  <div className="role">SELF-FUNDED SEARCHER · LIGHT INDUSTRIAL</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-deal-tag">M&amp;A ADVISORY · BETA</div>
              <div className="quote-mark">&ldquo;</div>
              <p className="testimonial-quote">
                The pricing intelligence is the part that surprised me. We&apos;ve been quoting fair value off our own comp set for years — AcquiFlow&apos;s blended NexTax fair value came within 4% on the last three deals we ran through it.
              </p>
              <div className="testimonial-attribution">
                <div className="avatar a2">JK</div>
                <div className="attribution-text">
                  <div className="name">Jennifer K.</div>
                  <div className="role">FORMER PWC · M&amp;A ADVISOR</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-deal-tag amber">SEARCHFUNDER · ACTIVE</div>
              <div className="quote-mark">&ldquo;</div>
              <p className="testimonial-quote">
                The compare feature is what closed it for me. I was deciding between two HVAC deals and the &ldquo;what would flip the verdict&rdquo; signal told me exactly what to negotiate. Saved me from the wrong deal.
              </p>
              <div className="testimonial-attribution">
                <div className="avatar a3">DT</div>
                <div className="attribution-text">
                  <div className="name">David T.</div>
                  <div className="role">INDEPENDENT SPONSOR</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= FAQ ============= */}
      <section className="faq-section" id="faq">
        <div className="container">
          <div className="faq-grid">
            <div className="faq-side">
              <div className="section-eyebrow">Common Questions</div>
              <h2 className="section-headline">Everything you&apos;d ask <span className="accent">before</span> trusting it.</h2>
              <p className="section-sub">If you&apos;re underwriting deals, you don&apos;t trust black boxes. Here&apos;s how AcquiFlow works under the hood.</p>

              <div className="faq-help-card">
                <div className="label">— Still have questions?</div>
                <div className="copy">Talk to the team that built it. We respond within one business day.</div>
                <a href="mailto:steven.morello@nextax.ai" className="btn btn-secondary">Contact us →</a>
              </div>
            </div>

            <div className="faq-list">
              <details className="faq-item" open>
                <summary>
                  How is this different from building my own spreadsheet?
                  <span className="faq-toggle"></span>
                </summary>
                <div className="faq-answer">
                  A spreadsheet tells you numbers. <strong>AcquiFlow tells you what to do with them</strong> — a verdict, a negotiation anchor, a walk-away price, and lender readiness based on 17,000+ closed comps. The platform also stress-tests your DSCR under downside scenarios that most buyers skip until it&apos;s too late.
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  Where does the transaction data come from?
                  <span className="faq-toggle"></span>
                </summary>
                <div className="faq-answer">
                  Multiple licensed sources including <strong>RMA / ProSight</strong>, <strong>DealStats</strong>, and <strong>BizBuySell</strong>. We don&apos;t display raw licensed data — figures are surfaced as blended NexTax Intelligence so you get directional accuracy without sourcing constraints.
                  <div className="data-callout">17,000+ closed transactions · 20,000+ financial statement sets · 41 industries</div>
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  What if my industry isn&apos;t covered?
                  <span className="faq-toggle"></span>
                </summary>
                <div className="faq-answer">
                  We&apos;re adding new industries every week based on user requests. <strong>If your deal&apos;s industry isn&apos;t listed</strong>, let us know — we&apos;ll prioritize it for the next batch. Recent additions include veterinary, property management, senior care, physical therapy, and staffing.
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  How is SDE adjusted from seller-stated numbers?
                  <span className="faq-toggle"></span>
                </summary>
                <div className="faq-answer">
                  The normalization engine applies <strong>industry-specific haircuts</strong> based on add-back benchmarks, owner compensation norms, and RMA margin comparisons. Every adjustment is explained in the deal output so you can validate it during diligence — no black-box numbers.
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  Can I use this before I have a deal under LOI?
                  <span className="faq-toggle"></span>
                </summary>
                <div className="faq-answer">
                  That&apos;s exactly what it&apos;s built for. AcquiFlow is a <strong>pre-LOI</strong> intelligence platform — drop in any deal you&apos;re considering (a BizBuySell listing, a broker email, a proprietary lead) and get a verdict before you spend hours on a CIM or weeks on diligence.
                </div>
              </details>

              <details className="faq-item">
                <summary>
                  Is my deal data private?
                  <span className="faq-toggle"></span>
                </summary>
                <div className="faq-answer">
                  Yes. Deal inputs are stored encrypted to your account only. We don&apos;t share, resell, or surface your data to other users — your deal flow is your competitive advantage, and we treat it that way.
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* ============= FINAL CTA ============= */}
      <section className="final-cta">
        <div className="container">
          <h2>Know if your next deal is worth pursuing — <span className="accent">before</span> you spend a dollar finding out.</h2>
          <div className="final-cta-buttons">
            <Link href="/buyer-dashboard" className="btn btn-primary">Analyze Your First Deal Free →</Link>
            <a href="/sample-report.pdf" className="btn btn-secondary">See sample report</a>
          </div>
          <div className="micro">No credit card required · First full deal free · Cancel anytime</div>
        </div>
      </section>

      {/* ============= FOOTER ============= */}
      <footer>
        <div className="container footer-inner">
          <div className="logo" style={{ fontSize: "16px" }}>
            <span className="logo-mark" style={{ width: "22px", height: "22px" }}></span>
            <span>AcquiFlow</span>
          </div>
          <div>© 2026 NexTax.AI · Pre-LOI Deal Intelligence</div>
        </div>
      </footer>
    </div>
  );
}
