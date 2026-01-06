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

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ STRIPE_SECRET_KEY is missing")
      return NextResponse.json({ error: "Stripe configuration error: Secret key missing" }, { status: 500 })
    }

    const body = await request.json()

    const { priceId, productName, lineItems, tier, state, addOns, metadata } = body

    // Determine if using new multi-line-item format or legacy single price format
    const isMultiItemCheckout = lineItems && Array.isArray(lineItems) && lineItems.length > 0

    console.log("📦 Checkout type:", isMultiItemCheckout ? "Multi-item (new)" : "Single-item (legacy)")
    console.log("📦 Request body:", { priceId, productName, lineItems, tier, state, addOns })

    if (!isMultiItemCheckout && !priceId) {
      console.error("❌ No price ID or line items provided")
      return NextResponse.json({ error: "Price ID or line items required" }, { status: 400 })
    }

    try {
      let sessionLineItems: { price: string; quantity: number }[] = []
      let mode: "payment" | "subscription" = "payment"

      if (isMultiItemCheckout) {
        console.log("🔍 Processing multi-item checkout with", lineItems.length, "items")

        // Verify all prices exist and determine mode
        for (const item of lineItems) {
          console.log("🔍 Verifying price:", item.price)
          const price = await stripe.prices.retrieve(item.price)
          console.log("✅ Price found:", {
            id: price.id,
            active: price.active,
            unit_amount: price.unit_amount,
          })

          // If any price is recurring, use subscription mode
          if (price.recurring) {
            mode = "subscription"
          }
        }

        sessionLineItems = lineItems
      } else {
        // Legacy single-price checkout flow
        console.log("🔍 Verifying single price:", priceId)
        const price = await stripe.prices.retrieve(priceId)
        console.log("✅ Price found:", {
          id: price.id,
          active: price.active,
          unit_amount: price.unit_amount,
        })

        mode = price.recurring ? "subscription" : "payment"
        sessionLineItems = [{ price: priceId, quantity: 1 }]
      }

      console.log(`🔄 Using checkout mode: ${mode}`)
      console.log("🛒 Creating checkout session with", sessionLineItems.length, "line items")

      // Build session configuration
      const sessionConfig: any = {
        payment_method_types: ["card"],
        line_items: sessionLineItems,
        mode: mode,
        success_url: `${request.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${request.headers.get("origin")}/pricing`,
        billing_address_collection: "required",
        phone_number_collection: {
          enabled: true,
        },
        metadata: {
          product_name: productName || (tier ? `${tier} Package` : "NexTax Service"),
          tier: tier || "",
          state: state || "",
          addOns: addOns?.join(",") || "",
          ...metadata,
        },
      }

      // Add customer_creation only for payment mode
      if (mode === "payment") {
        sessionConfig.customer_creation = "always"
      }

      const session = await stripe.checkout.sessions.create(sessionConfig)

      console.log("✅ Session created successfully:", session.id)

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
      })
    } catch (priceError: any) {
      console.error("❌ Price verification failed:", priceError.message)
      return NextResponse.json(
        {
          error: `Invalid price ID: ${priceError.message}`,
          suggestion: "Please check if this price ID exists in your Stripe dashboard",
        },
        { status: 400 },
      )
    }
  } catch (err: any) {
    console.error("❌ Stripe error:", err)
    console.error("❌ Error type:", err.type)
    console.error("❌ Error message:", err.message)

    let errorMessage = "An unexpected error occurred"

    if (err.type === "StripeCardError") {
      errorMessage = "Your card was declined"
    } else if (err.type === "StripeInvalidRequestError") {
      errorMessage = "Invalid parameters were supplied to Stripe's API"
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

