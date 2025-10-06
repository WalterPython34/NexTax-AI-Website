import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, totalCost, businessType } = await request.json()

    console.log("[v0] Calculator lead captured:", {
      email,
      totalCost,
      businessType,
      timestamp: new Date().toISOString(),
    })

    // You can add database storage here later if needed
    // For now, just return success so the PDF generation proceeds

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error capturing calculator lead:", error)
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 })
  }
}
