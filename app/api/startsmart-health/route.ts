import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Health check for StartSmart GPT integration
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "nextax-startsmart-integration",
      version: "1.0.0",
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
