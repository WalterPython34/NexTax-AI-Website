"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X, User } from "lucide-react"
import { AuthModal } from "@/components/auth/auth-modal"
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin")
  const [user, setUser] = useState<SupabaseUser | null>(null)

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthClick = (mode: "signin" | "signup") => {
    setAuthMode(mode)
    setShowAuthModal(true)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const navItems = [
    { name: "Features", href: "/features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Resources", href: "/resources" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/images/nextax-logo.png" alt="NexTax.AI" width={40} height={40} className="rounded-lg" />
              <span className="text-xl font-bold text-white">NexTax.AI</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-slate-300 hover:text-white transition-colors duration-200"
                >
                  {item.name}
                </Link>
              ))}

              {/* StartSmart GPT - Points to subdomain */}
              <Link
                href="https://startsmart.nextax.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-emerald-600 hover:to-cyan-600 transition-all duration-200 shadow-lg"
              >
                StartSmart GPT
              </Link>
            </div>

            {/* Auth Section */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleAuthClick("signin")}
                    variant="ghost"
                    size="sm"
                    className="text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => handleAuthClick("signup")}
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    Try StartSmart Free
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="md:hidden py-4 border-t border-slate-800">
              <div className="flex flex-col space-y-4">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-slate-300 hover:text-white transition-colors duration-200 px-2 py-1"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}

                {/* Mobile StartSmart GPT Link */}
                <Link
                  href="https://startsmart.nextax.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold text-center"
                  onClick={() => setIsOpen(false)}
                >
                  StartSmart GPT
                </Link>

                {user ? (
                  <div className="flex flex-col space-y-2 pt-4 border-t border-slate-800">
                    <div className="text-slate-300 text-sm px-2">{user.email}</div>
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2 pt-4 border-t border-slate-800">
                    <Button
                      onClick={() => handleAuthClick("signin")}
                      variant="ghost"
                      size="sm"
                      className="text-slate-300 hover:text-white hover:bg-slate-800 justify-start"
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={() => handleAuthClick("signup")}
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      Try StartSmart Free
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} mode={authMode} />
    </>
  )
}
