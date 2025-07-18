import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const sig = request.headers.get("stripe-signature") as string
    const body = await request.text()
    let event

    // For production, verify webhook signature for security
    if (process.env.NODE_ENV === "production") {
      try {
        const crypto = require("crypto")
        const expectedSig = crypto
          .createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET!)
          .update(body, "utf8")
          .digest("hex")

        const signature = `sha256=${expectedSig}`
        if (!sig || !sig.includes(signature)) {
          console.log("Invalid webhook signature")
          return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
        }
      } catch (err) {
        console.log("Webhook signature verification failed:", err)
        return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
      }
    }

    event = JSON.parse(body)

    // Handle subscription events
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        const subscription = event.data.object
        const customerId = subscription.customer

        // Update user subscription in Supabase
        const tier = subscription.items.data[0]?.price?.lookup_key || "free"
        const status = subscription.status === "active" ? "active" : "inactive"

        await supabase.from("user_subscriptions").upsert({
          stripe_customer_id: customerId,
          tier,
          status,
          expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })

        console.log(`Subscription ${subscription.status} for customer ${customerId}`)
        break

      case "customer.subscription.deleted":
        const deletedSub = event.data.object
        await supabase
          .from("user_subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", deletedSub.customer)
        break

      default:
        console.log(`Unhandled Stripe event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 })
  }
}
