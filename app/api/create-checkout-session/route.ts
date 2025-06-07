import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

const CORS_ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (origin && CORS_ALLOW_ORIGIN?.includes(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } else {
    return new NextResponse(null, { status: 405 })
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")

  if (!origin || !CORS_ALLOW_ORIGIN?.includes(origin)) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  const { priceId, productName } = await request.json()

  if (!priceId) {
    return new NextResponse(JSON.stringify({ error: "Price ID is required" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
      },
    })
  }

  try {
    console.log("🛒 Creating checkout session...")
    // First retrieve the price to check if it's recurring
    const price = await stripe.prices.retrieve(priceId)
    console.log("💲 Price details:", {
      id: price.id,
      active: price.active,
      currency: price.currency,
      unit_amount: price.unit_amount,
      product: price.product,
      type: price.type,
      recurring: price.recurring ? "yes" : "no",
    })

    // Determine the correct mode based on whether the price is recurring
    const mode = price.recurring ? "subscription" : "payment"
    console.log(`🔄 Using checkout mode: ${mode} based on price type`)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode, // Dynamically set based on price type
      success_url: `${request.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin")}/pricing`,
      customer_creation: "always",
      billing_address_collection: "required",
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        product_name: productName,
      },
    })

    return new NextResponse(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
      },
    })
  } catch (error: any) {
    console.error("Error creating checkout session:", error)
    return new NextResponse(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
      },
    })
  }
}
