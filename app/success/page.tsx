"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Mail, Phone, Calendar, FileText, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [countdown, setCountdown] = useState(10)
  const [autoRedirect, setAutoRedirect] = useState(true)
  const [productType, setProductType] = useState<"ein" | "other" | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch the product type from the session ID
  useEffect(() => {
    const fetchProductType = async () => {
      if (!sessionId) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/check-product-type?session_id=${sessionId}`)
        const data = await response.json()

        // Check if the product includes EIN filing
        setProductType(data.includesEIN ? "ein" : "other")
      } catch (error) {
        console.error("Error fetching product type:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProductType()
  }, [sessionId])

  // Countdown timer for EIN products
  useEffect(() => {
    if (productType !== "ein" || !autoRedirect || countdown <= 0) return

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    if (countdown === 0 && autoRedirect) {
      window.location.href = "https://form.typeform.com/to/hybbpz1Z"
    }

    return () => clearTimeout(timer)
  }, [countdown, autoRedirect, productType])

  // If still loading, show a loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Clock className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Processing Your Purchase</h2>
          <p className="text-slate-300">Just a moment while we confirm your order details...</p>
        </div>
      </div>
    )
  }

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

            {/* LLC vs S-Corp Guide Section - Only for EIN products */}
            {productType === "ein" && (
              <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-blue-500/50 mb-6">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-white mr-3" />
                    <h2 className="text-2xl font-bold text-white">IMPORTANT: Choose the Right Business Structure</h2>
                  </div>
                  <p className="text-blue-100 mb-6">
                    Before completing your questionnaire, download our comprehensive guide to ensure you're choosing the
                    optimal business structure for your specific situation.
                  </p>

                  <div className="bg-white/10 rounded-lg p-4 mb-6">
                    <p className="text-white font-semibold mb-2">⚠️ Critical Decision Point:</p>
                    <p className="text-blue-100 text-sm">
                      Once you complete the questionnaire, your SS-4 form will be prepared for your chosen structure.
                      Review this guide now to avoid costly changes later.
                    </p>
                  </div>

                  <div className="text-center">
                    <a
                      href="/resources/llc-vs-scorp-guide.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Button
                        size="lg"
                        className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg font-semibold mr-4"
                      >
                        <FileText className="mr-3 w-5 h-5" />
                        Download LLC vs S-Corp Guide
                      </Button>
                    </a>
                    <p className="text-blue-100 text-sm mt-3">
                      📄 Comprehensive 25-page guide • Expert recommendations • Real-world examples
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Step - Complete Questionnaire - Only for EIN products */}
            {productType === "ein" ? (
              <Card className="bg-gradient-to-r from-emerald-600 to-cyan-600 border-emerald-500/50 mb-8">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-white mr-3" />
                    <h2 className="text-2xl font-bold text-white">Ready? Complete Your Business Questionnaire</h2>
                  </div>
                  <p className="text-emerald-100 mb-6">
                    After reviewing the structure guide above, complete our detailed questionnaire so we can prepare
                    your business formation documents.
                  </p>

                  {autoRedirect ? (
                    <div className="mb-6 bg-white/10 rounded-lg p-4 text-center">
                      <p className="text-white mb-2">
                        You will be automatically redirected to the questionnaire in{" "}
                        <span className="font-bold text-xl">{countdown}</span> seconds
                      </p>
                      <Button
                        variant="outline"
                        className="bg-white/20 text-white hover:bg-white/30 border-white/30 mr-3"
                        onClick={() => setAutoRedirect(false)}
                      >
                        Cancel Redirect
                      </Button>
                      <Button
                        className="bg-white text-emerald-600 hover:bg-slate-100"
                        onClick={() => (window.location.href = "https://form.typeform.com/to/hybbpz1Z")}
                      >
                        Continue Now
                      </Button>
                    </div>
                  ) : (
                    <Link href="https://form.typeform.com/to/hybbpz1Z" target="_blank" rel="noopener noreferrer">
                      <Button
                        size="lg"
                        className="bg-white text-emerald-600 hover:bg-slate-100 px-8 py-4 text-lg font-semibold"
                      >
                        <FileText className="mr-3 w-5 h-5" />
                        Complete Business Questionnaire
                      </Button>
                    </Link>
                  )}

                  <p className="text-emerald-100 text-sm mt-4">
                    ⏱️ Takes 3-5 minutes • Opens in new tab • Mobile-friendly
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-r from-emerald-600 to-cyan-600 border-emerald-500/50 mb-8">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-white mr-3" />
                    <h2 className="text-2xl font-bold text-white">Your Purchase is Complete!</h2>
                  </div>
                  <p className="text-emerald-100 mb-6">
                    Thank you for your purchase. You'll receive a confirmation email shortly with details about your
                    order.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-slate-800/50 border-slate-700 mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold text-white mb-6">What Happens Next?</h2>

                <div className="space-y-6 text-left">
                  {productType === "ein" ? (
                    <>
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
                            Complete entity formation, EIN, operating agreements, and all required documentation
                            delivered.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-emerald-400 font-bold text-sm">1</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white mb-2">Order Processing (Now)</h3>
                          <p className="text-slate-300">
                            Our team is reviewing your order and preparing your services.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-emerald-400 font-bold text-sm">2</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white mb-2">Confirmation Email (Within 15 minutes)</h3>
                          <p className="text-slate-300">
                            You'll receive a detailed confirmation email with next steps to complete the EIN process and access to your services.  Alternativly, the EIN questionnaire is also included below for your conveinence.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-emerald-400 font-bold text-sm">3</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white mb-2">Service Delivery (Within 24-48 hours)</h3>
                          <p className="text-slate-300">
                            Your purchased services will be delivered according to the service timeline.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            </section>

            {/* Typeform Section for After Purchase */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-cyan-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* StartSmart Logo - Black Version */}
            <div className="flex justify-center mb-8">
              <img src="/images/StartSmart-logo-new-business-launch.png" alt="StartSmart by NexTax.AI" className="h-40 w-auto" />
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to Start Your Business?</h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
              You can now complete our simple EIN questionnaire and we'll handle the rest. Your business will be
              legally formed and ready to operate within 48 hours.
            </p>
            <Link href="/startsmart">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-slate-100 px-8 py-4 text-lg">
                View Questionnaire
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center">
                  <Mail className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Email Support</h3>
                  <p className="text-slate-400 text-sm">support@nextax.ai</p>
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
                  <p className="text-slate-400 text-sm">calendly.com/steven-morello-nextax</p>
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
