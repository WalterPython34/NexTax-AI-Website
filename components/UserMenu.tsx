// components/UserMenu.tsx
//
// Dropdown user menu shown in the buyer-dashboard nav.
// Replaces the previous "click to sign out" tooltip on the avatar circle.
//
// Inline-styled to match buyer-dashboard.tsx aesthetic (no Tailwind dependency
// for this isolated component — keeps the dashboard's visual cohesion).

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

  // Close on outside click
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

  // Close on Escape
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
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        aria-expanded={open}
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

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            minWidth: 220, borderRadius: 10,
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
            <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 3, wordBreak: "break-all" }}>
              {user.email}
            </div>
            <div style={{ fontSize: 10, color: isPro ? "#818CF8" : "#7C8593", fontWeight: 600, letterSpacing: "0.04em" }}>
              {isPro ? "⚡ PRO PLAN" : "FREE PLAN"}
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: "6px 0" }}>
            <MenuLink href="/account" onClick={() => setOpen(false)} icon="👤">
              Account
            </MenuLink>
            <MenuLink href="/account#billing" onClick={() => setOpen(false)} icon="💳">
              Billing
            </MenuLink>
            <MenuLink href="/contact" onClick={() => setOpen(false)} icon="✉️">
              Support
            </MenuLink>

            <div style={{
              height: 1,
              background: "rgba(255,255,255,0.06)",
              margin: "6px 0",
            }} />

            <button
              onClick={handleSignOut}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 14px",
                background: "transparent",
                border: "none",
                color: "#94A3B8",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#F87171" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8" }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>↪</span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper component ───────────────────────────────────────────────────

function MenuLink({
  href,
  onClick,
  icon,
  children,
}: {
  href:     string
  onClick?: () => void
  icon:     string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 14px",
        color: "#E2E8F0",
        fontSize: 13,
        textDecoration: "none",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.08)" }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
      {children}
    </Link>
  )
}

export default UserMenu
