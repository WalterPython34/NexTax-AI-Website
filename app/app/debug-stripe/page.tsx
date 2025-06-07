"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function DebugStripePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [priceId, setPriceId] = useState("")

  const testStripeConnection = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: priceId || "price_test",
          productName: "Test Product",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Stripe Integration Debug</h1>

      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Environment Check</h2>
        <p>
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:{" "}
          {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? "✅ Present" : "❌ Missing"}
        </p>
        <p className="text-sm text-gray-500 mt-2">Note: The secret key can only be checked on the server side.</p>
      </div>

      <div className="mb-6">
        <label className="block mb-2">
          Price ID to test:
          <input
            type="text"
            value={priceId}
            onChange={(e) => setPriceId(e.target.value)}
            className="w-full p-2 border rounded mt-1"
            placeholder="e.g., price_1234567890"
          />
        </label>
        <Button onClick={testStripeConnection} disabled={loading} className="mt-2">
          {loading ? "Testing..." : "Test Stripe Connection"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-6">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded mb-6">
          <h3 className="font-bold">Success:</h3>
          <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="bg-blue-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Troubleshooting Tips</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Make sure your Stripe API keys are correctly set in your environment variables.</li>
          <li>Verify that the price ID exists in your Stripe dashboard.</li>
          <li>Check if the price is active in your Stripe dashboard.</li>
          <li>For recurring prices, make sure to use "subscription" mode in the checkout session.</li>
          <li>For one-time prices, use "payment" mode in the checkout session.</li>
        </ul>
      </div>
    </div>
  )
}
