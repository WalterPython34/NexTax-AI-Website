// Central config: industries, keyword clusters, scoring weights, query builders.

// ---------------------------------------------------------------------------
// INDUSTRY KEYS
// Paste your full 41-industry key list here (same keys your DealStats /
// Market Intelligence Engine uses). The classifier maps a buyer's stated
// target to the CLOSEST key, or null. The 15 newest are pre-filled; add the
// rest from your existing constants so the two systems stay in sync.
// ---------------------------------------------------------------------------
export const INDUSTRY_KEYS: string[] = [
  "signmaking", "hairsalon", "clothing", "construction", "grocery",
  "pestcontrol", "marketing", "engineering", "veterinary", "realestatebrok",
  "propertymanage", "seniorcare", "physicaltherapy", "remodeling", "staffing",
  // TODO: append the remaining ~26 keys from your Market Intelligence Engine.
];

// ---------------------------------------------------------------------------
// KEYWORD CLUSTERS
// A = QoE / diligence pain  -> OVERRIDE to hot/services
// B = hot / in-market
// C = warm / identifies as a buyer
// D = suppress (noise / competitors / gurus)
// ---------------------------------------------------------------------------
export const CLUSTERS = {
  qoe: [
    "quality of earnings", "qoe", "qofe", "addback", "add-back", "add-backs",
    "normalize sde", "sde adjustment", "verify the financials",
    "verifying seller financials", "seller's financials", "got burned",
    "deal fell apart", "is this addback legit", "due diligence on a business",
  ],
  hot: [
    "under loi", "signed an loi", "signed loi", "loi accepted",
    "in diligence", "in due diligence", "closing on", "deal closes",
    "raising my search fund", "raised my fund", "closed my raise",
    "looking for a business doing", "seeking a business with", "target ebitda",
    "target sde", "anyone know a broker", "deal flow in",
  ],
  warm: [
    "acquisition entrepreneur", "eta", "search fund", "searcher",
    "independent sponsor", "indie sponsor", "buying boring businesses",
    "holdco", "holding company", "permanent capital", "starting my search",
    "first acquisition", "sde multiple for", "what multiple",
  ],
  suppress: [
    "buy my course", "dm me to learn", "link in bio to learn",
    "i help people buy businesses", "i help searchers find", "book a call to",
    "franchise opportunity", "passive income", "crypto", "altcoin",
  ],
} as const;

// ---------------------------------------------------------------------------
// SCORING WEIGHTS  (see score.ts)
// ---------------------------------------------------------------------------
export const SCORE = {
  tier: { hot: 45, warm: 25, cold: 5, not_buyer: 0 },
  recency: { within7d: 20, within30d: 10 },
  industryFit: 15,
  hasEmail: 15,
  source: { searchfunder: 10, axial: 10, podcast: 7, x: 5, reddit: 3, manual: 8 },
  pushThreshold: 55, // below this, do not auto-push to SmartLead
} as const;

// ---------------------------------------------------------------------------
// QUERY BUILDERS
// ---------------------------------------------------------------------------

// X API v2 recent-search query strings.
export const X_QUERIES = {
  hot:
    '("under LOI" OR "signed an LOI" OR "in diligence" OR "raising my search fund" ' +
    'OR "looking for a business doing") (acquire OR acquisition OR SMB OR business) ' +
    "lang:en -is:retweet -is:reply",
  qoe:
    '("quality of earnings" OR QoE OR addback OR "verify the financials" OR ' +
    '"normalize SDE") (deal OR business OR acquisition) lang:en -is:retweet',
};

// Subreddits to poll via /r/{sub}/new.json
export const REDDIT_SUBS = [
  "search_funds", "businessacquisition", "sweatystartup",
  "Entrepreneur", "FBA", "smallbusiness",
];

// Podcast RSS feeds whose guests are buyers (add more as you find them).
export const PODCAST_FEEDS = [
  // "https://feeds.example.com/acquiring-minds.rss",
];

// Lower-cased keyword hit test against any text body.
export function clusterHits(text: string) {
  const t = text.toLowerCase();
  const has = (list: readonly string[]) => list.some((k) => t.includes(k));
  return {
    qoe: has(CLUSTERS.qoe),
    hot: has(CLUSTERS.hot),
    warm: has(CLUSTERS.warm),
    suppress: has(CLUSTERS.suppress),
  };
}
