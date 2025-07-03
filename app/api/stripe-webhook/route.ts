import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase"
import type Stripe from "stripe"

const webhookSecret = process.env.NEXTAX_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log(`Received webhook event: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session
        await handleSuccessfulPayment(session)
        break

      case "customer.subscription.created":
      case "customer.subscription.updated":
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription)
        break

      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCancellation(deletedSubscription)
        break

      case "invoice.payment_succeeded":
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break

      case "invoice.payment_failed":
        const failedInvoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(failedInvoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  try {
    console.log("Processing successful payment:", session.id)

    const customerId = session.customer as string
    const subscriptionId = session.subscription as string

    if (!customerId || !subscriptionId) {
      console.error("Missing customer or subscription ID in session")
      return
    }

    const customer = await stripe.customers.retrieve(customerId)
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    const priceId = subscription.items.data[0].price.id
    let tier: "free" | "pro" | "premium" = "free"
    let questionsLimit = 10

    // Map price IDs to tiers (you'll need to replace these with your actual Stripe price IDs)
    if (priceId === "price_startsmart_pro_monthly" || priceId.includes("pro")) {
      tier = "pro"
      questionsLimit = 150
    } else if (priceId === "price_startsmart_premium_monthly" || priceId.includes("premium")) {
      tier = "premium"
      questionsLimit = -1 // unlimited
    }

    // Get user ID from customer metadata or email
    let userId = null
    if (typeof customer === "object" && customer.metadata?.user_id) {
      userId = customer.metadata.user_id
    } else if (typeof customer === "object" && customer.email) {
      // Try to find user by email
      const { data: user } = await supabaseAdmin.from("users").select("id").eq("email", customer.email).single()
      userId = user?.id
    }

    if (!userId) {
      console.error("Could not find user ID for customer:", customerId)
      return
    }

    // Update or create user subscription
    const { error } = await supabaseAdmin.from("user_subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        tier: tier,
        questions_limit: questionsLimit,
        questions_used: 0,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    )

    if (error) {
      console.error("Error updating subscription:", error)
    } else {
      console.log(`Successfully updated subscription for user ${userId} to ${tier}`)
    }
  } catch (error) {
    console.error("Error handling successful payment:", error)
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  try {
    console.log("Processing subscription change:", subscription.id)

    const customerId = subscription.customer as string
    const priceId = subscription.items.data[0].price.id

    let tier: "free" | "pro" | "premium" = "free"
    let questionsLimit = 10

    if (priceId === "price_startsmart_pro_monthly" || priceId.includes("pro")) {
      tier = "pro"
      questionsLimit = 150
    } else if (priceId === "price_startsmart_premium_monthly" || priceId.includes("premium")) {
      tier = "premium"
      questionsLimit = -1
    }

    const { error } = await supabaseAdmin
      .from("user_subscriptions")
      .update({
        tier: tier,
        questions_limit: questionsLimit,
        status: subscription.status === "active" ? "active" : subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId)

    if (error) {
      console.error("Error updating subscription:", error)
    } else {
      console.log(`Successfully updated subscription ${subscription.id} to ${tier}`)
    }
  } catch (error) {
    console.error("Error handling subscription change:", error)
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  try {
    console.log("Processing subscription cancellation:", subscription.id)

    const customerId = subscription.customer as string

    const { error } = await supabaseAdmin
      .from("user_subscriptions")
      .update({
        tier: "free",
        questions_limit: 10,
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId)

    if (error) {
      console.error("Error handling cancellation:", error)
    } else {
      console.log(`Successfully canceled subscription ${subscription.id}`)
    }
  } catch (error) {
    console.error("Error handling subscription cancellation:", error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log("Processing successful payment:", invoice.id)

    const customerId = invoice.customer as string

    // Reset monthly question usage on successful payment
    const { error } = await supabaseAdmin
      .from("user_subscriptions")
      .update({
        questions_used: 0,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId)

    if (error) {
      console.error("Error resetting questions on payment:", error)
    }
  } catch (error) {
    console.error("Error handling payment succeeded:", error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log("Processing failed payment:", invoice.id)

    const customerId = invoice.customer as string

    const { error } = await supabaseAdmin
      .from("user_subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId)

    if (error) {
      console.error("Error updating status on failed payment:", error)
    }
  } catch (error) {
    console.error("Error handling payment failed:", error)
  }
}
