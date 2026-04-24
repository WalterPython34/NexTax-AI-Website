// app/api/create-checkout/route.ts
//
// Stripe Checkout Session endpoint for Acquisitions Pro upgrade.
//
// ⚠️  ONLY ADD THIS FILE IF YOUR EXISTING StripeCheckoutButton COMPONENT
//     does NOT already have a backend route it calls. If you already have
//     /api/create-checkout OR /api/stripe/checkout OR similar — SKIP THIS FILE
//     and just make sure your existing route accepts the price ID we're
//     passing: price_1TPbTTGA3ir6ndSx14wKWA27
//
// Env vars required (already in Vercel): STRIPE_SECRET_KEY
//
// Flow:
//   POST /api/create-checkout with { priceId }
//   → creates Stripe Checkout Session
//   → returns { url } for client-side redirect

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

export async function POST(req: NextRequest) {
  try {
    const body    = await req.json()
    const priceId = body.priceId as string

    if (!priceId) {
      return NextResponse.json({ error: "priceId is required" }, { status: 400 })
    }

    // Build the return URLs from the request origin
    const origin = req.headers.get("origin") ?? "https://nextax.ai"

    const session = await stripe.checkout.sessions.create({
      mode:                      "subscription",
      line_items:                [{ price: priceId, quantity: 1 }],
      success_url:               `${origin}/buyer-dashboard?upgrade=success`,
      cancel_url:                `${origin}/pricing?upgrade=cancelled`,
      allow_promotion_codes:     true,
      billing_address_collection: "auto",
      // If you want to capture the user's email at checkout:
      // customer_email: (from your auth layer)
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("[create-checkout] Stripe error:", err?.message)
    return NextResponse.json(
      { error: err?.message ?? "Stripe error" },
      { status: 500 },
    )
  }
}
