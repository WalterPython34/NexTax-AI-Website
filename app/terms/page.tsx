import { Card, CardContent } from "@/components/ui/card"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-8 prose prose-invert max-w-none">
              <div className="text-slate-300 space-y-6">
                <p>
                  <strong>Last updated:</strong> {new Date().toLocaleDateString()}
                </p>

                <h2 className="text-2xl font-semibold text-white">Acceptance of Terms</h2>
                <p>
                  By accessing and using this website, you accept and agree to be bound by the terms and provision of
                  this agreement.
                </p>

                <h2 className="text-2xl font-semibold text-white">Services</h2>
                <p>
                  NexTax.AI provides AI-powered business formation and tax services. All services are subject to
                  availability and our current pricing.
                </p>

                <h2 className="text-2xl font-semibold text-white">Contact Information</h2>
                <p>For questions about these Terms of Service, please contact us at hello@nextax.ai.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
