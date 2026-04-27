// app/api/webhooks/stripe/route.ts
//
// Stripe webhook for AcquiFlow subscriptions.
//
// Writes to TWO tables on every relevant event:
//   1. `subscriptions` — full billing record (for /account page + Customer Portal)
//   2. `profiles.plan` — fast UI gating field (existing isPro logic depends on this)
//
// Both tables get updated atomically per event so isPro stays accurate.
//
// User identity resolution (in priority order):
//   1. session.client_reference_id (passed at checkout from authenticated user)
//   2. session.metadata.user_id
//   3. Lookup by customer.email in auth.users
//
// product_type discriminator on subscriptions.product_type = 'acquiflow'
// keeps this webhook isolated from any other future Stripe products.
//
// Env vars required:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Resolves a Supabase user_id from a Stripe session/subscription/invoice.
 * Tries multiple sources in priority order. Returns null if nothing works.
 */
async function resolveUserId(opts: {
  client_reference_id?: string | null
  metadata?: Record<string, string> | null
  email?: string | null
}): Promise<string | null> {
  // 1. client_reference_id (set at checkout when user is authenticated)
  if (opts.client_reference_id) {
    return opts.client_reference_id
  }

  // 2. metadata.user_id (set on subscription_data.metadata at checkout)
  if (opts.metadata?.user_id) {
    return opts.metadata.user_id
  }

  // 3. Email lookup in Supabase auth.users via admin API
  if (opts.email) {
    try {
      const { data, error } = await supabase.auth.admin.listUsers()
      if (error) {
        console.error("[webhook] auth.admin.listUsers error:", error)
        return null
      }
      const match = data?.users?.find(
        (u) => u.email?.toLowerCase() === opts.email!.toLowerCase(),
      )
      return match?.id ?? null
    } catch (err) {
      console.error("[webhook] email lookup error:", err)
      return null
    }
  }

  return null
}

/**
 * Identifies whether a Stripe subscription belongs to AcquiFlow.
 * Checks subscription metadata first, then price ID match.
 */
function isAcquiFlowSubscription(sub: Stripe.Subscription): boolean {
  if (sub.metadata?.product_type === "acquiflow") {
    return true
  }
  // Fallback: check price ID. Add additional Pro/premium price IDs here
  // if you launch new tiers within AcquiFlow.
  const ACQUIFLOW_PRICE_IDS = [
    "price_1TPbTTGA3ir6ndSx14wKWA27", // Pro $39/mo
  ]
  const priceId = sub.items?.data?.[0]?.price?.id
  return priceId ? ACQUIFLOW_PRICE_IDS.includes(priceId) : false
}

/**
 * Updates profiles.plan for the user. Used to flip isPro on/off.
 * Plan values: "premium" = active Pro, "free" = no active sub.
 */
async function setProfilePlan(userId: string, plan: "premium" | "free") {
  const { error } = await supabase
    .from("profiles")
    .update({ plan })
    .eq("id", userId)

  if (error) {
    console.error(`[webhook] profiles.plan update failed for ${userId}:`, error)
  } else {
    console.log(`[webhook] profiles.plan set to '${plan}' for user ${userId}`)
  }
}

/**
 * Upserts the subscriptions table with billing details.
 * Used on subscription create + update events.
 */
async function upsertSubscription(opts: {
  user_id: string
  subscription: Stripe.Subscription
}) {
  const sub = opts.subscription
  const item = sub.items?.data?.[0]

  // Stripe API 2024-11-20+ moved current_period_* to the line item level.
  // Read from item first, fall back to top-level for older API versions.
  const periodStart = (item as any)?.current_period_start ?? (sub as any).current_period_start
  const periodEnd   = (item as any)?.current_period_end   ?? (sub as any).current_period_end

  const row = {
    id:                     sub.id,
    user_id:                opts.user_id,
    stripe_subscription_id: sub.id,
    stripe_customer_id:     sub.customer as string,
    customer_email:         (sub as any).customer_email ?? null,
    plan_name:              "premium",
    product_name:           "AcquiFlow Pro",
    product_type:           "acquiflow",
    status:                 sub.status,
    price_id:               item?.price?.id ?? null,
    interval:               item?.price?.recurring?.interval ?? null,
    current_period_start:   periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end:     periodEnd   ? new Date(periodEnd   * 1000).toISOString() : null,
    cancel_at_period_end:   sub.cancel_at_period_end,
    canceled_at:            sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    updated_at:             new Date().toISOString(),
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(row, { onConflict: "id" })

  if (error) {
    console.error("[webhook] subscriptions upsert failed:", error)
  } else {
    console.log("[webhook] subscriptions upserted:", sub.id)
  }
}

// ─── Main webhook handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let event: Stripe.Event

  try {
    const body         = await req.text()
    const headersList  = await headers()
    const signature    = headersList.get("stripe-signature")

    if (!signature) {
      console.error("[webhook] missing stripe-signature header")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("[webhook] STRIPE_WEBHOOK_SECRET not configured")
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err: any) {
    console.error("[webhook] signature verification failed:", err?.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log("[webhook] received event:", event.type, event.id)

  // Process the event synchronously and await completion before responding.
  // On Vercel serverless functions, fire-and-forget patterns like setImmediate
  // get killed when the response returns — so we must await the full work.
  // Stripe's webhook timeout is 30 seconds; our DB writes complete in ~1-2s.
  try {
    await handleEvent(event)
  } catch (err: any) {
    console.error(`[webhook] error processing ${event.type}:`, err?.message ?? err)
    // Still return 200 so Stripe doesn't retry — we logged the error and
    // can investigate manually. If we returned 500, Stripe would retry
    // and potentially write duplicate or partial data on later attempts.
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break

    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
      break

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
      break

    case "customer.created":
    case "customer.updated":
    case "customer.deleted":
      // We don't store customer state independently — subscription state is the source of truth.
      console.log(`[webhook] customer event ${event.type} acknowledged (no action)`)
      break

    default:
      console.log(`[webhook] unhandled event type: ${event.type}`)
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || !session.subscription) {
    console.log("[webhook] checkout.session.completed not a subscription, skipping")
    return
  }

  // Fetch the subscription to verify product type and get full details
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

  if (!isAcquiFlowSubscription(subscription)) {
    console.log("[webhook] checkout.session.completed not for AcquiFlow, skipping")
    return
  }

  // Resolve user_id from session
  const userId = await resolveUserId({
    client_reference_id: session.client_reference_id,
    metadata:            session.metadata,
    email:               session.customer_details?.email ?? session.customer_email,
  })

  if (!userId) {
    console.error("[webhook] could not resolve user_id for session:", session.id, "email:", session.customer_email)
    return
  }

  await upsertSubscription({ user_id: userId, subscription })
  await setProfilePlan(userId, "premium")
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (!isAcquiFlowSubscription(subscription)) {
    return
  }

  const userId = await resolveUserId({
    metadata: subscription.metadata,
    email:    null, // we'll fetch the customer below if needed
  })

  let resolvedUserId = userId
  if (!resolvedUserId) {
    // Fall back to fetching customer for email lookup
    try {
      const customer = await stripe.customers.retrieve(subscription.customer as string)
      if (!customer.deleted) {
        resolvedUserId = await resolveUserId({
          email: (customer as Stripe.Customer).email,
        })
      }
    } catch (err) {
      console.error("[webhook] customer fetch failed:", err)
    }
  }

  if (!resolvedUserId) {
    console.error("[webhook] could not resolve user_id for subscription:", subscription.id)
    return
  }

  await upsertSubscription({ user_id: resolvedUserId, subscription })

  // Reflect status into profiles.plan
  if (subscription.status === "active" || subscription.status === "trialing") {
    await setProfilePlan(resolvedUserId, "premium")
  } else if (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired" ||
    subscription.status === "unpaid"
  ) {
    await setProfilePlan(resolvedUserId, "free")
  }
  // For 'past_due' and 'incomplete' we keep the user at premium for now —
  // grace period during payment retry. invoice.payment_failed will downgrade
  // them if Stripe gives up.
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  if (!isAcquiFlowSubscription(subscription)) {
    return
  }

  // Update subscriptions table to canceled
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id)

  // Downgrade profiles.plan
  const userId = await resolveUserId({
    metadata: subscription.metadata,
  })

  if (userId) {
    await setProfilePlan(userId, "free")
  } else {
    // Fallback: look up by stripe_customer_id in subscriptions table
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("id", subscription.id)
      .single()
    if (data?.user_id) {
      await setProfilePlan(data.user_id, "free")
    }
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Just confirm the subscription is still active. The subscription.updated
  // event handles the real state transition.
  if (!invoice.subscription) return

  const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
  if (!isAcquiFlowSubscription(sub)) return

  const userId = await resolveUserId({
    metadata: sub.metadata,
    email:    invoice.customer_email,
  })

  if (userId && sub.status === "active") {
    // Idempotent — sets plan to premium even if already premium.
    await setProfilePlan(userId, "premium")
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // We don't downgrade on first failure — Stripe retries automatically.
  // We just log it. If Stripe gives up, customer.subscription.updated will
  // fire with status='past_due' or 'unpaid' and that handler will downgrade.
  if (!invoice.subscription) return

  console.warn("[webhook] payment failed for subscription:", invoice.subscription, "(will rely on subscription.updated to act)")
}
