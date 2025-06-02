"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Building2, Mail } from "lucide-react"

export function SimpleQuiz() {
  const [step, setStep] = useState(1)
  const [contactInfo, setContactInfo] = useState({ name: "", email: "", phone: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", contactInfo)
    setStep(2)
  }

  const handleRecommendation = () => {
    console.log("Recommendation requested")
    alert("Your recommendation: LLC\nCheck console for details")
  }

  return (
    <Card className="bg-slate-800 border-slate-700 max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white text-center text-2xl">Business Structure Quiz</CardTitle>
        <Badge className="bg-emerald-500/20 text-emerald-300 mx-auto">5 Simple Questions</Badge>
      </CardHeader>
      <CardContent>
        {step === 1 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={contactInfo.name}
                onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">
              Start Quiz
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Get Your Recommendation</h3>
            <p className="text-slate-300">Click below to see which business structure is right for you.</p>
            <Button onClick={handleRecommendation} className="bg-emerald-500 hover:bg-emerald-600">
              <Mail className="mr-2 w-4 h-4" />
              Get Recommendation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
