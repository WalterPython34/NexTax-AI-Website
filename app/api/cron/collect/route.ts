// Vercel Cron entry point: collect from public sources, then run the pipeline.
// Schedule in vercel.json. Protect with CRON_SECRET.

import { NextResponse } from "next/server";
import { collectAll } from "@/lib/buyer-engine/collectors";
import { runPipeline } from "@/lib/buyer-engine/pipeline";

export const maxDuration = 300; // seconds (Vercel Pro)

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const signals = await collectAll();
    const result = await runPipeline(signals);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[collect] failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
