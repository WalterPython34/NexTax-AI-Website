import { Suspense } from "react"
import ValidatorCancelContent from "@/components/validator-cancel-content"

export default function ValidatorCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 pt-16 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Loading...</h2>
            <p className="text-slate-300">Just a moment...</p>
          </div>
        </div>
      }
    >
      <ValidatorCancelContent />
    </Suspense>
  )
}
