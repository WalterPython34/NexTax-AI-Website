"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, ArrowRight, Shield, Clock, Loader2, MapPin, Gift } from "lucide-react"
import {
  type PricingTier,
  TIER_NAMES,
  TIER_BASE_PRICES,
  calculatePricing,
  getAvailableAddOns,
  getIncludedAddOns,
  formatPrice,
  getAllStates,
  STATE_NAMES,
  generateStripeLineItems,
  ALL_IN_SURCHARGE,
} from "@/lib/pricing-calculator"

interface CheckoutConfiguratorProps {
  isOpen: boolean
  selectedTier: PricingTier | null
  onClose: () => void
}

export function CheckoutConfigurator({ isOpen, selectedTier, onClose }: CheckoutConfiguratorProps) {
  const [selectedState, setSelectedState] = useState<string>("")
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen || !selectedTier) return null

  const states = getAllStates()
  const availableAddOns = getAvailableAddOns(selectedTier)
  const includedAddOns = getIncludedAddOns(selectedTier)

  const pricing = selectedState ? calculatePricing(selectedTier, selectedState, selectedAddOns) : null

  const basePrice = TIER_BASE_PRICES[selectedTier] ?? 0
  const tierName = TIER_NAMES[selectedTier] ?? "Selected Package"

  const handleAddOnToggle = (addOnId: string) => {
    setSelectedAddOns((prev) => (prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId]))
  }

  const handleCheckout = async () => {
    if (!selectedState || !pricing || !selectedTier) return

    setIsLoading(true)

    try {
      const lineItems = generateStripeLineItems(selectedTier, selectedState, selectedAddOns)

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineItems,
          tier: selectedTier,
          state: selectedState,
          addOns: selectedAddOns,
          metadata: {
            tier: selectedTier,
            state: selectedState,
            stateName: STATE_NAMES[selectedState],
            addOns: selectedAddOns.join(","),
          },
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error("No checkout URL returned")
      }
    } catch (error) {
      console.error("Checkout error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <Badge className="bg-emerald-500/20 text-emerald-400 mb-2">{tierName} Package</Badge>
              <CardTitle className="text-2xl text-white">Configure Your Order</CardTitle>
              <p className="text-slate-400 mt-1">Select your state and any additional services</p>
            </div>
            <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Step 1: State Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-white font-medium">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Which state are you forming in?
            </label>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 max-h-[300px]">
                {states.map((state) => (
                  <SelectItem
                    key={state.code}
                    value={state.code}
                    className="text-white hover:bg-slate-700 focus:bg-slate-700"
                  >
                    {state.name} - {formatPrice(state.fee)} filing fee
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Included Add-ons (for higher tiers) */}
          {includedAddOns.length > 0 && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white font-medium">
                <Gift className="w-4 h-4 text-emerald-400" />
                Included with {tierName}
              </label>
              <div className="space-y-2">
                {includedAddOns.map((addOn) => (
                  <div
                    key={addOn.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-white font-medium">{addOn.name}</p>
                        <p className="text-slate-400 text-sm">{addOn.description}</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400">Included</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Add-ons (for Launchpad) */}
          {availableAddOns.length > 0 && (
            <div className="space-y-3">
              <label className="text-white font-medium">Optional Add-ons</label>
              <div className="space-y-2">
                {availableAddOns.map((addOn) => (
                  <div
                    key={addOn.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAddOns.includes(addOn.id)
                        ? "bg-emerald-500/10 border-emerald-500/50"
                        : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                    }`}
                    onClick={() => handleAddOnToggle(addOn.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedAddOns.includes(addOn.id)}
                        className="border-slate-500 data-[state=checked]:bg-emerald-500"
                      />
                      <div>
                        <p className="text-white font-medium">{addOn.name}</p>
                        <p className="text-slate-400 text-sm">{addOn.description}</p>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-semibold">+{formatPrice(addOn.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Summary */}
          {selectedState && pricing && (
            <div className="space-y-3 pt-4">
              <Separator className="bg-slate-700" />
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-white font-semibold">Order Summary</h4>

                {pricing.breakdown.map((item, index) => (
                  <div key={index} className="flex justify-between text-slate-300">
                    <span>{item.label}</span>
                    <span>{item.amount === 0 ? "FREE" : formatPrice(item.amount)}</span>
                  </div>
                ))}

                {selectedTier === "all-in" && pricing.stateFee === 0 && pricing.surcharge === 0 && (
                  <div className="flex justify-between text-emerald-400 text-sm">
                    <span>State Filing Fee (absorbed by NexTax)</span>
                    <span>$0</span>
                  </div>
                )}

                {selectedTier === "all-in" && pricing.surcharge > 0 && (
                  <div className="text-xs text-slate-400 mt-2">
                    *{STATE_NAMES[selectedState]} has a high state filing fee. A ${ALL_IN_SURCHARGE} surcharge applies.
                  </div>
                )}

                <Separator className="bg-slate-700" />

                <div className="flex justify-between text-xl font-bold text-white">
                  <span>Total</span>
                  <span className="text-emerald-400">{formatPrice(pricing.totalPrice)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Checkout Button */}
          <Button
            onClick={handleCheckout}
            disabled={!selectedState || isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white py-6 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to Secure Payment
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" /> Secure Payment
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> 48-Hour Guarantee
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Expert Support
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

