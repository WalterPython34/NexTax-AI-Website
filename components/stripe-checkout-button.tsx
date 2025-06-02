"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface StripeCheckoutButtonProps {
  priceId: string
  productName: string
  children: React.ReactNode
  className?: string
}

export function StripeCheckoutButton({ priceId, productName, children, className }: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          productName,
        }),
      })

      const { sessionId, error } = await response.json()

      if (error) {
        console.error("Checkout error:", error)
        alert("Something went wrong. Please try again.")
        return
      }

      // Redirect to Stripe Checkout
      const stripe = (window as any).Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      })

      if (stripeError) {
        console.error("Stripe redirect error:", stripeError)
        alert("Something went wrong. Please try again.")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleCheckout} disabled={loading} className={className}>
      {loading ? (
        <>
          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          Processing...
        </>
      ) : (
        children
      )}
    </Button>
  )
}
