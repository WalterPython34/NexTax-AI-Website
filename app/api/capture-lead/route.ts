import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, source, industry, dealScore, metadata } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Save to Supabase
    const { error } = await supabase.from("deal_leads").insert({
      name: name || null,
      email,
      source: source || "unknown",
      industry: industry || null,
      deal_score: dealScore || null,
      metadata: metadata || {},
    });

    if (error) {
      console.error("Lead insert error:", error);
      // Don't fail the request — lead capture shouldn't block the user
      return NextResponse.json({ success: true, warning: "Lead may not have been saved" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead capture error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
