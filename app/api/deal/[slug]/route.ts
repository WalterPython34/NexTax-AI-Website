import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Fetch deal page by slug
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Try slug first, then deal_address
    let { data: page, error } = await supabase
      .from("deal_pages")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (!page) {
      ({ data: page, error } = await supabase
        .from("deal_pages")
        .select("*")
        .eq("deal_address", slug.toUpperCase())
        .eq("is_active", true)
        .single());
    }

    if (!page) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Increment view count (non-blocking)
    supabase
      .from("deal_pages")
      .update({ view_count: (page.view_count || 0) + 1 })
      .eq("id", page.id)
      .then();

    return NextResponse.json({ deal: page });
  } catch (error) {
    console.error("Fetch deal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — Cast a vote on a deal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { vote_type, voter_fingerprint } = body;

    if (!["good", "overpriced", "risky"].includes(vote_type)) {
      return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
    }

    // Find the deal page
    let { data: page } = await supabase
      .from("deal_pages")
      .select("id, votes_good, votes_overpriced, votes_risky")
      .eq("slug", slug)
      .single();

    if (!page) {
      ({ data: page } = await supabase
        .from("deal_pages")
        .select("id, votes_good, votes_overpriced, votes_risky")
        .eq("deal_address", slug.toUpperCase())
        .single());
    }

    if (!page) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Insert vote (unique constraint prevents dupes)
    const { error: voteError } = await supabase
      .from("deal_votes")
      .insert({
        deal_page_id: page.id,
        vote_type,
        voter_fingerprint: voter_fingerprint || "anonymous",
      });

    if (voteError) {
      if (voteError.code === "23505") {
        return NextResponse.json({ error: "Already voted on this deal" }, { status: 409 });
      }
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }

    // Update vote counts
    const updateField = vote_type === "good" ? "votes_good" : vote_type === "overpriced" ? "votes_overpriced" : "votes_risky";
    const currentCount = page[updateField as keyof typeof page] as number || 0;

    await supabase
      .from("deal_pages")
      .update({ [updateField]: currentCount + 1 })
      .eq("id", page.id);

    return NextResponse.json({
      success: true,
      votes: {
        good: page.votes_good + (vote_type === "good" ? 1 : 0),
        overpriced: page.votes_overpriced + (vote_type === "overpriced" ? 1 : 0),
        risky: page.votes_risky + (vote_type === "risky" ? 1 : 0),
      },
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
