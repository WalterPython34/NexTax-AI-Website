// app/api/deal-intelligence/route.ts
// Generates AI-powered deal intelligence using Claude.
// Called from the Notes panel "Generate Intelligence" button.
// Saves results to deal_intelligence table for caching.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";
export const maxDuration = 30;

// Industry labels for human-readable prompts
const IL: Record<string, string> = {
  laundromat: "Laundromat", hvac: "HVAC", landscaping: "Landscaping",
  carwash: "Car Wash", dental: "Dental Practice", gym: "Gym / Fitness",
  restaurant: "Restaurant", autorepair: "Auto Repair", cleaning: "Cleaning Service",
  ecommerce: "Ecommerce", saas: "SaaS", insurance: "Insurance Agency",
  plumbing: "Plumbing", roofing: "Roofing", petcare: "Pet Care",
  pharmacy: "Pharmacy", daycare: "Daycare", medspa: "Med Spa",
  accounting: "Accounting / Tax", electrical: "Electrical",
  healthcare: "Healthcare", transportation: "Transportation",
  printing: "Printing", storage: "Self-Storage", painting: "Painting",
  security: "Security Services", construction: "Construction",
  engineering: "Engineering", grocery: "Grocery", hairsalon: "Hair Salon",
  marketing: "Marketing Agency", pestcontrol: "Pest Control",
  physicaltherapy: "Physical Therapy", propertymanage: "Property Management",
  realestatebrok: "Real Estate Brokerage", remodeling: "Remodeling",
  seniorcare: "Senior Care", staffing: "Staffing Agency",
  veterinary: "Veterinary Practice", signmaking: "Sign Manufacturing",
  clothing: "Clothing Retail",
};

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deal_id, user_id } = body;

    if (!deal_id || !user_id) {
      return NextResponse.json({ error: "Missing deal_id or user_id" }, { status: 400 });
    }

    // Check for cached intelligence first
    const { data: cached } = await supabaseAdmin
      .from("deal_intelligence")
      .select("*")
      .eq("deal_id", deal_id)
      .eq("user_id", user_id)
      .single();

    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch the deal
    const { data: deal, error: dealError } = await supabaseAdmin
      .from("deal_runs")
      .select("*")
      .eq("id", deal_id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Verify ownership
    if (deal.user_id && deal.user_id !== user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build the prompt
    const industryLabel = IL[deal.industry] || deal.industry;
    const revenue = deal.revenue ?? 0;
    const sde = deal.sde ?? 0;
    const askingPrice = deal.asking_price ?? 0;
    const fairValue = deal.fair_value ?? 0;
    const dscr = deal.dscr ?? 0;
    const multiple = deal.valuation_multiple ?? 0;
    const score = deal.overall_score ?? 0;
    const riskLevel = deal.risk_level ?? "unknown";
    const gapPct = fairValue > 0 ? Math.round(((askingPrice - fairValue) / fairValue) * 100) : 0;
    const sdeMargin = revenue > 0 ? Math.round((sde / revenue) * 100) : 0;
    const redFlags = deal.red_flags ?? [];
    const greenFlags = deal.green_flags ?? [];
    const city = deal.city ?? "";
    const state = deal.state ?? "";
    const location = city && state ? `${city}, ${state}` : city || state || "undisclosed location";

    const prompt = `You are an experienced SMB acquisition advisor analyzing a deal for a buyer.

DEAL DETAILS:
- Industry: ${industryLabel}
- Location: ${location}
- Revenue: ${fmtUsd(revenue)}
- SDE (Seller's Discretionary Earnings): ${fmtUsd(sde)}
- SDE Margin: ${sdeMargin}%
- Asking Price: ${fmtUsd(askingPrice)}
- Asking Multiple: ${multiple.toFixed(2)}x SDE
- Fair Market Value (modeled): ${fmtUsd(fairValue)}
- Pricing Gap: ${gapPct > 0 ? "+" : ""}${gapPct}% vs fair value
- DSCR: ${dscr.toFixed(2)}x
- Overall Score: ${score}/100
- Risk Level: ${riskLevel}
${redFlags.length > 0 ? `- Red Flags: ${redFlags.join("; ")}` : ""}
${greenFlags.length > 0 ? `- Green Flags: ${greenFlags.join("; ")}` : ""}

Respond with ONLY a JSON object (no markdown, no backticks, no preamble) with exactly these fields:

{
  "what_it_means": "A 2-3 sentence plain-language summary of what this deal represents for a buyer. Be specific to this industry and these numbers. Do not restate the numbers - interpret them. What is the real opportunity or concern here?",
  "key_risks": ["risk1", "risk2", "risk3", "risk4", "risk5"],
  "must_be_true": ["assumption1", "assumption2", "assumption3"],
  "suggested_approach": "A 2-3 sentence recommended next step. Be specific and actionable. If the deal is overpriced, say by how much and what price makes it work. If it needs investigation, say exactly what to investigate first."
}

RULES:
- key_risks: exactly 5 items. Each is one concise sentence. Be specific to THIS deal, not generic. Reference the actual numbers.
- must_be_true: exactly 3 items. Each starts with "The" or "Reported" or "Current". These are the assumptions that must hold for the deal to work. If any breaks, the deal breaks.
- Do not use em dashes. Use commas or periods instead.
- Write as an experienced acquisition advisor, not a financial textbook.
- Be direct and opinionated. Buyers want clarity, not hedging.`;

    // Call Claude
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error("Claude API error:", errText);
      return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content
      ?.map((c: any) => c.type === "text" ? c.text : "")
      .join("")
      .trim() ?? "";

    // Parse the JSON response
    let intel: {
      what_it_means: string;
      key_risks: string[];
      must_be_true: string[];
      suggested_approach: string;
    };

    try {
      // Strip markdown fences if present
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      intel = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse Claude response:", rawText.slice(0, 500));
      // Fallback: generate structured response from the deal data
      intel = {
        what_it_means: `This is a ${industryLabel} business in ${location} asking ${fmtUsd(askingPrice)} at ${multiple.toFixed(2)}x SDE. ${gapPct > 10 ? `The asking price is ${gapPct}% above modeled fair value, suggesting meaningful negotiation room.` : gapPct < -10 ? `The asking price is ${Math.abs(gapPct)}% below modeled fair value, which could indicate a motivated seller or undisclosed issues.` : `Pricing is close to modeled fair value.`} ${dscr >= 1.5 ? "Debt coverage is strong enough to support standard SBA financing." : dscr >= 1.25 ? "Debt coverage meets SBA minimums but leaves limited headroom." : "Debt coverage falls below SBA thresholds at current terms."}`,
        key_risks: [
          `Asking multiple of ${multiple.toFixed(2)}x ${multiple > 3 ? "exceeds" : "is within"} the typical range for ${industryLabel} acquisitions`,
          `SDE margin of ${sdeMargin}% ${sdeMargin > 30 ? "is above industry norms and requires add-back verification" : "appears within normal range"}`,
          `DSCR of ${dscr.toFixed(2)}x ${dscr < 1.25 ? "falls below SBA minimum thresholds" : "supports financing but should be stress tested"}`,
          `Revenue concentration and customer dependency have not been verified`,
          `Owner transition risk has not been assessed`,
        ],
        must_be_true: [
          `Reported SDE of ${fmtUsd(sde)} must be substantiated by 3 years of tax returns`,
          `The business must maintain current revenue levels through ownership transition`,
          `Current owner compensation must be replaceable at or below the add-back amount`,
        ],
        suggested_approach: `${gapPct > 15 ? `Open negotiations at ${fmtUsd(fairValue)} (${Math.abs(gapPct)}% below ask) and anchor to comparable transaction data.` : gapPct < -10 ? `This deal is priced favorably. Move quickly to verify earnings and secure exclusivity before competing buyers emerge.` : `Pricing is close to fair value. Focus diligence on earnings quality and transition risk before committing.`} Request tax returns and the add-back schedule as the first step.`,
      };
    }

    // Validate the parsed response
    if (!intel.what_it_means || !Array.isArray(intel.key_risks) || !Array.isArray(intel.must_be_true) || !intel.suggested_approach) {
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 502 });
    }

    const now = new Date().toISOString();

    // Save to deal_intelligence table
    const { error: saveError } = await supabaseAdmin
      .from("deal_intelligence")
      .upsert({
        deal_id: deal_id,
        user_id: user_id,
        what_it_means: intel.what_it_means,
        key_risks: intel.key_risks,
        must_be_true: intel.must_be_true,
        suggested_approach: intel.suggested_approach,
        generated_at: now,
      }, { onConflict: "deal_id,user_id" });

    if (saveError) {
      console.error("Failed to save deal intelligence:", saveError.message);
      // Still return the generated intel even if save fails
    }

    return NextResponse.json({
      deal_id,
      user_id,
      what_it_means: intel.what_it_means,
      key_risks: intel.key_risks,
      must_be_true: intel.must_be_true,
      suggested_approach: intel.suggested_approach,
      generated_at: now,
    });

  } catch (err) {
    console.error("deal-intelligence error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
