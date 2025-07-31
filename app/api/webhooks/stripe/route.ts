import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      console.error("No Stripe signature found")
      return NextResponse.json({ error: "No signature provided" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log("Received webhook event:", event.type)

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case "customer.created":
        await handleCustomerCreated(event.data.object as Stripe.Customer)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string)

    if (customer.deleted) {
      console.error("Customer was deleted")
      return
    }

    const { error } = await supabase.from("subscriptions").upsert({
      id: subscription.id,
      user_id: customer.metadata?.user_id,
      customer_id: subscription.customer,
      status: subscription.status,
      price_id: subscription.items.data[0]?.price.id,
      quantity: subscription.items.data[0]?.quantity || 1,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      created: new Date(subscription.created * 1000).toISOString(),
      updated: new Date().toISOString(),
    })

    if (error) {
      console.error("Error creating subscription:", error)
    } else {
      console.log("Subscription created successfully:", subscription.id)
    }
  } catch (error) {
    console.error("Error handling subscription created:", error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        price_id: subscription.items.data[0]?.price.id,
        quantity: subscription.items.data[0]?.quantity || 1,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    if (error) {
      console.error("Error updating subscription:", error)
    } else {
      console.log("Subscription updated successfully:", subscription.id)
    }
  } catch (error) {
    console.error("Error handling subscription updated:", error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        updated: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    if (error) {
      console.error("Error deleting subscription:", error)
    } else {
      console.log("Subscription deleted successfully:", subscription.id)
    }
  } catch (error) {
    console.error("Error handling subscription deleted:", error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (invoice.subscription) {
      // Update subscription payment status
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          updated: new Date().toISOString(),
        })
        .eq("id", invoice.subscription)

      if (error) {
        console.error("Error updating subscription after payment:", error)
      } else {
        console.log("Payment succeeded for subscription:", invoice.subscription)
      }
    }
  } catch (error) {
    console.error("Error handling payment succeeded:", error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (invoice.subscription) {
      // Update subscription payment status
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
          updated: new Date().toISOString(),
        })
        .eq("id", invoice.subscription)

      if (error) {
        console.error("Error updating subscription after failed payment:", error)
      } else {
        console.log("Payment failed for subscription:", invoice.subscription)
      }
    }
  } catch (error) {
    console.error("Error handling payment failed:", error)
  }
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  try {
    // Store customer information if needed
    console.log("Customer created:", customer.id)
  } catch (error) {
    console.error("Error handling customer created:", error)
  }
}
