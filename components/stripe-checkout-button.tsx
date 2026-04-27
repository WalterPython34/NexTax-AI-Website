// components/stripe-checkout-button.tsx
//
// Stripe Checkout button — passes the current Supabase user's id and email
// to the checkout route when the user is authenticated. Falls back to
// anonymous checkout (Stripe collects email at form) when not signed in.
//
// Used on /pricing and inside /buyer-dashboard.

"use client"

import { useState, useEffect, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface StripeCheckoutButtonProps {
  priceId:    string
  className?: string
  variant?:   "default" | "outline"
  children:   ReactNode
}

export function StripeCheckoutButton({
  priceId,
  className,
  variant = "default",
  children,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string | undefined } | null>(null)

  // Pick up the current auth state on mount. Doesn't gate the button —
  // it just enables the user-link path when signed in.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser({ id: data.user.id, email: data.user.email })
      }
    })
  }, [])

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/create-checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          userId:    user?.id,
          userEmail: user?.email,
        }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error("[stripe-checkout] no URL in response:", data)
        alert("Could not start checkout. Please try again or contact support.")
        setLoading(false)
      }
    } catch (err) {
      console.error("[stripe-checkout] error:", err)
      alert("Could not start checkout. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant={variant}
      className={className}
    >
      {loading ? "Loading..." : children}
    </Button>
  )
}

export default StripeCheckoutButton
