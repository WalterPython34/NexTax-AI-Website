import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
          <p className="text-gray-600">The page you're looking for doesn't exist or has been moved.</p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">Return Home</Link>
          </Button>

          <Button variant="outline" asChild className="w-full bg-transparent">
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
