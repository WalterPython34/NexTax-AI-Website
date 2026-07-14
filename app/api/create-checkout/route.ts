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
// B4 (partner member pricing): when the authenticated user has a row in
// partner_attributions and the session is for AcquiFlow Pro, the partner's
// Stripe COUPON is applied server-side. No promotion code exists for member
// pricing by design (nothing typeable, nothing leakable). Stripe forbids
// discounts + allow_promotion_codes on the same session, so attributed Pro
// sessions drop the promo field; all other sessions keep existing behavior
// (other products may legitimately use promotion codes).
//
// Trust boundary note (accepted for beta): userId arrives in the request
// body, not from a verified session, so the discount lookup trusts the
// caller's claimed id. UUIDs are not guessable, and the worst case is an
// unearned $15/mo discount that B5 reconciliation surfaces. Hardening path:
// derive the user from the Supabase auth cookie instead of the body.
//
// Env vars required: STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (attribution lookup; checkout works without it,
// members just fall back to full price with a logged reconciliation flag).

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { PARTNER_COMMERCE, ACQUIFLOW_PRO_PRICE_ID } from "@/lib/partners"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

/**
 * Attribution-gated member coupon lookup. Returns the Stripe coupon id and
 * partner slug when (a) the user has a partner_attributions row, (b) the
 * partner is configured with a coupon. Never throws: any failure logs a
 * reconciliation flag and the checkout proceeds at full price.
 */
async function memberCouponFor(userId: string): Promise<{ coupon: string; partnerRef: string } | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      console.warn("[b4-reconcile] missing supabase env; member coupon not applied for", userId)
      return null
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await supabase
      .from("partner_attributions")
      .select("partner_ref")
      .eq("user_id", userId)
      .maybeSingle()
    if (error) {
      console.warn("[b4-reconcile] attribution lookup failed:", error.message)
      return null
    }
    if (!data?.partner_ref) return null
    const commerce = PARTNER_COMMERCE[data.partner_ref]
    if (!commerce?.stripeCouponId) {
      console.warn("[b4-reconcile] attributed user has no configured coupon:", data.partner_ref)
      return null
    }
    return { coupon: commerce.stripeCouponId, partnerRef: data.partner_ref }
  } catch (e) {
    console.warn("[b4-reconcile] member coupon lookup error:", e)
    return null
  }
}

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

    // Base subscription metadata; partner_ref is added below when a member
    // coupon applies so the billing record itself carries the attribution
    // (B5: billing truth, independent of the funnel table).
    const metadata: Record<string, string> = { product_type: "acquiflow" }
    if (userId) {
      sessionParams.client_reference_id = userId
      metadata.user_id = userId
    }

    // ── B4: partner member pricing, AcquiFlow Pro only ──────────────────────
    // Coupon is restricted to the Pro product in Stripe as well; gating on the
    // price id here avoids a hard session-creation error on other products.
    if (userId && priceId === ACQUIFLOW_PRO_PRICE_ID) {
      const member = await memberCouponFor(userId)
      if (member) {
        sessionParams.discounts = [{ coupon: member.coupon }]
        // Stripe rejects sessions carrying both discounts and
        // allow_promotion_codes; the member session drops the promo field.
        delete sessionParams.allow_promotion_codes
        metadata.partner_ref = member.partnerRef
      }
    }

    sessionParams.subscription_data = { metadata }

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
