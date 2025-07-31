import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { supabase } from "@/lib/supabase"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const sig = headersList.get("stripe-signature")

    if (!sig) {
      console.log("No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } catch (err) {
      console.log("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log("Received Stripe webhook event:", event.type)

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session
        console.log("Checkout session completed:", session.id)

        // Handle successful checkout
        if (session.customer && session.subscription) {
          await supabase.from("user_subscriptions").upsert({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: "active",
            tier: session.metadata?.tier || "basic",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
        break

      case "customer.subscription.created":
      case "customer.subscription.updated":
        const subscription = event.data.object as Stripe.Subscription
        console.log("Subscription updated:", subscription.id)

        const tier = subscription.items.data[0]?.price?.lookup_key || "basic"
        const status = subscription.status === "active" ? "active" : "inactive"

        await supabase.from("user_subscriptions").upsert({
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          tier,
          status,
          expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        break

      case "customer.subscription.deleted":
        const deletedSub = event.data.object as Stripe.Subscription
        console.log("Subscription cancelled:", deletedSub.id)

        await supabase
          .from("user_subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", deletedSub.id)
        break

      case "invoice.payment_succeeded":
        const invoice = event.data.object as Stripe.Invoice
        console.log("Invoice payment succeeded:", invoice.id)

        // Update subscription status if needed
        if (invoice.subscription) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", invoice.subscription as string)
        }
        break

      case "invoice.payment_failed":
        const failedInvoice = event.data.object as Stripe.Invoice
        console.log("Invoice payment failed:", failedInvoice.id)

        // Update subscription status
        if (failedInvoice.subscription) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", failedInvoice.subscription as string)
        }
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Return success response
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
