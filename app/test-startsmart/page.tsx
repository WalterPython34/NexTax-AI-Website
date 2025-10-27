import { Suspense } from "react"
import StartSmartClient from "./start-smart-client"

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <StartSmartClient />
    </Suspense>
  )
}

