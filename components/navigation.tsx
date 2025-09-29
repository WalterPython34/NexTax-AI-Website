"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-slate-900 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/images/nextax-logo.png" alt="NexTax.AI" width={32} height={32} className="w-8 h-8" />
            <span className="font-bold text-xl">NexTax.AI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/features" className="hover:text-blue-400 transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-blue-400 transition-colors">
              Pricing
            </Link>
            <Link href="/resources" className="hover:text-blue-400 transition-colors">
              Resources
            </Link>
            <Link href="/about" className="hover:text-blue-400 transition-colors">
              About
            </Link>
            <Link href="/contact" className="hover:text-blue-400 transition-colors">
              Contact
            </Link>
          </div>

          {/* CTA Button - Only StartSmart GPT */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              className="text-white transition-all duration-200"
              style={{ backgroundColor: "#318CE7" }}
              onClick={() => window.open("https://legal-eye-q.vercel.app/", "_blank")}
            >
              Legal EyeQ
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white transition-all duration-200"
              onClick={() => window.open("https://startsmartbiz.ai", "_blank")}
            >
              StartSmart GPT
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:bg-slate-800"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-slate-700">
              <Link
                href="/features"
                className="block px-3 py-2 text-base font-medium hover:text-blue-400 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="block px-3 py-2 text-base font-medium hover:text-blue-400 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/resources"
                className="block px-3 py-2 text-base font-medium hover:text-blue-400 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Resources
              </Link>
              <Link
                href="/about"
                className="block px-3 py-2 text-base font-medium hover:text-blue-400 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="block px-3 py-2 text-base font-medium hover:text-blue-400 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="pt-4">
                <Button
                  className="w-full mb-2 text-white transition-all duration-200"
                  style={{ backgroundColor: "#00BFFF" }}
                  onClick={() => {
                    window.open("https://legal-eye-q.vercel.app/", "_blank")
                    setIsMenuOpen(false)
                  }}
                >
                  Legal EyeQ
                </Button>
                <Button
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white transition-all duration-200"
                  onClick={() => {
                    window.open("https://startsmart.nextax.ai", "_blank")
                    setIsMenuOpen(false)
                  }}
                >
                  StartSmart GPT
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

