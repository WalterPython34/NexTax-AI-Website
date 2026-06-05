// Admin API for the AcquiFlow panel.
//   GET  -> list leads (filter by route/tier/status, sort by score)
//   POST -> manual add (Searchfunder / Axial profiles you paste in)

import { NextResponse } from "next/server";
import { supabase } from "@/lib/buyer-engine/store";
import { processSignal } from "@/lib/buyer-engine/pipeline";
import type { RawSignal } from "@/lib/buyer-engine/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let q = supabase.from("buyer_leads").select("*").order("buyer_score", { ascending: false });
  for (const key of ["route", "intent_tier", "status", "source"] as const) {
    const v = searchParams.get(key);
    if (v) q = q.eq(key, v);
  }
  const { data, error } = await q.limit(Number(searchParams.get("limit") ?? 100));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<RawSignal> & { text: string };
  const signal: RawSignal = {
    source: (body.source as RawSignal["source"]) ?? "manual",
    source_url: body.source_url,
    author_name: body.author_name,
    author_handle: body.author_handle,
    company: body.company,
    text: body.text,
  };
  const result = await processSignal(signal);
  return NextResponse.json({ ok: true, ...result });
}
