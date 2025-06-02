import { NextResponse } from "next/server"

export async function GET() {
  console.log("🧪 Test API route called!")
  return NextResponse.json({
    message: "API is working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
}
