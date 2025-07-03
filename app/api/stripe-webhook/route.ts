import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabase"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log("Received webhook event:", event.type)

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session
        await handleSuccessfulPayment(session)
        break

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCancellation(subscription)
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSuccess(invoice)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailure(invoice)
        break
      }

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
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
      tier = "pro"
      questionsLimit = 150
    } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
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
    const customerId = subscription.customer as string

    // Get customer to find user
    const customer = await stripe.customers.retrieve(customerId)
    if (!customer || customer.deleted) {
      console.error("Customer not found:", customerId)
      return
    }

    const email = (customer as Stripe.Customer).email
    if (!email) {
      console.error("Customer email not found:", customerId)
      return
    }

    // Find user by email
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    if (userError || !user) {
      console.error("User not found for email:", email, userError)
      return
    }

    // Determine tier based on price
    let tier = "free"
    let questionsLimit = 10

    if (subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id

      // Map price IDs to tiers (you'll need to update these with your actual price IDs)
      if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        tier = "pro"
        questionsLimit = 150
      } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
        tier = "premium"
        questionsLimit = -1 // Unlimited
      }
    }

    // Update user subscription
    const { error } = await supabaseAdmin.from("user_subscriptions").upsert({
      user_id: user.user.id,
      tier,
      status: subscription.status === "active" ? "active" : "cancelled",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      questions_limit: questionsLimit,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error updating subscription:", error)
    } else {
      console.log("Successfully updated subscription for user:", user.user.id)
    }
  } catch (error) {
    console.error("Error handling subscription change:", error)
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  try {
    const { error } = await supabaseAdmin
      .from("user_subscriptions")
      .update({
        status: "cancelled",
        tier: "free",
        questions_limit: 10,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id)

    if (error) {
      console.error("Error cancelling subscription:", error)
    } else {
      console.log("Successfully cancelled subscription:", subscription.id)
    }
  } catch (error) {
    console.error("Error handling subscription cancellation:", error)
  }
}

async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  try {
    console.log("Payment succeeded for invoice:", invoice.id)
    // Add any additional logic for successful payments
  } catch (error) {
    console.error("Error handling payment success:", error)
  }
}

async function handlePaymentFailure(invoice: Stripe.Invoice) {
  try {
    console.log("Payment failed for invoice:", invoice.id)

    // Optionally downgrade user to free tier on payment failure
    if (invoice.subscription) {
      const { error } = await supabaseAdmin
        .from("user_subscriptions")
        .update({
          status: "expired",
          tier: "free",
          questions_limit: 10,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", invoice.subscription)

      if (error) {
        console.error("Error handling payment failure:", error)
      }
    }
  } catch (error) {
    console.error("Error handling payment failure:", error)
  }
}
