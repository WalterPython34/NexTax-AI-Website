// app/api/create-checkout/route.ts
//
// Stripe Checkout Session endpoint for Acquisitions Pro upgrade.
//
// Accepts optional userId + userEmail from request body. When present,
// passes them to Stripe as client_reference_id, customer_email, and
// subscription metadata — so the webhook can reliably tie the resulting
// subscription back to a Supabase auth user.
//
// Falls back gracefully when called from anonymous contexts (pricing page).
//
// Env vars required: STRIPE_SECRET_KEY

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

export async function POST(req: NextRequest) {
  try {
    const body      = await req.json()
    const priceId   = body.priceId   as string | undefined
    const userId    = body.userId    as string | undefined
    const userEmail = body.userEmail as string | undefined

    if (!priceId) {
      return NextResponse.json({ error: "priceId is required" }, { status: 400 })
    }

    const origin = req.headers.get("origin") ?? "https://nextax.ai"

    // Build the session params. customer_email and client_reference_id
    // are only included if we have them — undefined keys would error.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode:                       "subscription",
      line_items:                 [{ price: priceId, quantity: 1 }],
      success_url:                `${origin}/buyer-dashboard?upgrade=success`,
      cancel_url:                 `${origin}/pricing?upgrade=cancelled`,
      allow_promotion_codes:      true,
      billing_address_collection: "auto",
    }

    if (userEmail) {
      sessionParams.customer_email = userEmail
    }

    if (userId) {
      sessionParams.client_reference_id = userId
      sessionParams.subscription_data = {
        metadata: {
          user_id:      userId,
          product_type: "acquiflow",
        },
      }
    } else {
      // Even without userId, tag the subscription as AcquiFlow
      sessionParams.subscription_data = {
        metadata: {
          product_type: "acquiflow",
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("[create-checkout] Stripe error:", err?.message)
    return NextResponse.json(
      { error: err?.message ?? "Stripe error" },
      { status: 500 },
    )
  }
}
