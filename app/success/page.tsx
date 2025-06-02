import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Mail, Phone, Calendar, FileText } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>

            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">Payment Successful</Badge>

            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">Welcome to StartSmart!</h1>

            <p className="text-xl text-slate-300 mb-8">
              Your payment has been processed successfully. Now let's get your business formation started.
            </p>

            {/* Next Step - Complete Questionnaire */}
            <Card className="bg-gradient-to-r from-emerald-600 to-cyan-600 border-emerald-500/50 mb-8">
              <CardContent className="p-8">
                <div className="flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-white mr-3" />
                  <h2 className="text-2xl font-bold text-white">Next Step: Complete Your Business Questionnaire</h2>
                </div>
                <p className="text-emerald-100 mb-6">
                  Now that payment is complete, please fill out our detailed questionnaire so we can begin your business
                  formation process.
                </p>

                <Link href="https://form.typeform.com/to/hybbpz1Z" target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    className="bg-white text-emerald-600 hover:bg-slate-100 px-8 py-4 text-lg font-semibold"
                  >
                    <FileText className="mr-3 w-5 h-5" />
                    Complete Business Questionnaire
                  </Button>
                </Link>

                <p className="text-emerald-100 text-sm mt-4">
                  ⏱️ Takes 3-5 minutes • Opens in new tab • Mobile-friendly
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold text-white mb-6">What Happens Next?</h2>

                <div className="space-y-6 text-left">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-emerald-400 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Complete Questionnaire (Now)</h3>
                      <p className="text-slate-300">
                        Fill out our detailed business formation questionnaire with your company details.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-emerald-400 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Receive SS-4 Form (Within 2-3 minutes)</h3>
                      <p className="text-slate-300">
                        You'll get an email with your pre-filled SS-4 form. Print, sign, and upload it via the link
                        provided.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-emerald-400 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Business Formation Begins (Within 24 hours)</h3>
                      <p className="text-slate-300">
                        Our team processes your EIN filing and begins entity formation with your state.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-emerald-400 font-bold text-sm">4</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Business Ready to Operate (Within 48 hours)</h3>
                      <p className="text-slate-300">
                        Complete entity formation, EIN, operating agreements, and all required documentation delivered.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center">
                  <Mail className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Email Support</h3>
                  <p className="text-slate-400 text-sm">hello@nextax.ai</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center">
                  <Phone className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Phone Support</h3>
                  <p className="text-slate-400 text-sm">1-800-NEXTAX</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Schedule Call</h3>
                  <p className="text-slate-400 text-sm">calendly.com/nextax</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Link href="/">
                <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  Return to Homepage
                </Button>
              </Link>
              <p className="text-slate-400 text-sm">
                Questions? Contact us anytime - we're here to help your business succeed!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
