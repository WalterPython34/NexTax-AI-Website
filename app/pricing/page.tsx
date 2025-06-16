import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  X,
  Zap,
  Crown,
  Building2,
  ArrowRight,
  Shield,
  Clock,
  Star,
  FileText,
  Globe,
  DollarSign,
  Calculator,
} from "lucide-react"
import { StripeCheckoutButton } from "@/components/stripe-checkout-button"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PricingPage() {
  const packages = [
    {
      name: "StartSmart Essential",
      icon: Zap,
      price: "$299",
      priceId: "price_1RVxBWGA3ir6ndSxlzwF0aXk", // ✅ UPDATED with LIVE price ID
      period: "",
      description: "Simple business formation for straightforward LLCs",
      features: [
        "Priority 48-Hour LLC Formation",
        "Business Registration in your State",
        "Basic compliance setup",
        "Email support",
        "Digital document delivery",
        "No add-ons or hidden fees",
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
      description: "Complete business formation in 48 hours",
      features: [
        "EIN Filing (Employer ID Number)",
        "Priority 48-Hour LLC Formation",
        "Business Registration in your State",
        "LLC Agreement Preparation",
        "Complete compliance setup",
        "Priority phone & email support",
        "Digital document vault",
        "30-day follow-up support",
        "No add-ons or hidden fees",
      ],
      notIncluded: ["Bank account setup", "Virtual address", "Ongoing monthly support"],
      popular: true,
      cta: "Launch My Business",
      savings: "Save $147",
    },
    {
      name: "StartSmart Premium",
      icon: Building2,
      price: "$699",
      priceId: "price_1RUgSNGA3ir6ndSxbI53k3dB", // ✅ UPDATED with LIVE price ID
      period: "",
      description: "The complete business launch experience",
      features: [
        "Everything in StartSmart Complete",
        "U.S. Business Bank Account Setup",
        "Virtual U.S. Address (1 year)",
        "Accounting/Bookkeeping Setup",
        "Priority 24-hour formation",
        "Dedicated account manager",
        "90-day business support",
        "Tax planning consultation",
        "No add-ons or hidden fees",
      ],
      notIncluded: [],
      popular: false,
      cta: "Go Premium",
      savings: "Save $296",
    },
  ]

  // Individual services with real price IDs
  const individualServices = [
    {
      name: "EIN Filing",
      icon: FileText,
      price: "$149",
      priceId: "price_1RVxG4GA3ir6ndSxWgrZhf9U",
      description: "Fast Employer Identification Number (EIN) filing with the IRS",
      features: [
        "Required for business banking",
        "Needed for hiring employees",
        "Essential for tax filings",
        "Completed within 24-48 hours",
        "Confirmation documentation provided",
      ],
      cta: "Get EIN Filing",
    },
    {
      name: "Priority LLC Formation",
      icon: Zap,
      price: "$299",
      priceId: "price_1RSVUy9BRJVw3je6CjlqWoKQ",
      description: "48-hour business entity formation service",
      features: [
        "Articles of organization filing",
        "State registration",
        "Registered agent service",
        "Compliance documentation",
        "Fast business formation",
      ],
      cta: "Form My LLC",
    },
    {
      name: "Virtual U.S. Address",
      icon: Globe,
      price: "$99",
      period: "/year",
      priceId: "price_1RVxJ9GA3ir6ndSxsy8lgErB",
      description: "Professional business address for mail forwarding",
      features: [
        "Mail scanning services",
        "Mail forwarding services",
        "Business presence in the US",
        "Use for business registration",
        "Perfect for remote businesses",
      ],
      cta: "Get Virtual Address",
    },
    {
      name: "Bank Account Setup",
      icon: DollarSign,
      price: "$99",
      priceId: "price_1RVxKbGA3ir6ndSxbBK3T2uf",
      description: "Business banking assistance and setup support",
      features: [
        "Documentation preparation",
        "Account opening guidance",
        "Major U.S. banks support",
        "Completed in 3-5 business days",
        "Banking relationship setup",
      ],
      cta: "Setup Bank Account",
    },
    {
      name: "LLC Agreement",
      icon: FileText,
      price: "$199",
      priceId: "price_1RVxMUGA3ir6ndSx7JzW1uqS",
      description: "Custom operating agreement tailored to your business",
      features: [
        "Member rights documentation",
        "Profit distribution terms",
        "Management structure",
        "Legal protections",
        "Delivered within 24-48 hours",
      ],
      cta: "Get LLC Agreement",
    },
    {
      name: "Accounting Setup",
      icon: Calculator,
      price: "$299",
      priceId: "price_1RVxNyGA3ir6ndSx6eR59qi0",
      description: "Complete QuickBooks setup and training for your business",
      features: [
        "Chart of accounts configuration",
        "Initial transaction setup",
        "Basic bookkeeping training",
        "Ongoing support resources",
        "Financial systems setup",
      ],
      cta: "Setup Accounting",
    },
  ]

  // Monthly subscription services with real price IDs
  const subscriptionServices = [
    {
      name: "Tax Compliance Support",
      icon: Shield,
      price: "$199",
      period: "/month",
      priceId: "price_1RVxPVGA3ir6ndSxwCSWV2rC",
      description: "Ongoing tax filing and compliance management",
      features: [
        "Monthly tax review",
        "Quarterly filings",
        "Annual returns",
        "Tax planning consultations",
        "Proactive compliance monitoring",
      ],
      cta: "Start Tax Support",
    },
    {
      name: "Business Support",
      icon: Building2,
      price: "$99",
      period: "/month",
      priceId: "price_1RVxR5GA3ir6ndSxZCYWvDbI",
      description: "Ongoing business consultation and support",
      features: [
        "Monthly consultation calls",
        "Email support",
        "Document updates",
        "Compliance monitoring",
        "Business resource library access",
      ],
      cta: "Get Business Support",
    },
    {
      name: "Basic Bookkeeping",
      icon: Calculator,
      price: "$149",
      period: "/month",
      priceId: "price_1RVxSKGA3ir6ndSxQ5rrc58j",
      description: "Essential monthly bookkeeping for small businesses",
      features: [
        "Transaction categorization",
        "Bank reconciliation",
        "Monthly financial statements",
        "Expense tracking",
        "Quarterly business review",
      ],
      cta: "Start Basic Bookkeeping",
    },
    {
      name: "Full-Service Accounting",
      icon: Calculator,
      price: "$299",
      period: "/month",
      priceId: "price_1RVxTqGA3ir6ndSxoXGXLC9f",
      description: "Complete accounting and financial management",
      features: [
        "All Basic Bookkeeping features",
        "Accounts payable/receivable",
        "Payroll processing",
        "Tax preparation and planning",
        "CFO-level insights",
      ],
      cta: "Start Full Accounting",
    },
    {
      name: "Enterprise Accounting",
      icon: Building2,
      price: "$599",
      period: "/month",
      priceId: "price_1RVxV3GA3ir6ndSxyFhrc8QI",
      description: "Advanced accounting for complex businesses",
      features: [
        "Multi-entity accounting",
        "Advanced financial modeling",
        "Investor reporting",
        "Audit preparation",
        "Dedicated account manager",
      ],
      cta: "Get Enterprise Accounting",
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
                    <span className="text-slate-400">{pkg.period || ""}</span>
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

      {/* Individual Services - One-time payments */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Individual Services</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              One-time services to help establish your business
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {individualServices.map((service, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardHeader className="text-center pb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <service.icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <CardTitle className="text-xl text-white">{service.name}</CardTitle>
                  <p className="text-slate-400 text-sm">{service.description}</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-white">{service.price}</span>
                    <span className="text-slate-400">{service.period || ""}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {service.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <StripeCheckoutButton
                    priceId={service.priceId}
                    productName={service.name}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    {service.cta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </StripeCheckoutButton>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription Services */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ongoing Support Services</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Monthly subscription services to help your business thrive
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {subscriptionServices.map((service, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardHeader className="text-center pb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <service.icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <CardTitle className="text-xl text-white">{service.name}</CardTitle>
                  <p className="text-slate-400 text-sm">{service.description}</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-white">{service.price}</span>
                    <span className="text-slate-400">{service.period || ""}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {service.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <StripeCheckoutButton
                    priceId={service.priceId}
                    productName={service.name}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    {service.cta}
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
                  title: "Safely Secure Payment",
                  description: "Complete your purchase with our secure, bank-level encrypted payment system.",
                  time: "2 minutes",
                },
                {
                  step: "2",
                  title: "Tell Us About Your Business",
                  description: "Answer a simple questionnaire about your business needs and structure.",
                  time: "5 minutes",
                },
                {
                  step: "3",
                  title: "AI Powered Setup",
                  description: "Our AI analyzes your information instantly and prepares all required legal documents.",
                  time: "2 hours",
                },
                {
                  step: "4",
                  title: "Launch Your Business",
                  description: "Complete entity formation, receive EIN filing, and all compliance documentation.",
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
