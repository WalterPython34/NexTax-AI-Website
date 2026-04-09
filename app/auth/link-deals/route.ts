// app/api/auth/link-deals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      return NextResponse.json(
        { success: false, error: "user_id and email are required" },
        { status: 400 }
      );
    }

    // ── 1. Link deal_runs ────────────────────────────────────────────────────
    // Only update rows where:
    //   - pending_email matches (case-insensitive)
    //   - user_id IS NULL (not yet linked) — idempotent safety
    // After linking, clear pending_email (it has served its purpose)
    const { data: linkedDeals, error: dealsError } = await supabaseAdmin
      .from("deal_runs")
      .update({
        user_id,
        is_anonymous: false,
        pending_email: null,  // clear bridge field after successful link
      })
      .ilike("pending_email", email)
      .is("user_id", null)   // only unlinked rows — idempotent
      .select("id");

    if (dealsError) {
      console.error("link-deals: deal_runs update error:", dealsError);
      // Non-fatal — continue to deal_leads
    }

    // ── 2. Link deal_leads ───────────────────────────────────────────────────
    // Same idempotent pattern — only update unlinked rows
    const { data: linkedLeads, error: leadsError } = await supabaseAdmin
      .from("deal_leads")
      .update({
        user_id,
        linked_at: new Date().toISOString(),
      })
      .ilike("email", email)
      .is("user_id", null)   // only unlinked rows — idempotent
      .select("id");

    if (leadsError) {
      console.error("link-deals: deal_leads update error:", leadsError);
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      deals_linked: linkedDeals?.length ?? 0,
      leads_linked: linkedLeads?.length ?? 0,
    });
  } catch (err) {
    console.error("link-deals: unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
