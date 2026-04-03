import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, source, industry, dealScore, metadata } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // ── 1. Insert into deal_leads
    const { error: insertError } = await supabase.from("deal_leads").insert({
      name:       name?.trim() || null,
      email:      email.trim().toLowerCase(),
      source:     source || "unknown",
      industry:   industry || null,
      deal_score: dealScore || null,
      metadata:   metadata || {},
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      // Log the real error server-side but don't expose it to client
      console.error("[capture-lead] Supabase insert error:", insertError.message, insertError.details);
    } else {
      console.log(`[capture-lead] Lead saved: ${email} | source: ${source} | industry: ${industry}`);
    }

    // ── 2. Fire Zapier webhook (non-blocking — don't await)
    const zapierUrl = process.env.ZAPIER_LEAD_WEBHOOK_URL;
    if (zapierUrl) {
      fetch(zapierUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:       name?.trim() || "",
          email:      email.trim().toLowerCase(),
          source,
          industry:   industry || "",
          deal_score: dealScore || null,
          metadata:   metadata || {},
          timestamp:  new Date().toISOString(),
        }),
      }).catch((err) => console.error("[capture-lead] Zapier webhook failed:", err.message));
    }

    // ── Always return success so the UI never blocks on lead capture
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[capture-lead] Unexpected error:", err.message);
    // Still return success — lead capture should never break the tool flow
    return NextResponse.json({ success: true });
  }
}
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead capture error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
