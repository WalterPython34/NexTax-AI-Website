import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  console.log("✅ Test endpoint reached from:", request.headers.get("host"))

  return NextResponse.json({
    message: "Custom domain routing working",
    hostname: request.headers.get("host"),
    timestamp: Date.now(),
  })
}
