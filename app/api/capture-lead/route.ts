import { NextRequest, NextResponse } from "next/server";

// This route captures leads from both Deal Reality Check and Deal Risk Analyzer.
// Currently stores in-memory for demo. Connect to Supabase for production:
//
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
//
// Then replace the in-memory store with:
// await supabase.from('deal_leads').insert({ name, email, source, industry, deal_score, metadata });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, source, industry, dealScore, metadata } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // TODO: Replace with Supabase insert
    console.log("[LEAD CAPTURED]", {
      name,
      email,
      source, // "reality-check" or "risk-analyzer"
      industry,
      dealScore,
      metadata,
      timestamp: new Date().toISOString(),
    });

    // TODO: Optionally trigger SendGrid welcome email
    // await sendWelcomeEmail(email, name, source);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead capture error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
