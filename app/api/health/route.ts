import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    database: "supabase-ready",
    features: {
      sharedAuth: true,
      crossPlatform: true,
      iframeEmbedding: true,
    },
  })
}
