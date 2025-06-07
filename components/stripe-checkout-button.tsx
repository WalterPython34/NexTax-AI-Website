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
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("🛒 Starting checkout process...")
      console.log("📦 Product:", productName)
      console.log("💰 Price ID:", priceId)

      // Check if Stripe is loaded
      if (typeof window !== "undefined" && !window.Stripe) {
        throw new Error("Stripe is not loaded. Please refresh the page and try again.")
      }

      console.log("🔑 Stripe publishable key:", process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? "Present" : "Missing")

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

      console.log("📡 API Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ API Error response:", errorText)
        throw new Error(`Server error: ${response.status} - ${errorText}`)
      }

      const { sessionId, error: apiError } = await response.json()

      if (apiError) {
        console.error("❌ API returned error:", apiError)
        throw new Error(apiError)
      }

      if (!sessionId) {
        throw new Error("No session ID returned from server")
      }

      console.log("✅ Session created:", sessionId)

      // Initialize Stripe
      if (typeof window !== "undefined") {
        const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

        if (!stripe) {
          throw new Error("Failed to initialize Stripe. Please check your configuration.")
        }

        console.log("🔄 Redirecting to Stripe Checkout...")

        // Redirect to Stripe Checkout
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId,
        })

        if (stripeError) {
          console.error("❌ Stripe redirect error:", stripeError)
          throw new Error(stripeError.message || "Failed to redirect to Stripe Checkout")
        }
      }
    } catch (error: any) {
      console.error("❌ Checkout error:", error)
      setError(error.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
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
      {error && (
        <div className="mt-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded p-2">{error}</div>
      )}
    </div>
  )
}

