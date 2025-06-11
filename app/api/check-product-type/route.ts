import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    })

    // Check if any of the products include EIN filing
    const includesEIN = session.line_items?.data.some((item) => {
      const product = item.price?.product as Stripe.Product
      // Check product metadata or name for EIN-related keywords
      return (
        product.name.toLowerCase().includes("ein") ||
        product.name.toLowerCase().includes("llc") ||
        product.name.toLowerCase().includes("corporation") ||
        product.name.toLowerCase().includes("s-corp") ||
        product.name.toLowerCase().includes("scorp") ||
        (product.metadata && product.metadata.includesEIN === "true")
      )
    })

    return NextResponse.json({ includesEIN })
  } catch (error) {
    console.error("Error checking product type:", error)
    return NextResponse.json({ error: "Failed to check product type" }, { status: 500 })
  }
}

