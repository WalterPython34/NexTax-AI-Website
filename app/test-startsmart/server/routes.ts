import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <img src="/images/nextax-logo.png" alt="NexTax.AI" className="h-8 w-auto" />
            <p className="text-slate-400 text-sm">
              AI-powered business formation and tax services for modern entrepreneurs.
            </p>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Services</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>
                <Link href="/startsmart" className="hover:text-emerald-400 transition-colors">
                  StartSmart Business Launch
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-emerald-400 transition-colors">
                  AI Tax Solutions
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-400 transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Resources</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>
                <Link href="/resources" className="hover:text-emerald-400 transition-colors">
                  Business Guides
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-emerald-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Legal</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center">
          <p className="text-slate-400 text-sm">© {new Date().getFullYear()} NexTax.AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}