"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface UserMenuProps {
  user:  { email?: string | null } | null
  isPro: boolean
}

export function UserMenu({ user, isPro }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const userInitial = user?.email?.charAt(0)?.toUpperCase() ?? "?"

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open])

  const handleSignOut = async () => {
    setOpen(false)
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (!user) {
    return (
      <a
        href="/login"
        style={{
          padding: "5px 12px", borderRadius: 8,
          border: "1px solid rgba(99,102,241,0.25)",
          background: "rgba(99,102,241,0.08)",
          color: "#818CF8", fontSize: 12, fontWeight: 500, textDecoration: "none",
        }}
      >
        Sign In
      </a>
    )
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        title={user.email ?? ""}
        style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#fff",
          cursor: "pointer", flexShrink: 0,
          border: "none", padding: 0,
          outline: open ? "2px solid rgba(99,102,241,0.4)" : "none",
          outlineOffset: 2,
        }}
      >
        {userInitial}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            minWidth: 240, borderRadius: 10,
            background: "rgba(15,23,42,0.98)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 10px 32px rgba(0,0,0,0.5)",
            backdropFilter: "blur(16px)",
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          {/* Email + plan header */}
          <div style={{
            padding: "12px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4, wordBreak: "break-all" }}>
              {user.email}
            </div>
            <div style={{ fontSize: 10, color: isPro ? "#818CF8" : "#7C8593", fontWeight: 600, letterSpacing: "0.04em", marginBottom: isPro ? 3 : 0 }}>
              {isPro ? "⚡ PRO PLAN" : "FREE PLAN"}
            </div>
            {isPro && (
              <div style={{ fontSize: 10, color: "#7C8593" }}>
                Renews monthly via Stripe
              </div>
            )}
          </div>

          {/* Account group */}
          <SectionLabel>Account</SectionLabel>
          <Link href="/account" onClick={() => setOpen(false)} style={menuItemStyle}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>👤</span>
            <span>Account</span>
          </Link>
          <Link href="/contact" onClick={() => setOpen(false)} style={menuItemStyle}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>✉️</span>
            <span>Support</span>
          </Link>

          {/* Billing group */}
          <SectionLabel>Billing</SectionLabel>
          <Link href="/account#billing" onClick={() => setOpen(false)} style={menuItemStyle}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>💳</span>
            <span>Manage Billing</span>
          </Link>

          {/* Sign out (its own group, no label) */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "6px 0" }} />
          <button
            onClick={handleSignOut}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 14px", background: "transparent", border: "none",
              color: "#94A3B8", fontSize: 13, cursor: "pointer", textAlign: "left",
              fontFamily: "inherit",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>↪</span>
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  )
}

// Tiny header above each section group
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "8px 14px 4px",
      fontSize: 9,
      fontWeight: 700,
      color: "#5A6478",
      letterSpacing: "0.1em",
      textTransform: "uppercase" as const,
    }}>
      {children}
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "9px 14px", color: "#E2E8F0", fontSize: 13,
  textDecoration: "none", fontFamily: "inherit",
}

export default UserMenu
