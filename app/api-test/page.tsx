"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ApiTestPage() {
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const testApi = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test")
      const data = await response.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>API Test</CardTitle>
          <CardDescription>Test the API connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testApi} disabled={loading}>
            {loading ? "Testing..." : "Test API"}
          </Button>
          {result && <pre className="bg-gray-100 p-4 rounded-md overflow-auto">{result}</pre>}
        </CardContent>
      </Card>
    </div>
  )
}

