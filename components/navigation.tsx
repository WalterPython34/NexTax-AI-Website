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
            <span className="font-bold text-xl tracking-tight font-['Space_Grotesk',_sans-serif]">NexTax<span className="text-teal-400">.AI</span>
              </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/features" className="hover:text-teal-400 transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-teal-400 transition-colors">
              Pricing
            </Link>
            <Link href="/resources" className="hover:text-teal-400 transition-colors">
              Resources
            </Link>
            <Link href="/about" className="hover:text-teal-400 transition-colors">
              About
            </Link>
            <Link href="/contact" className="hover:text-teal-400 transition-colors">
              Contact
            </Link>
          </div>

          {/* CTA Button - Only StartSmart GPT */}
          <div className="hidden md:flex items-center space-x-4">
            
            <Button
              className="bg-white hover:bg-gradient-to-r hover:from-navy-400 hover:to-cyan-500 text-slate-600 hover:text-white transition-all duration-200 border border-navy-500"
              onClick={() => window.open("https://valuationhub.emergent.host/", "_blank")}
            >
              AcquiFlow
            </Button>
            <Button
              className="bg-white hover:bg-gradient-to-r hover:from-emerald-500 hover:to-cyan-500 text-slate-600 hover:text-white transition-all duration-200 border border-emerald-500"
              onClick={() => window.open("https://startsmartbiz.ai", "_blank")}
            >
              StartSmart App
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white p-3 min-w-[48px] min-h-[48px]"
            >
              {isMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-6 space-y-2 sm:px-3 border-t border-slate-700">
              <Link
                href="/features"
                className="block px-4 py-4 text-white hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="block px-4 py-4 text-white hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/resources"
                className="block px-4 py-4 text-white hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Resources
              </Link>
              <Link
                href="/about"
                className="block px-4 py-4 text-white hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="block px-4 py-4 text-white hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="pt-4">
                <Button
                  className="w-full mb-2 text-white transition-all duration-200"
                  style={{ backgroundColor: "#00BFFF" }}
                  onClick={() => {
                    window.open("https://valuationhub.emergent.host", "_blank")
                    setIsMenuOpen(false)
                  }}
                >
                  AcquiFlow
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

