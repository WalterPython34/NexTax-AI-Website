"use client"

import type React from "react"
import { useState } from "react"

interface StripeCheckoutButtonProps {
  priceId: string
  productName: string
}

const StripeCheckoutButton: React.FC<StripeCheckoutButtonProps> = ({ priceId, productName }) => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("🛒 Starting checkout process...")
      console.log("📦 Product:", productName)
      console.log("💰 Price ID:", priceId)

      // Check if Stripe is loaded
      if (!window.Stripe) {
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

      // Get the response text first for better debugging
      const responseText = await response.text()
      console.log("📡 Raw API response:", responseText)

      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error("❌ Failed to parse response as JSON:", e)
        throw new Error(`Invalid response from server: ${responseText.substring(0, 100)}...`)
      }

      if (!response.ok) {
        console.error("❌ API Error response:", data)
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      if (data.error) {
        console.error("❌ API returned error:", data.error)
        throw new Error(data.error)
      }

      if (!data.sessionId) {
        throw new Error("No session ID returned from server")
      }

      console.log("✅ Session created:", data.sessionId)

      // Initialize Stripe
      const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

      if (!stripe) {
        throw new Error("Failed to initialize Stripe. Please check your configuration.")
      }

      console.log("🔄 Redirecting to Stripe Checkout...")

      // Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      })

      if (stripeError) {
        console.error("❌ Stripe redirect error:", stripeError)
        throw new Error(stripeError.message || "Failed to redirect to Stripe Checkout")
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
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <button onClick={handleCheckout} disabled={loading}>
        {loading ? "Loading..." : "Checkout with Stripe"}
      </button>
    </div>
  )
}

export default StripeCheckoutButton
