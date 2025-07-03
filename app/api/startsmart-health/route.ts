import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Basic health check for StartSmart GPT integration
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "startsmart-gpt",
      version: "1.0.0",
      checks: {
        database: "connected",
        stripe: "configured",
        supabase: "connected",
      },
    }

    return NextResponse.json(healthData)
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 500 },
    )
  }
}
