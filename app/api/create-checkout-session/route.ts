import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  console.log("🛒 Checkout session API called")
  console.log("🕐 Timestamp:", new Date().toISOString())

  try {
    // Enhanced environment check
    console.log("🔑 Environment check:")
    console.log("STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "Present" : "❌ MISSING")
    console.log("STRIPE_SECRET_KEY type:", process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "LIVE" : "TEST")
    console.log(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:",
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? "Present" : "❌ MISSING",
    )
    console.log(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY type:",
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live") ? "LIVE" : "TEST",
    )

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ STRIPE_SECRET_KEY is missing")
      return NextResponse.json({ error: "Stripe configuration error: Secret key missing" }, { status: 500 })
    }

    const { priceId, productName } = await request.json()
    console.log("📦 Creating session for:", { priceId, productName })
    console.log("🔍 Price ID details:", {
      priceId,
      length: priceId?.length,
      startsWithPrice: priceId?.startsWith("price_"),
      type: typeof priceId,
    })

    if (!priceId) {
      console.error("❌ Price ID is missing")
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 })
    }

    // Test if the price exists in Stripe before creating session
    console.log("🔍 Verifying price exists in Stripe...")
    try {
      const price = await stripe.prices.retrieve(priceId)
      console.log("✅ Price found:", {
        id: price.id,
        active: price.active,
        currency: price.currency,
        unit_amount: price.unit_amount,
        product: price.product,
        recurring: price.recurring ? "yes" : "no",
      })

      // Determine the correct mode based on whether the price is recurring
      const mode = price.recurring ? "subscription" : "payment"
      console.log(`🔄 Using checkout mode: ${mode} based on price type`)

      console.log("🛒 Creating checkout session...")

      // Base session configuration
      const sessionConfig: any = {
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: mode,
        success_url: `${request.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${request.headers.get("origin")}/pricing`,
        billing_address_collection: "required",
        phone_number_collection: {
          enabled: true,
        },
        metadata: {
          product_name: productName,
        },
      }

      // Add customer_creation only for payment mode (one-time payments)
      if (mode === "payment") {
        sessionConfig.customer_creation = "always"
      }
      // For subscription mode, Stripe automatically creates customers

      const session = await stripe.checkout.sessions.create(sessionConfig)

      console.log("✅ Session created successfully:", session.id)

      return NextResponse.json({ sessionId: session.id })
    } catch (priceError: any) {
      console.error("❌ Price verification failed:", priceError.message)
      return NextResponse.json(
        {
          error: `Invalid price ID: ${priceError.message}`,
          priceId: priceId,
          suggestion: "Please check if this price ID exists in your Stripe dashboard",
        },
        { status: 400 },
      )
    }
  } catch (err: any) {
    console.error("❌ Stripe error:", err)
    console.error("❌ Error type:", err.type)
    console.error("❌ Error code:", err.code)
    console.error("❌ Error message:", err.message)

    // Provide more specific error messages
    let errorMessage = "An unexpected error occurred"

    if (err.type === "StripeCardError") {
      errorMessage = "Your card was declined"
    } else if (err.type === "StripeRateLimitError") {
      errorMessage = "Too many requests made to the API too quickly"
    } else if (err.type === "StripeInvalidRequestError") {
      errorMessage = "Invalid parameters were supplied to Stripe's API"
    } else if (err.type === "StripeAPIError") {
      errorMessage = "An error occurred internally with Stripe's API"
    } else if (err.type === "StripeConnectionError") {
      errorMessage = "Some kind of error occurred during the HTTPS communication"
    } else if (err.type === "StripeAuthenticationError") {
      errorMessage = "You probably used an incorrect API key"
    } else if (err.message) {
      errorMessage = err.message
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 },
    )
  }
}
