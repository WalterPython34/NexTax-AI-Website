import StartupCostCalculator from "@/components/startup-cost-calculator"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function StartupCalculatorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Link href="/resources">
          <Button variant="ghost" className="mb-8 text-gray-400 hover:text-white hover:bg-gray-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Resources
          </Button>
        </Link>

        {/* Calculator Component */}
        <StartupCostCalculator />

        {/* Additional Info Section */}
        <div className="mt-12 max-w-6xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">Need Help Planning Your Business Finances?</h3>
            <p className="text-gray-300 mb-6">
              Our tax experts can help you optimize your startup costs, identify tax deductions, and create a
              comprehensive financial plan for your new business. Schedule a free consultation to discuss your specific
              needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Schedule Consultation</Button>
              </Link>
              <Link href="/startsmart">
                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent">
                  Try StartSmart GPT
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
