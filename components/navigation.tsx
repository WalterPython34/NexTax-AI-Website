"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, LogOut } from "lucide-react"
import { supabase, hasStartSmartAccess } from "@/lib/supabase"
import { AuthModal } from "@/components/auth/auth-modal"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "signin" | "signup" }>({
    isOpen: false,
    mode: "signin",
  })

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        checkAccess(user.id)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkAccess(session.user.id)
      } else {
        setHasAccess(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAccess = async (userId: string) => {
    const access = await hasStartSmartAccess(userId)
    setHasAccess(!!access)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const navItems = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/resources", label: "Resources" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/startsmart-gpt", label: "StartSmart GPT", highlight: true },
  ]

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <img src="/images/nextax-logo.png" alt="NexTax.AI" className="h-12 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-slate-300 hover:text-emerald-400 transition-colors ${
                    item.highlight ? "bg-emerald-500/20 px-3 py-1 rounded-md font-semibold" : ""
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Auth Section */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-slate-300 text-sm">{user.email}</span>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-slate-300 hover:text-white">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => setAuthModal({ isOpen: true, mode: "signin" })}
                >
                  Sign In
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden text-slate-300" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="md:hidden py-4 border-t border-slate-800">
              <div className="flex flex-col space-y-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-slate-300 hover:text-emerald-400 transition-colors ${
                      item.highlight ? "bg-emerald-500/20 px-3 py-1 rounded-md w-fit font-semibold" : ""
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                {user ? (
                  <Button variant="ghost" onClick={handleSignOut} className="text-slate-300 hover:text-white w-fit">
                    Sign Out
                  </Button>
                ) : (
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600 text-white w-fit"
                    onClick={() => setAuthModal({ isOpen: true, mode: "signin" })}
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        mode={authModal.mode}
      />
    </>
  )
}
