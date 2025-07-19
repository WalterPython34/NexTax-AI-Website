"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, User } from "lucide-react"

const navigation = [
  { name: "Features", href: "/features" },
  { name: "Pricing", href: "/pricing" },
  { name: "Resources", href: "/resources" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
]

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Mock user - replace with actual auth logic
  const user = {
    email: "steven.morello@nextax.ai",
  }

  const handleSignOut = () => {
    // Add your sign out logic here
    console.log("Sign out clicked")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/images/nextax-logo.png" alt="NexTax.AI" width={40} height={40} className="rounded-lg" />
            <span className="text-xl font-bold text-white">NexTax.AI</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-slate-300 hover:text-white transition-colors duration-200"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* NexTax Test StartSmart Link */}
        <Link href="/test-startsmart">
          <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg">
            🧪 Test StartSmart
          </Button>
        </Link>

        {/* StartSmart GPT - Points to Replit app */}
        <Link
          href="https://startsmart.nextax.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-emerald-600 hover:to-cyan-600 transition-all duration-200 shadow-lg"
        >
          StartSmart GPT
        </Link>

        {/* Auth Section */}
        {user ? (
          <div className="hidden md:flex items-center space-x-4">
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
          <div className="hidden md:flex items-center space-x-2">
            <Button
              onClick={() => console.log("Sign in")}
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-800 bg-transparent"
            >
              Sign In
            </Button>
            <Button
              onClick={() => console.log("Sign up")}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Try StartSmart Free
            </Button>
          </div>
        )}

        {/* Mobile menu button */}
        <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/test-startsmart"
              className="block rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              StartSmart GPT
            </Link>
            <div className="pt-4">
              <Button asChild className="w-full">
                <Link href="/book-consultation">Book Consultation</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

