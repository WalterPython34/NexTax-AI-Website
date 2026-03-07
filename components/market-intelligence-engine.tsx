"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface PainCategory {
  id: string;
  label: string;
  color: string;
  icon: string;
}

interface ServiceTier {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface Post {
  id: string;
  title: string;
  body: string;
  category: string;
  stage: string;
  community: string;
  timestamp: Date;
  weekLabel: string;
  weekNum: number;
  upvotes: number;
  comments: number;
  intentScore: number;
  painScore: number;
  commercialRelevance: number;
  compositeScore: number;
  industry: string;
  serviceTier: string;
  aiSummary: string | null;
}

interface ContentOpportunity {
  category: PainCategory;
  avgPain: number;
  avgIntent: number;
  postCount: number;
  opportunityScore: number;
  suggestedTopics: string[];
}

interface HeatMapRow {
  tier1: number;
  tier2: number;
  tier3: number;
  total: number;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const PAIN_CATEGORIES: PainCategory[] = [
  { id: "valuation", label: "Valuation Uncertainty", color: "#E8453C", icon: "⚖️" },
  { id: "financial_modeling", label: "Financial Modeling", color: "#F59E0B", icon: "📊" },
  { id: "diligence", label: "Diligence Confusion", color: "#8B5CF6", icon: "🔍" },
  { id: "seller_addbacks", label: "Seller Add-Backs", color: "#10B981", icon: "📝" },
  { id: "dscr", label: "Debt / DSCR Analysis", color: "#3B82F6", icon: "🏦" },
  { id: "market_saturation", label: "Market Saturation", color: "#EC4899", icon: "🗺️" },
  { id: "competitive", label: "Competitive Analysis", color: "#6366F1", icon: "🏁" },
  { id: "deal_structure", label: "Deal Structure (Asset vs Stock)", color: "#14B8A6", icon: "📋" },
];

const COMMUNITIES = [
  "r/smallbusiness", "r/Entrepreneur", "r/acquisitions", "r/searchfunds",
  "r/businessvaluation", "r/mergers", "r/finance", "r/sidehustle",
];

const BUYER_STAGES = ["Exploring", "Actively Searching", "Evaluating LOI", "In Diligence", "Post-Close"];

const SERVICE_TIERS: ServiceTier[] = [
  { id: "tier1", name: "Deal Risk Assessment", description: "Quick-turn risk scoring", color: "#3B82F6" },
  { id: "tier2", name: "Full Deal Underwriting", description: "Comprehensive analysis", color: "#8B5CF6" },
  { id: "tier3", name: "Market Intelligence", description: "Competitive & market data", color: "#10B981" },
];

const POST_TEMPLATES = [
  { title: "Is {multiple}x SDE reasonable for a {industry}?", category: "valuation", stage: "Evaluating LOI", body: "Looking at a {industry} doing ${revenue} in revenue with ${sde} SDE. Seller wants {multiple}x — feels high but the growth is strong. Am I overpaying?" },
  { title: "How to model SBA loan payments into cash flow?", category: "financial_modeling", stage: "Evaluating LOI", body: "Trying to figure out if I can actually service the debt on this deal. {sba_rate}% SBA loan over 10 years but I'm not sure how to factor in the payments against projected cash flow." },
  { title: "Seller claims {addback_pct}% of revenue is add-backs — red flag?", category: "seller_addbacks", stage: "In Diligence", body: "The seller's broker is claiming massive add-backs that would double the effective SDE. Things like personal car, family on payroll, 'one-time' expenses that seem recurring. How do you verify these?" },
  { title: "DSCR of {dscr} — is this too tight?", category: "dscr", stage: "Evaluating LOI", body: "Running my numbers and I'm getting a DSCR of {dscr}. My lender wants 1.25 minimum. Is there any room to negotiate or should I walk?" },
  { title: "How do I assess competition for a local {industry}?", category: "market_saturation", stage: "Actively Searching", body: "Found a {industry} I like but there are {competitors} other similar businesses within 10 miles. Is the market saturated or is there room for growth?" },
  { title: "Asset purchase vs stock purchase — tax implications?", category: "deal_structure", stage: "In Diligence", body: "My attorney wants to do an asset purchase but the seller insists on stock. The tax difference seems massive. Anyone dealt with this? How did you structure it?" },
  { title: "What does diligence actually look like for a {revenue_range} business?", category: "diligence", stage: "Actively Searching", body: "First-time buyer here. I keep hearing about 'doing your diligence' but what does that actually mean in practice? What documents should I request? What should I look for?" },
  { title: "Competitor just opened near my target acquisition", category: "competitive", stage: "In Diligence", body: "I'm in diligence on a {industry} and just found out a competitor is opening {distance} away. Should I renegotiate the price or walk entirely?" },
  { title: "Struggling with {industry} revenue projections", category: "financial_modeling", stage: "Evaluating LOI", body: "The historical financials show flat growth but the seller claims there's huge upside. How do you realistically model growth without just taking the seller's word for it?" },
  { title: "QoE report came back — now what?", category: "diligence", stage: "In Diligence", body: "Got the Quality of Earnings report and there are some discrepancies from what the broker presented. Nothing massive but the adjusted EBITDA is about 15% lower. Is this normal? Should I retrade?" },
  { title: "Market research for {industry} acquisition", category: "market_saturation", stage: "Exploring", body: "I want to buy a {industry} but I don't know how to assess whether the local market can sustain growth. What tools or data sources do people use?" },
  { title: "Valuation gap — seller wants {high_multiple}x, I think {low_multiple}x is fair", category: "valuation", stage: "Evaluating LOI", body: "Classic situation. Seller is anchored on a number their broker gave them. I've done my own analysis and can't justify more than {low_multiple}x. How do you bridge this gap without killing the deal?" },
];

const INDUSTRIES = [
  "laundromat", "HVAC company", "landscaping business", "car wash",
  "dental practice", "gym/fitness center", "restaurant", "auto repair shop",
  "cleaning service", "ecommerce brand", "SaaS product", "insurance agency",
];

// ─── DATA GENERATION ─────────────────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePosts(count = 120): Post[] {
  const rng = seededRandom(42);
  const posts: Post[] = [];
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const template = POST_TEMPLATES[Math.floor(rng() * POST_TEMPLATES.length)];
    const industry = INDUSTRIES[Math.floor(rng() * INDUSTRIES.length)];
    const multiple = (2 + rng() * 3).toFixed(1);
    const revenue = (Math.floor(rng() * 20) * 50000 + 200000).toLocaleString();
    const sde = (Math.floor(rng() * 10) * 25000 + 75000).toLocaleString();
    const dscr = (0.8 + rng() * 0.8).toFixed(2);
    const competitors = Math.floor(rng() * 12) + 2;
    const addback_pct = Math.floor(rng() * 30) + 15;

    const title = template.title
      .replace("{industry}", industry)
      .replace("{multiple}", multiple)
      .replace("{high_multiple}", (parseFloat(multiple) + 0.5).toFixed(1))
      .replace("{low_multiple}", (parseFloat(multiple) - 0.8).toFixed(1))
      .replace("{dscr}", dscr)
      .replace("{competitors}", String(competitors))
      .replace("{addback_pct}", String(addback_pct))
      .replace("{revenue_range}", `$${revenue}`);

    const body = template.body
      .replace(/{industry}/g, industry)
      .replace("{multiple}", multiple)
      .replace("{revenue}", revenue)
      .replace("{sde}", sde)
      .replace("{sba_rate}", (6 + rng() * 2).toFixed(1))
      .replace("{dscr}", dscr)
      .replace("{competitors}", String(competitors))
      .replace("{addback_pct}", String(addback_pct))
      .replace("{distance}", `${Math.floor(rng() * 5) + 1} miles`)
      .replace("{revenue_range}", `$${revenue}`);

    const intentScore = Math.round(40 + rng() * 60);
    const painScore = Math.round(30 + rng() * 70);
    const commercialRelevance = Math.round(20 + rng() * 80);
    const compositeScore = Math.round(intentScore * 0.3 + painScore * 0.4 + commercialRelevance * 0.3);

    const weeksAgo = Math.floor(rng() * 12);
    const timestamp = new Date(now - weeksAgo * WEEK - Math.floor(rng() * WEEK));

    posts.push({
      id: `post-${i}`,
      title,
      body,
      category: template.category,
      stage: template.stage || BUYER_STAGES[Math.floor(rng() * BUYER_STAGES.length)],
      community: COMMUNITIES[Math.floor(rng() * COMMUNITIES.length)],
      timestamp,
      weekLabel: `W${12 - weeksAgo}`,
      weekNum: 12 - weeksAgo,
      upvotes: Math.floor(rng() * 200) + 5,
      comments: Math.floor(rng() * 40) + 1,
      intentScore,
      painScore,
      commercialRelevance,
      compositeScore,
      industry,
      serviceTier: commercialRelevance > 65 ? "tier1" : commercialRelevance > 40 ? "tier2" : "tier3",
      aiSummary: null,
    });
  }
  return posts.sort((a, b) => b.compositeScore - a.compositeScore);
}

function generateTrendData(posts: Post[]) {
  const weeks: Record<string, Record<string, number>> = {};
  for (let w = 1; w <= 12; w++) weeks[`W${w}`] = {};
  PAIN_CATEGORIES.forEach((c) => {
    Object.keys(weeks).forEach((w) => {
      weeks[w][c.id] = 0;
    });
  });
  posts.forEach((p) => {
    if (weeks[p.weekLabel]) weeks[p.weekLabel][p.category]++;
  });
  return Object.entries(weeks)
    .map(([week, cats]) => ({ week, ...cats }))
    .sort((a, b) => parseInt(a.week.slice(1)) - parseInt(b.week.slice(1)));
}

function generateContentOpportunities(posts: Post[]): ContentOpportunity[] {
  const catClusters: Record<string, Post[]> = {};
  posts.forEach((p) => {
    if (!catClusters[p.category]) catClusters[p.category] = [];
    catClusters[p.category].push(p);
  });
  return Object.entries(catClusters)
    .map(([catId, catPosts]) => {
      const cat = PAIN_CATEGORIES.find((c) => c.id === catId)!;
      const avgPain = catPosts.reduce((s, p) => s + p.painScore, 0) / catPosts.length;
      const avgIntent = catPosts.reduce((s, p) => s + p.intentScore, 0) / catPosts.length;
      const postCount = catPosts.length;
      const opportunityScore = Math.round(avgPain * 0.4 + avgIntent * 0.3 + Math.min(postCount * 2, 30) * 0.3);
      return {
        category: cat,
        avgPain: Math.round(avgPain),
        avgIntent: Math.round(avgIntent),
        postCount,
        opportunityScore,
        suggestedTopics: getSuggestedTopics(catId),
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

function getSuggestedTopics(catId: string): string[] {
  const topics: Record<string, string[]> = {
    valuation: [
      "The Real Cost of Overpaying: A Data-Driven Look at SMB Multiples",
      "SDE vs EBITDA: Which Metric Actually Matters for Sub-$2M Deals",
      "Interactive Tool: Is Your Target Overpriced?",
    ],
    financial_modeling: [
      "Cash Flow Modeling Template for First-Time Buyers",
      "SBA Loan Calculator: Can You Actually Service the Debt?",
      "Revenue Projection Framework for Small Business Acquisitions",
    ],
    diligence: [
      "The Complete Due Diligence Checklist (With Red Flag Indicators)",
      "QoE Reports Explained: What to Expect and What to Question",
      "First-Time Buyer's Diligence Survival Guide",
    ],
    seller_addbacks: [
      "Add-Back Red Flags: When Seller Adjustments Cross the Line",
      "Verifying Add-Backs: A Step-by-Step Approach",
      "The Add-Back Trap: Why Brokers Inflate SDE",
    ],
    dscr: [
      "DSCR Demystified: What Lenders Actually Want to See",
      "When DSCR Falls Short: Creative Deal Structuring Options",
      "Debt Service Calculator for SBA 7(a) Acquisitions",
    ],
    market_saturation: [
      "Local Market Analysis Framework for Service Businesses",
      "Competitive Density Mapping: A Visual Approach",
      "Market Saturation Signals Every Buyer Should Track",
    ],
    competitive: [
      "Competitive Moat Assessment for Small Businesses",
      "How to Evaluate Competitive Threats Pre-Acquisition",
      "Building a Competitive Intelligence Brief in 48 Hours",
    ],
    deal_structure: [
      "Asset vs Stock Purchase: The Tax Impact Calculator",
      "Hybrid Deal Structures That Satisfy Both Parties",
      "Deal Structure Decision Tree for SMB Acquisitions",
    ],
  };
  return topics[catId] || [];
}

function generateHeatMapData(posts: Post[]): Record<string, HeatMapRow> {
  const matrix: Record<string, HeatMapRow> = {};
  PAIN_CATEGORIES.forEach((cat) => {
    matrix[cat.id] = { tier1: 0, tier2: 0, tier3: 0, total: 0 };
  });
  posts.forEach((p) => {
    const row = matrix[p.category];
    if (row) {
      row[p.serviceTier as keyof Omit<HeatMapRow, "total">]++;
      row.total++;
    }
  });
  return matrix;
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function ScoreBadge({ score, label, small }: { score: number; label?: string; small?: boolean }) {
  const color = score >= 70 ? "#E8453C" : score >= 45 ? "#F59E0B" : "#6B7280";
  const bg = score >= 70 ? "rgba(232,69,60,0.12)" : score >= 45 ? "rgba(245,158,11,0.12)" : "rgba(107,114,128,0.08)";
  return (
    <div
      className="inline-flex flex-col items-center rounded-lg"
      style={{
        padding: small ? "3px 8px" : "6px 12px",
        background: bg,
        border: `1px solid ${color}22`,
        minWidth: small ? 44 : 56,
      }}
    >
      <span className="font-mono font-bold" style={{ fontSize: small ? 14 : 18, color }}>
        {score}
      </span>
      {label && (
        <span className="uppercase tracking-wide" style={{ fontSize: 9, color: "#8896A6", marginTop: 1 }}>
          {label}
        </span>
      )}
    </div>
  );
}

function CategoryPill({
  category,
  count,
  selected,
  onClick,
}: {
  category: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  const cat = PAIN_CATEGORIES.find((c) => c.id === category);
  if (!cat) return null;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full transition-all duration-200"
      style={{
        padding: "6px 14px",
        border: `1.5px solid ${selected ? cat.color : "transparent"}`,
        background: selected ? `${cat.color}15` : "rgba(255,255,255,0.04)",
        color: selected ? cat.color : "#8896A6",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <span>{cat.icon}</span>
      <span>{cat.label}</span>
      {count != null && (
        <span
          className="rounded-xl text-xs font-semibold"
          style={{
            background: selected ? cat.color : "rgba(255,255,255,0.08)",
            color: selected ? "#fff" : "#8896A6",
            padding: "1px 7px",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function PostCard({
  post,
  onAnalyze,
  analyzing,
}: {
  post: Post;
  onAnalyze: (id: string) => void;
  analyzing: boolean;
}) {
  const cat = PAIN_CATEGORIES.find((c) => c.id === post.category);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        padding: 20,
        borderLeft: `3px solid ${cat?.color || "#555"}`,
      }}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-mono text-xs" style={{ color: "#6B7280" }}>
              {post.community}
            </span>
            <span className="w-1 h-1 rounded-full" style={{ background: "#333" }} />
            <span className="text-xs" style={{ color: "#6B7280" }}>
              {post.timestamp.toLocaleDateString()}
            </span>
            <span className="w-1 h-1 rounded-full" style={{ background: "#333" }} />
            <span
              className="text-xs rounded-xl font-medium"
              style={{
                padding: "2px 8px",
                background: "rgba(59,130,246,0.1)",
                color: "#60A5FA",
              }}
            >
              {post.stage}
            </span>
          </div>
          <h4
            className="text-sm font-semibold cursor-pointer leading-relaxed"
            style={{ color: "#E2E8F0" }}
            onClick={() => setExpanded(!expanded)}
          >
            {post.title}
          </h4>
          {expanded && (
            <p className="mt-2.5 text-sm leading-relaxed" style={{ color: "#8896A6" }}>
              {post.body}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2.5">
            <span className="text-xs" style={{ color: "#6B7280" }}>
              ▲ {post.upvotes}
            </span>
            <span className="text-xs" style={{ color: "#6B7280" }}>
              💬 {post.comments}
            </span>
            <span
              className="text-xs rounded-md"
              style={{ padding: "2px 8px", background: `${cat?.color}15`, color: cat?.color }}
            >
              {cat?.label}
            </span>
          </div>
          {post.aiSummary && (
            <div
              className="mt-3 p-3 rounded-lg"
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.15)",
              }}
            >
              <div
                className="uppercase tracking-widest font-semibold mb-1.5"
                style={{ fontSize: 10, color: "#818CF8" }}
              >
                AI Analysis
              </div>
              <p className="text-sm leading-relaxed m-0" style={{ color: "#C4B5FD" }}>
                {post.aiSummary}
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
          <ScoreBadge score={post.compositeScore} label="Signal" />
          <div className="flex gap-1">
            <ScoreBadge score={post.intentScore} label="Intent" small />
            <ScoreBadge score={post.painScore} label="Pain" small />
          </div>
          {!post.aiSummary && (
            <button
              onClick={() => onAnalyze(post.id)}
              disabled={analyzing}
              className="mt-1 rounded-md text-xs font-medium transition-opacity"
              style={{
                padding: "5px 12px",
                border: "1px solid rgba(99,102,241,0.3)",
                background: "rgba(99,102,241,0.1)",
                color: "#818CF8",
                cursor: analyzing ? "wait" : "pointer",
                opacity: analyzing ? 0.5 : 1,
              }}
            >
              {analyzing ? "Analyzing..." : "🤖 AI Analyze"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  accent,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl flex-1"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        padding: "18px 20px",
        minWidth: 160,
      }}
    >
      <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
        {label}
      </div>
      <div className="font-mono text-3xl font-bold" style={{ color: accent || "#E2E8F0" }}>
        {value}
      </div>
      {subtext && (
        <div className="text-xs mt-1" style={{ color: "#6B7280" }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function MarketIntelligenceEngine() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [trendData, setTrendData] = useState<Record<string, unknown>[]>([]);
  const [contentOps, setContentOps] = useState<ContentOpportunity[]>([]);
  const [heatMap, setHeatMap] = useState<Record<string, HeatMapRow>>({});
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<keyof Post>("compositeScore");
  const [minScore, setMinScore] = useState(0);
  const [selectedStage, setSelectedStage] = useState("all");
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const p = generatePosts(120);
    setPosts(p);
    setTrendData(generateTrendData(p));
    setContentOps(generateContentOpportunities(p));
    setHeatMap(generateHeatMapData(p));
  }, []);

  const handleAnalyze = useCallback(
    async (postId: string) => {
      setAnalyzing(postId);
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const cat = PAIN_CATEGORIES.find((c) => c.id === post.category);

      try {
        const response = await fetch("/api/intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `You are a market intelligence analyst for NexTax.AI, an SMB acquisition advisory service. Analyze this Reddit post from an acquisition community and provide a brief (2-3 sentence) analysis covering: (1) the buyer's likely stage and sophistication level, (2) the specific knowledge gap or pain point, and (3) what type of NexTax service would address this need. Be direct and insightful.

Post Title: ${post.title}
Post Body: ${post.body}
Community: ${post.community}
Category: ${cat?.label}`,
              },
            ],
          }),
        });

        const data = await response.json();
        const summary =
          data.content?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("") ||
          "Analysis unavailable.";
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, aiSummary: summary } : p)));
      } catch {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  aiSummary: `Analysis temporarily unavailable. The post signals moderate-to-high buyer intent with a clear knowledge gap in ${cat?.label?.toLowerCase()}. This maps to NexTax's core advisory offerings.`,
                }
              : p
          )
        );
      }
      setAnalyzing(null);
    },
    [posts]
  );

  const filteredPosts = posts
    .filter((p) => selectedCategories.length === 0 || selectedCategories.includes(p.category))
    .filter((p) => p.compositeScore >= minScore)
    .filter((p) => selectedStage === "all" || p.stage === selectedStage)
    .filter((p) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q) || p.industry.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === "number" && typeof bVal === "number") return bVal - aVal;
      return 0;
    });

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) => (prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]));
  };

  const highSignalCount = posts.filter((p) => p.compositeScore >= 70).length;
  const avgPain = posts.length ? Math.round(posts.reduce((s, p) => s + p.painScore, 0) / posts.length) : 0;
  const topCategory = contentOps[0]?.category?.label || "—";
  const activeBuyers = posts.filter((p) => p.intentScore >= 60).length;

  const TABS = [
    { id: "overview", label: "Overview", icon: "◉" },
    { id: "feed", label: "Signal Feed", icon: "⚡" },
    { id: "trends", label: "Trends", icon: "📈" },
    { id: "content", label: "Content Ops", icon: "💡" },
    { id: "heatmap", label: "Service Gap Map", icon: "🗺️" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0B0F17", color: "#E2E8F0" }}>
      {/* ── HEADER ── */}
      <div
        className="flex justify-between items-center flex-wrap gap-4"
        style={{
          padding: "24px 32px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg text-lg font-bold text-white"
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
            }}
          >
            N
          </div>
          <div>
            <h1
              className="text-xl font-bold m-0"
              style={{
                fontFamily: "'Playfair Display', serif",
                background: "linear-gradient(135deg, #E2E8F0 0%, #94A3B8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Market Intelligence Engine
            </h1>
            <span className="text-xs tracking-wider" style={{ color: "#6B7280" }}>
              COMMUNITY SIGNAL ANALYZER • PHASE 1 (SYNTHETIC DATA)
            </span>
          </div>
        </div>
        <div
          className="text-xs font-medium rounded-lg"
          style={{
            padding: "6px 14px",
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.2)",
            color: "#34D399",
          }}
        >
          ● {posts.length} posts indexed
        </div>
      </div>

      {/* ── TAB NAV ── */}
      <div
        className="flex gap-0.5 overflow-x-auto"
        style={{
          padding: "0 32px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 whitespace-nowrap bg-transparent transition-all duration-200"
            style={{
              padding: "14px 20px",
              border: "none",
              color: activeTab === tab.id ? "#E2E8F0" : "#6B7280",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              borderBottom: activeTab === tab.id ? "2px solid #818CF8" : "2px solid transparent",
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: "24px 32px", maxWidth: 1280, margin: "0 auto" }}>
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div>
            <div className="flex gap-4 mb-7 flex-wrap">
              <StatCard label="High-Signal Posts" value={highSignalCount} subtext="Score ≥ 70" accent="#E8453C" />
              <StatCard label="Avg Pain Score" value={avgPain} subtext="Across all posts" accent="#F59E0B" />
              <StatCard label="Top Gap Category" value={topCategory} subtext="Highest opportunity" accent="#8B5CF6" />
              <StatCard label="Active Buyer Signals" value={activeBuyers} subtext="Intent ≥ 60" accent="#3B82F6" />
            </div>

            <div
              className="rounded-xl mb-6"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: 24,
              }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#94A3B8" }}>
                Pain Point Trends (12 Weeks)
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" stroke="#4B5563" fontSize={11} />
                  <YAxis stroke="#4B5563" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#1A1F2E",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#94A3B8" }}
                  />
                  {PAIN_CATEGORIES.slice(0, 4).map((cat) => (
                    <Area
                      key={cat.id}
                      type="monotone"
                      dataKey={cat.id}
                      stroke={cat.color}
                      fill={`${cat.color}20`}
                      strokeWidth={2}
                      name={cat.label}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div
              className="rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: 24,
              }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#94A3B8" }}>
                Signal Distribution by Category
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={PAIN_CATEGORIES.map((cat) => ({
                    name: cat.label.length > 16 ? cat.label.slice(0, 16) + "…" : cat.label,
                    count: posts.filter((p) => p.category === cat.id).length,
                    color: cat.color,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#4B5563" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#4B5563" fontSize={11} width={130} />
                  <Tooltip
                    contentStyle={{
                      background: "#1A1F2E",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" name="Posts" radius={[0, 4, 4, 0]}>
                    {PAIN_CATEGORIES.map((cat, i) => (
                      <Cell key={i} fill={cat.color} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* SIGNAL FEED */}
        {activeTab === "feed" && (
          <div>
            <div
              className="rounded-xl mb-5"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: 20,
              }}
            >
              <div className="flex gap-4 items-center mb-3.5 flex-wrap">
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg text-sm outline-none"
                  style={{
                    padding: "8px 14px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#E2E8F0",
                    width: 220,
                  }}
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as keyof Post)}
                  className="rounded-lg text-sm outline-none"
                  style={{
                    padding: "8px 12px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#E2E8F0",
                  }}
                >
                  <option value="compositeScore">Sort: Signal Score</option>
                  <option value="painScore">Sort: Pain Score</option>
                  <option value="intentScore">Sort: Intent Score</option>
                  <option value="upvotes">Sort: Engagement</option>
                </select>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="rounded-lg text-sm outline-none"
                  style={{
                    padding: "8px 12px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#E2E8F0",
                  }}
                >
                  <option value="all">All Stages</option>
                  {BUYER_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs" style={{ color: "#6B7280" }}>
                    Min Score: {minScore}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    value={minScore}
                    onChange={(e) => setMinScore(+e.target.value)}
                    className="w-24"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {PAIN_CATEGORIES.map((cat) => {
                  const count = posts.filter((p) => p.category === cat.id).length;
                  return (
                    <CategoryPill
                      key={cat.id}
                      category={cat.id}
                      count={count}
                      selected={selectedCategories.includes(cat.id)}
                      onClick={() => toggleCategory(cat.id)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="text-xs mb-3" style={{ color: "#6B7280" }}>
              Showing {Math.min(filteredPosts.length, 30)} of {filteredPosts.length} posts
            </div>

            <div className="flex flex-col gap-2.5">
              {filteredPosts.slice(0, 30).map((post) => (
                <PostCard key={post.id} post={post} onAnalyze={handleAnalyze} analyzing={analyzing === post.id} />
              ))}
              {filteredPosts.length > 30 && (
                <div className="text-center py-4 text-sm" style={{ color: "#6B7280" }}>
                  Showing top 30 results. Refine filters to narrow further.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRENDS */}
        {activeTab === "trends" && (
          <div>
            <div
              className="rounded-xl mb-6"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: 24,
              }}
            >
              <h3 className="text-sm font-semibold mb-1" style={{ color: "#E2E8F0" }}>
                Pain Point Volume Over 12 Weeks
              </h3>
              <p className="text-xs mb-5" style={{ color: "#6B7280" }}>
                Track how discussion topics shift over time to identify emerging buyer concerns.
              </p>
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" stroke="#4B5563" fontSize={11} />
                  <YAxis stroke="#4B5563" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#1A1F2E",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  {PAIN_CATEGORIES.map((cat) => (
                    <Area
                      key={cat.id}
                      type="monotone"
                      dataKey={cat.id}
                      stroke={cat.color}
                      fill={`${cat.color}15`}
                      strokeWidth={2}
                      name={cat.label}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-4">
                {PAIN_CATEGORIES.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-1.5 text-xs" style={{ color: "#8896A6" }}>
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cat.color }} />
                    {cat.label}
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: 24,
              }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#E2E8F0" }}>
                Industry Interest Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={INDUSTRIES.map((ind) => ({
                    name: ind.length > 14 ? ind.slice(0, 14) + "…" : ind,
                    count: posts.filter((p) => p.industry === ind).length,
                  })).sort((a, b) => b.count - a.count)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#4B5563" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#4B5563" fontSize={11} width={120} />
                  <Tooltip
                    contentStyle={{
                      background: "#1A1F2E",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#6366F1" fillOpacity={0.6} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CONTENT OPS */}
        {activeTab === "content" && (
          <div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "#8896A6" }}>
              Content opportunities ranked by a combination of pain intensity, buyer intent, and discussion volume.
              These represent the highest-leverage topics for thought leadership content.
            </p>
            <div className="flex flex-col gap-4">
              {contentOps.map((op, i) => (
                <div
                  key={op.category.id}
                  className="rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    padding: 24,
                    borderLeft: `3px solid ${op.category.color}`,
                  }}
                >
                  <div className="flex justify-between items-start mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{op.category.icon}</span>
                      <h3 className="text-base font-bold m-0" style={{ color: "#E2E8F0" }}>
                        {op.category.label}
                      </h3>
                      <span
                        className="text-xs rounded-xl font-semibold"
                        style={{
                          padding: "2px 10px",
                          background: i === 0 ? "rgba(232,69,60,0.15)" : "rgba(255,255,255,0.05)",
                          color: i === 0 ? "#E8453C" : "#6B7280",
                        }}
                      >
                        #{i + 1} Opportunity
                      </span>
                    </div>
                    <div
                      className="text-center rounded-lg"
                      style={{
                        padding: "8px 16px",
                        background: `${op.category.color}12`,
                        border: `1px solid ${op.category.color}33`,
                      }}
                    >
                      <div className="font-mono text-2xl font-bold" style={{ color: op.category.color }}>
                        {op.opportunityScore}
                      </div>
                      <div className="uppercase text-xs" style={{ color: "#8896A6", fontSize: 9 }}>
                        Opp Score
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-5 mb-4 flex-wrap">
                    <div className="text-xs" style={{ color: "#8896A6" }}>
                      <span className="font-mono font-semibold" style={{ color: "#E2E8F0" }}>
                        {op.postCount}
                      </span>{" "}
                      posts
                    </div>
                    <div className="text-xs" style={{ color: "#8896A6" }}>
                      Avg Pain:{" "}
                      <span className="font-mono font-semibold" style={{ color: "#F59E0B" }}>
                        {op.avgPain}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: "#8896A6" }}>
                      Avg Intent:{" "}
                      <span className="font-mono font-semibold" style={{ color: "#3B82F6" }}>
                        {op.avgIntent}
                      </span>
                    </div>
                  </div>

                  <div className="uppercase tracking-wider text-xs mb-2" style={{ color: "#6B7280" }}>
                    Suggested Content Topics
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {op.suggestedTopics.map((topic, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-2.5 rounded-lg text-sm"
                        style={{
                          padding: "8px 12px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          color: "#C4B5FD",
                        }}
                      >
                        <span style={{ color: op.category.color }}>→</span>
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SERVICE GAP HEAT MAP */}
        {activeTab === "heatmap" && (
          <div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "#8896A6" }}>
              This matrix maps buyer pain points against NexTax service tiers. Dark cells indicate strong alignment —
              where your services directly address high-volume buyer needs. Light cells reveal gaps where new products
              could capture unmet demand.
            </p>
            <div
              className="rounded-xl overflow-x-auto"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: 24,
              }}
            >
              <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 4 }}>
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium" style={{ padding: "8px 12px", color: "#6B7280", minWidth: 180 }}>
                      Pain Point
                    </th>
                    {SERVICE_TIERS.map((tier) => (
                      <th key={tier.id} className="text-center text-xs font-semibold" style={{ padding: "8px 16px", color: tier.color, minWidth: 140 }}>
                        <div>{tier.name}</div>
                        <div className="font-normal mt-0.5" style={{ fontSize: 10, color: "#6B7280" }}>
                          {tier.description}
                        </div>
                      </th>
                    ))}
                    <th className="text-center text-xs font-medium" style={{ padding: "8px 12px", color: "#6B7280" }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PAIN_CATEGORIES.map((cat) => {
                    const row = heatMap[cat.id] || { tier1: 0, tier2: 0, tier3: 0, total: 0 };
                    const maxVal = Math.max(
                      ...Object.values(heatMap).map((r) => Math.max(r.tier1, r.tier2, r.tier3))
                    );
                    return (
                      <tr key={cat.id}>
                        <td className="flex items-center gap-2 text-sm" style={{ padding: "10px 12px", color: "#E2E8F0" }}>
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </td>
                        {SERVICE_TIERS.map((tier) => {
                          const val = row[tier.id as keyof Omit<HeatMapRow, "total">];
                          const intensity = maxVal > 0 ? val / maxVal : 0;
                          const rgb = tier.id === "tier1" ? "59,130,246" : tier.id === "tier2" ? "139,92,246" : "16,185,129";
                          return (
                            <td
                              key={tier.id}
                              className="text-center font-mono text-base font-bold rounded-md"
                              style={{
                                padding: 10,
                                background: `rgba(${rgb}, ${intensity * 0.35 + 0.03})`,
                                color: "#E2E8F0",
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}
                        <td className="text-center font-mono text-sm font-semibold" style={{ padding: 10, color: cat.color }}>
                          {row.total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <div className="rounded-xl p-5" style={{ background: "rgba(232,69,60,0.06)", border: "1px solid rgba(232,69,60,0.15)" }}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: "#E8453C" }}>
                  🔴 Positioning Opportunities
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: "#8896A6" }}>
                  High-signal pain points that align with existing services. These represent areas where your messaging
                  can directly address proven buyer concerns.
                </p>
              </div>
              <div className="rounded-xl p-5" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: "#8B5CF6" }}>
                  🟣 Product Development Signals
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: "#8896A6" }}>
                  Categories where buyer pain is high but service coverage is low. Consider developing new tools or
                  reports to fill these gaps.
                </p>
              </div>
              <div className="rounded-xl p-5" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: "#10B981" }}>
                  🟢 Thought Leadership Targets
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: "#8896A6" }}>
                  Pain points with high volume but low commercial alignment. Perfect candidates for educational content
                  and brand authority building.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
