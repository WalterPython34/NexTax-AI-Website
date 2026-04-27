// app/api/stripe/portal/route.ts
//
// Creates a Stripe Customer Portal session for the currently authenticated
// AcquiFlow user. Looks up the user's stripe_customer_id from the
// subscriptions table.
//
// Returns the portal URL — client redirects to it.
// If the user has no subscription record yet, returns a clean error message.
//
// Env vars required:
//   STRIPE_SECRET_KEY
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

export async function POST(req: NextRequest) {
  try {
    // Read the user's access token from the request — sent by the client
    // from the browser-side Supabase session.
    const body = await req.json().catch(() => ({}))
    const accessToken = body.accessToken as string | undefined

    if (!accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      )
    }

    // Verify the access token by creating a Supabase client with it.
    // This proves the request is coming from a real signed-in user.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      },
    )

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 },
      )
    }

    const userId = userData.user.id

    // Look up stripe_customer_id from the subscriptions table.
    // We use the service role key here on the server side to bypass RLS.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: subRow, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("product_type", "acquiflow")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError) {
      console.error("[portal] subscriptions query error:", subError)
      return NextResponse.json(
        { error: "Could not look up subscription" },
        { status: 500 },
      )
    }

    if (!subRow?.stripe_customer_id) {
      return NextResponse.json(
        {
          error: "no_subscription",
          message: "No active subscription found. If you recently subscribed, please wait a moment and try again.",
        },
        { status: 404 },
      )
    }

    // Create the Customer Portal session
    const origin = req.headers.get("origin") ?? "https://nextax.ai"

    const session = await stripe.billingPortal.sessions.create({
      customer:    subRow.stripe_customer_id,
      return_url:  `${origin}/account`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("[portal] error:", err?.message)
    return NextResponse.json(
      { error: err?.message ?? "Portal session error" },
      { status: 500 },
    )
  }
}
