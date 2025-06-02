import { Card, CardContent } from "@/components/ui/card"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 prose prose-invert max-w-none">
              <div className="text-slate-300 space-y-6">
                <p>
                  <strong>Last updated:</strong> {new Date().toLocaleDateString()}
                </p>

                <h2 className="text-2xl font-semibold text-white">Information We Collect</h2>
                <p>
                  We collect information you provide directly to us, such as when you complete our business structure
                  quiz, contact us, or use our services.
                </p>

                <h2 className="text-2xl font-semibold text-white">How We Use Your Information</h2>
                <p>
                  We use the information we collect to provide, maintain, and improve our services, process
                  transactions, and communicate with you.
                </p>

                <h2 className="text-2xl font-semibold text-white">Information Sharing</h2>
                <p>
                  We do not sell, trade, or otherwise transfer your personal information to third parties without your
                  consent, except as described in this policy.
                </p>

                <h2 className="text-2xl font-semibold text-white">Contact Us</h2>
                <p>If you have any questions about this Privacy Policy, please contact us at hello@nextax.ai.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
