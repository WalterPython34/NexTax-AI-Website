"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ApiTestPage() {
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const testApi = async () => {
    setLoading(true)
    setResult("")

    try {
      console.log("🧪 Testing API...")

      const response = await fetch("/api/submit-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactInfo: { name: "Test User", email: "test@example.com", phone: "555-1234" },
          answers: { profit: "llc", complexity: "llc", ownership: "llc", taxes: "llc", growth: "llc" },
          results: { recommendation: "LLC", confidence: 100, summary: "Test recommendation" },
          timestamp: new Date().toISOString(),
        }),
      })

      const data = await response.json()
      console.log("📊 API Response:", data)

      setResult(JSON.stringify(data, null, 2))
    } catch (error: any) {
      console.error("❌ API Error:", error)
      setResult(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>API Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testApi} disabled={loading}>
            {loading ? "Testing..." : "Test Submit Quiz API"}
          </Button>

          {result && (
            <div className="bg-slate-100 p-4 rounded-lg">
              <pre className="text-sm overflow-auto">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
