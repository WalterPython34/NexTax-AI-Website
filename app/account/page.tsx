// app/account/page.tsx
//
// Account / Billing page.
// Trust layer for AcquiFlow paying users.
//
// Sections:
//   1. Profile — email, login method (magic link)
//   2. Subscription — real data when present, safe fallback when not
//   3. Manage Billing — opens Stripe Customer Portal
//
// All copy is conservative: never claims an active subscription that
// the database can't verify. Falls back to "managed via Stripe" message.

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface Subscription {
  id:                     string
  status:                 string
  plan_name:              string | null
  product_name:           string | null
  current_period_start:   string | null
  current_period_end:     string | null
  cancel_at_period_end:   boolean
  canceled_at:            string | null
  stripe_customer_id:     string | null
}

export default function AccountPage() {
  const router = useRouter()

  const [loading,         setLoading]         = useState(true)
  const [user,            setUser]            = useState<{ id: string; email: string } | null>(null)
  const [subscription,    setSubscription]    = useState<Subscription | null>(null)
  const [portalLoading,   setPortalLoading]   = useState(false)
  const [portalError,     setPortalError]     = useState<string | null>(null)

  // Auth gate + load data
  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData?.user) {
        if (mounted) router.replace("/login?next=/account")
        return
      }

      if (!mounted) return

      setUser({
        id:    userData.user.id,
        email: userData.user.email ?? "",
      })

      // Look up active subscription for this user (most recent first)
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("id, status, plan_name, product_name, current_period_start, current_period_end, cancel_at_period_end, canceled_at, stripe_customer_id")
        .eq("user_id", userData.user.id)
        .eq("product_type", "acquiflow")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subError) {
        console.error("[/account] subscription query error:", subError)
      }

      if (mounted) {
        setSubscription(subData as Subscription | null)
        setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [router])

  // Open Customer Portal
  const handleManageBilling = async () => {
    setPortalLoading(true)
    setPortalError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        setPortalError("Session expired — please refresh and try again.")
        setPortalLoading(false)
        return
      }

      const res = await fetch("/api/stripe/portal", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else if (data.error === "no_subscription") {
        setPortalError(data.message || "No active subscription found.")
      } else {
        setPortalError(data.error || "Could not open billing portal.")
      }
    } catch (err) {
      console.error("[/account] portal error:", err)
      setPortalError("Could not open billing portal. Please try again.")
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <div style={{ fontSize: 13, color: "#6B7280" }}>Loading account...</div>
      </div>
    )
  }

  // Format the next billing date for display
  const nextBilling = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null

  const isActive = subscription?.status === "active" || subscription?.status === "trialing"
  const willCancel = subscription?.cancel_at_period_end === true

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/buyer-dashboard" style={{
            color: "#94A3B8", fontSize: 12, textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16,
          }}>
            <span>←</span> Back to dashboard
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
            Account
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>
            Manage your profile, subscription, and billing.
          </p>
        </div>

        {/* ── PROFILE SECTION ── */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Profile</h2>
          <div style={fieldRowStyle}>
            <div style={fieldLabelStyle}>Email</div>
            <div style={fieldValueStyle}>{user?.email}</div>
          </div>
          <div style={fieldRowStyle}>
            <div style={fieldLabelStyle}>Sign-in method</div>
            <div style={fieldValueStyle}>
              Magic link
              <span style={{ display: "block", fontSize: 11, color: "#7C8593", marginTop: 3 }}>
                We email you a secure link to sign in. No password needed.
              </span>
            </div>
          </div>
        </section>

        {/* ── SUBSCRIPTION SECTION ── */}
        <section style={{ ...sectionStyle, marginTop: 24 }} id="billing">
          <h2 style={sectionHeadingStyle}>Subscription</h2>

          {subscription && isActive ? (
            <>
              <div style={fieldRowStyle}>
                <div style={fieldLabelStyle}>Plan</div>
                <div style={fieldValueStyle}>
                  {subscription.product_name ?? "AcquiFlow Pro"}
                  <span style={{
                    display: "inline-block", marginLeft: 10,
                    padding: "2px 8px", borderRadius: 12,
                    background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    fontSize: 10, color: "#818CF8", fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}>
                    ⚡ ACTIVE
                  </span>
                </div>
              </div>

              {nextBilling && !willCancel && (
                <div style={fieldRowStyle}>
                  <div style={fieldLabelStyle}>Next billing date</div>
                  <div style={fieldValueStyle}>{nextBilling}</div>
                </div>
              )}

              {willCancel && nextBilling && (
                <div style={{
                  marginTop: 14, padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}>
                  <div style={{ fontSize: 12, color: "#FBBF24", fontWeight: 600, marginBottom: 3 }}>
                    Cancellation scheduled
                  </div>
                  <div style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.55 }}>
                    Your subscription will end on {nextBilling}. You&rsquo;ll keep full Pro access until then.
                  </div>
                </div>
              )}
            </>
          ) : subscription ? (
            // Subscription exists but is not active (canceled, past_due, etc.)
            <div style={fieldRowStyle}>
              <div style={fieldLabelStyle}>Status</div>
              <div style={fieldValueStyle}>
                {subscription.status === "canceled" && "Canceled"}
                {subscription.status === "past_due" && "Past due — payment retry in progress"}
                {subscription.status === "unpaid" && "Unpaid"}
                {!["canceled", "past_due", "unpaid"].includes(subscription.status) && subscription.status}
              </div>
            </div>
          ) : (
            // No subscription record — fall back to safe message
            <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>
              Subscription details are managed securely through Stripe. Use the button below to access your billing information, view invoices, or update your subscription.
            </div>
          )}
        </section>

        {/* ── MANAGE BILLING ── */}
        <section style={{ ...sectionStyle, marginTop: 24 }}>
          <h2 style={sectionHeadingStyle}>Billing</h2>

          <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6, marginBottom: 16 }}>
            Update your payment method, view invoices, or cancel your subscription. All billing is handled by Stripe.
          </p>

          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            style={{
              padding: "11px 22px",
              borderRadius: 9,
              border: "1px solid rgba(16,185,129,0.4)",
              background: portalLoading
                ? "rgba(16,185,129,0.06)"
                : "rgba(16,185,129,0.12)",
              color: portalLoading ? "#6B7280" : "#10B981",
              fontSize: 13, fontWeight: 600, cursor: portalLoading ? "wait" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
          >
            {portalLoading ? "Opening Stripe..." : "Manage Billing"}
          </button>

          {portalError && (
            <div style={{
              marginTop: 12, padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              fontSize: 12, color: "#F87171", lineHeight: 1.55,
            }}>
              {portalError}
            </div>
          )}

          {/* Trust microcopy */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, color: "#7C8593", lineHeight: 1.6 }}>
              🔒 Secure billing powered by <span style={{ color: "#94A3B8" }}>Stripe</span>.
              Cancel anytime. No contracts.
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

// ─── Inline styles ──────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #080C13 0%, #0F172A 100%)",
  fontFamily: "'Inter',sans-serif",
  color: "#E2E8F0",
}

const loadingContainerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#080C13",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const sectionStyle: React.CSSProperties = {
  background: "rgba(15,23,42,0.6)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  padding: "22px 24px",
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#7C8593",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  margin: "0 0 16px 0",
}

const fieldRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  gap: 16,
  padding: "10px 0",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  alignItems: "start",
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#7C8593",
  fontWeight: 500,
}

const fieldValueStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#E2E8F0",
  wordBreak: "break-word",
}
