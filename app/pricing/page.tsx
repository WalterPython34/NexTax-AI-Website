import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, X, Zap, Crown, Building2, ArrowRight, Shield, Clock, Star } from "lucide-react"
import { StripeCheckoutButton } from "@/components/stripe-checkout-button"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PricingPage() {
  const packages = [
    {
      name: "Essential Launch",
      icon: Zap,
      price: "$299",
      priceId: "price_1RVxBWGA3ir6ndSxlzwF0aXk", // ✅ UPDATED with LIVE price ID
      period: "",
      description: "Perfect for simple business formation",
      features: [
        "Priority 48-Hour LLC Formation",
        "Business Registration in your State",
        "Basic compliance setup",
        "Email support",
        "Digital document delivery",
      ],
      notIncluded: ["EIN Filing", "LLC Agreement", "Bank account setup", "Ongoing support"],
      popular: false,
      cta: "Get Started",
      savings: "",
    },
    {
      name: "StartSmart Complete",
      icon: Crown,
      price: "$499",
      priceId: "price_1RVxDBGA3ir6ndSxWWPxWX0Y", // ✅ UPDATED with LIVE price ID
      period: "",
      description: "Our most popular complete business launch",
      features: [
        "EIN Filing (Employer ID Number)",
        "Priority 48-Hour LLC Formation",
        "Business Registration in your State",
        "LLC Agreement Preparation",
        "Complete compliance setup",
        "Priority phone & email support",
        "Digital document vault",
        "30-day follow-up support",
      ],
      notIncluded: ["Bank account setup", "Virtual address", "Ongoing monthly support"],
      popular: true,
      cta: "Launch My Business",
      savings: "Save $147",
    },
    {
      name: "Premium Launch",
      icon: Building2,
      price: "$699",
      priceId: "price_1RUgSNGA3ir6ndSxbI53k3dB", // ✅ UPDATED with LIVE price ID
      period: "",
      description: "Everything you need plus premium services",
      features: [
        "Everything in StartSmart Complete",
        "U.S. Business Bank Account Setup",
        "Virtual U.S. Address (1 year)",
        "Accounting/Bookkeeping Setup",
        "Priority 24-hour formation",
        "Dedicated account manager",
        "90-day business support",
        "Tax planning consultation",
      ],
      notIncluded: [],
      popular: false,
      cta: "Go Premium",
      savings: "Save $296",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">
            <Crown className="w-4 h-4 mr-2" />
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Choose Your Business
            <span className="block text-emerald-400">Launch Package</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
            From simple formation to complete business setup. All packages include our AI-powered optimization and
            expert support.
          </p>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <Shield className="w-12 h-12 text-emerald-400 mb-4" />
              <h3 className="font-semibold text-white mb-2">100% Secure</h3>
              <p className="text-slate-400 text-sm">Bank-level encryption & SOC 2 compliant</p>
            </div>
            <div className="flex flex-col items-center">
              <Clock className="w-12 h-12 text-emerald-400 mb-4" />
              <h3 className="font-semibold text-white mb-2">48-Hour Guarantee</h3>
              <p className="text-slate-400 text-sm">Business ready to operate or money back</p>
            </div>
            <div className="flex flex-col items-center">
              <Star className="w-12 h-12 text-emerald-400 mb-4" />
              <h3 className="font-semibold text-white mb-2">4.9/5 Rating</h3>
              <p className="text-slate-400 text-sm">From 2,847+ successful business launches</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
              <h3 className="font-semibold text-white mb-2">Expert Support</h3>
              <p className="text-slate-400 text-sm">20+ years Big 4 & Wall Street experience</p>
            </div>
          </div>
        </div>
      </section>

      {/* Package Pricing */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Complete Business Launch Packages</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Everything you need to get your business up and running legally. Pay once, launch in 48 hours.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-20">
            {packages.map((pkg, i) => (
              <Card
                key={i}
                className={`relative bg-slate-800/50 border-slate-700 ${
                  pkg.popular ? "border-emerald-500/50 scale-105" : ""
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white px-4 py-1">Most Popular</Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <pkg.icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <CardTitle className="text-2xl text-white">{pkg.name}</CardTitle>
                  <p className="text-slate-400">{pkg.description}</p>
                  <div className="mt-6">
                    <span className="text-4xl font-bold text-white">{pkg.price}</span>
                    <span className="text-slate-400">{pkg.period}</span>
                  </div>
                  {pkg.savings && <Badge className="bg-emerald-500/20 text-emerald-300 mt-2">{pkg.savings}</Badge>}
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {pkg.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="text-slate-300">{feature}</span>
                      </div>
                    ))}
                    {pkg.notIncluded.map((feature, j) => (
                      <div key={j} className="flex items-center gap-3 opacity-50">
                        <X className="w-5 h-5 text-slate-500 flex-shrink-0" />
                        <span className="text-slate-500">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <StripeCheckoutButton
                    priceId={pkg.priceId}
                    productName={pkg.name}
                    className={`w-full ${
                      pkg.popular
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : "bg-slate-700 hover:bg-slate-600 text-white"
                    }`}
                  >
                    {pkg.cta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </StripeCheckoutButton>

                  {/* Trust indicators for each package */}
                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                      <span>✓ Secure payment</span>
                      <span>✓ 48hr guarantee</span>
                      <span>✓ Expert support</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Services */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Individual Service Offerings</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Enhance your business with these additional services and tools
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              {
                name: "Tax Optimization Consultation",
                price: "$199",
                priceId: "price_tax_optimization_consultation",
                description: "One-on-one consultation with a tax expert to identify tax-saving opportunities",
                features: [
                  "60-minute video consultation",
                  "Personalized tax strategy",
                  "Industry-specific deductions",
                  "Written summary and action plan",
                  "30-day email follow-up support",
                ],
                cta: "Book Consultation",
              },
              {
                name: "Compliance Monitoring",
                price: "$49",
                period: "/month",
                priceId: "price_compliance_monitoring_monthly",
                description: "Ongoing compliance monitoring and alerts for your business",
                features: [
                  "Real-time compliance tracking",
                  "Automated filing reminders",
                  "Multi-state monitoring",
                  "Regulatory updates",
                  "Monthly compliance report",
                ],
                cta: "Start Monitoring",
              },
              {
                name: "Virtual Business Address",
                price: "$99",
                period: "/year",
                priceId: "price_virtual_address_yearly",
                description: "Professional business address with mail forwarding",
                features: [
                  "Physical street address (not a P.O. box)",
                  "Mail scanning and forwarding",
                  "Package receiving",
                  "Use on business documents",
                  "Available in 50+ US cities",
                ],
                cta: "Get Address",
              },
              {
                name: "Accounting Setup",
                price: "$249",
                priceId: "price_accounting_setup",
                description: "Complete accounting system setup for your new business",
                features: [
                  "QuickBooks or Xero setup",
                  "Chart of accounts customization",
                  "Bank account integration",
                  "Initial bookkeeping training",
                  "Tax category configuration",
                ],
                cta: "Setup Accounting",
              },
              {
                name: "Website & Email Setup",
                price: "$349",
                priceId: "price_website_email_setup",
                description: "Professional website and business email configuration",
                features: [
                  "Domain registration (1 year)",
                  "5-page business website",
                  "Professional email accounts",
                  "Basic SEO setup",
                  "Contact form integration",
                ],
                cta: "Get Online",
              },
              {
                name: "Legal Document Package",
                price: "$199",
                priceId: "price_legal_document_package",
                description: "Essential legal documents for your business operations",
                features: [
                  "Privacy policy",
                  "Terms of service",
                  "Client contract template",
                  "NDA template",
                  "Independent contractor agreement",
                ],
                cta: "Get Documents",
              },
              {
                name: "AI Tax Assistant",
                price: "$99",
                period: "/month",
                priceId: "price_ai_tax_assistant_monthly",
                description: "24/7 AI-powered tax assistant for your business questions",
                features: [
                  "Unlimited tax questions",
                  "Document analysis",
                  "Deduction finder",
                  "Compliance checks",
                  "Human expert backup",
                ],
                cta: "Get AI Assistant",
              },
              {
                name: "Business Credit Building",
                price: "$499",
                priceId: "price_business_credit_building",
                description: "Establish and build business credit separate from personal credit",
                features: [
                  "Business credit profile setup",
                  "Vendor credit line applications",
                  "Credit building strategy",
                  "Monthly progress tracking",
                  "6-month program",
                ],
                cta: "Build Credit",
              },
              {
                name: "Tax Return Preparation",
                price: "$399",
                priceId: "price_tax_return_preparation",
                description: "Professional preparation of your business tax returns",
                features: [
                  "Federal & state returns",
                  "Schedule C preparation",
                  "Business deduction optimization",
                  "Electronic filing",
                  "Audit support",
                ],
                cta: "Prepare Taxes",
              },
            ].map((product, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-xl text-white">{product.name}</CardTitle>
                  <p className="text-slate-400 text-sm">{product.description}</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-white">{product.price}</span>
                    <span className="text-slate-400">{product.period || ""}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {product.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <StripeCheckoutButton
                    priceId={product.priceId}
                    productName={product.name}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    {product.cta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </StripeCheckoutButton>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Typeform Section for After Purchase */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-cyan-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* StartSmart Logo - Black Version */}
            <div className="flex justify-center mb-8">
              <img src="/images/startsmart-logo-black.png" alt="StartSmart by NexTax.AI" className="h-28 w-auto" />
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to Start Your Business?</h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
              After purchase, you'll complete our simple questionnaire and we'll handle the rest. Your business will be
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
      </section>

      {/* Process Explanation */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">What Happens After You Purchase?</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Our streamlined process gets your business legally formed and ready to operate in just 48 hours.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: "1",
                  title: "Secure Payment",
                  description: "Complete your purchase with our secure, encrypted payment system.",
                  time: "2 minutes",
                },
                {
                  step: "2",
                  title: "Business Questionnaire",
                  description: "Fill out our detailed questionnaire about your business needs and structure.",
                  time: "5 minutes",
                },
                {
                  step: "3",
                  title: "AI Processing",
                  description: "Our AI analyzes your information and prepares all required legal documents.",
                  time: "2 hours",
                },
                {
                  step: "4",
                  title: "Business Launch",
                  description: "Complete entity formation, EIN filing, and all compliance documentation delivered.",
                  time: "48 hours",
                },
              ].map((step, i) => (
                <Card key={i} className="bg-slate-800/50 border-slate-700 text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 font-bold text-lg">{step.step}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-slate-300 text-sm mb-3">{step.description}</p>
                    <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">{step.time}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
