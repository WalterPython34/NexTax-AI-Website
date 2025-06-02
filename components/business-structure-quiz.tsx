"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Building2, TrendingUp, Mail, ArrowRight, Loader2 } from "lucide-react"

const quizQuestions = [
  {
    id: "profit",
    question: "What's your expected annual business profit?",
    options: [
      { value: "llc", text: "Under $60,000" },
      { value: "scorp", text: "Over $60,000" },
    ],
  },
  {
    id: "complexity",
    question: "How much administrative complexity are you comfortable with?",
    options: [
      { value: "llc", text: "Prefer minimal paperwork and formalities" },
      { value: "scorp", text: "Comfortable with corporate formalities and record-keeping" },
    ],
  },
  {
    id: "ownership",
    question: "What are your ownership and investment plans?",
    options: [
      { value: "llc", text: "Want flexibility in ownership structure" },
      { value: "scorp", text: "Plan to issue stock to investors" },
    ],
  },
  {
    id: "taxes",
    question: "What's your priority regarding taxes?",
    options: [
      { value: "llc", text: "Simple tax filing with pass-through taxation" },
      { value: "scorp", text: "Willing to run payroll to save on self-employment taxes" },
    ],
  },
  {
    id: "growth",
    question: "What are your business growth plans?",
    options: [
      { value: "llc", text: "Keep it simple and maintain flexibility" },
      { value: "scorp", text: "Build a formal structure for investors" },
    ],
  },
]

export function BusinessStructureQuiz() {
  const [currentStep, setCurrentStep] = useState<"contact" | "quiz" | "results" | "thanks">("contact")
  const [contactInfo, setContactInfo] = useState({ name: "", email: "", phone: "" })
  const [answers, setAnswers] = useState<Record<string, "llc" | "scorp">>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleContactSubmit = () => {
    console.log("Button clicked!")
    console.log("Current contact info:", contactInfo)

    if (!contactInfo.name.trim() || !contactInfo.email.trim()) {
      console.log("Validation failed")
      alert("Please fill in your name and email")
      return
    }

    console.log("Validation passed, moving to quiz")
    setCurrentStep("quiz")
  }

  const handleAnswerSelect = (questionId: string, value: "llc" | "scorp") => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    console.log("Answer:", questionId, value)

    if (currentQuestion < quizQuestions.length - 1) {
      setTimeout(() => setCurrentQuestion((prev) => prev + 1), 500)
    } else {
      setTimeout(() => setCurrentStep("results"), 500)
    }
  }

  const calculateResults = () => {
    const llcCount = Object.values(answers).filter((answer) => answer === "llc").length
    const scorpCount = Object.values(answers).filter((answer) => answer === "scorp").length

    if (llcCount > scorpCount) {
      return {
        recommendation: "LLC",
        confidence: Math.round((llcCount / 5) * 100),
        summary: "An LLC appears to be the better choice for your business.",
      }
    } else if (scorpCount > llcCount) {
      return {
        recommendation: "S-Corporation",
        confidence: Math.round((scorpCount / 5) * 100),
        summary: "An S-Corporation may be more suitable for your business.",
      }
    } else {
      return {
        recommendation: "Consultation Recommended",
        confidence: 50,
        summary: "Your needs are balanced between both structures.",
      }
    }
  }

  const submitQuizData = async () => {
    console.log("🔴 SUBMIT BUTTON CLICKED - Function called!")
    try {
      setIsSubmitting(true)
      setError(null)

      const results = calculateResults()
      const timestamp = new Date().toISOString()

      console.log("🚀 STARTING QUIZ SUBMISSION")
      console.log("📋 Contact Info:", contactInfo)
      console.log("📊 Answers:", answers)
      console.log("🎯 Results:", results)
      console.log("⏰ Timestamp:", timestamp)

      const payload = {
        contactInfo,
        answers,
        results,
        timestamp,
      }

      console.log("📦 Full payload:", JSON.stringify(payload, null, 2))
      console.log("🌐 Making fetch request to /api/submit-quiz...")

      const response = await fetch("/api/submit-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      console.log("🌐 Fetch response status:", response.status)
      console.log("🌐 Fetch response OK:", response.ok)

      // Try to get the response text first
      const responseText = await response.text()
      console.log("🌐 Raw response text:", responseText)

      // Then parse it as JSON if possible
      let data
      try {
        data = JSON.parse(responseText)
        console.log("🌐 Parsed JSON response:", data)
      } catch (e) {
        console.error("❌ Failed to parse response as JSON:", e)
        console.error("❌ Raw response was:", responseText)
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${responseText}`)
      }

      console.log("✅ Quiz data submitted successfully:", data)
      setCurrentStep("thanks")
    } catch (err: any) {
      console.error("❌ Error submitting quiz:", err)
      console.error("❌ Error details:", err.message)
      setError(err.message || "Failed to submit quiz data. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (currentStep === "contact") {
    return (
      <Card className="bg-gradient-to-r from-emerald-600 to-cyan-600 border-emerald-500/50 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white text-center text-2xl">Free Business Structure Quiz</CardTitle>
          <p className="text-emerald-100 text-center">Get personalized recommendations in just 5 questions</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4 max-w-md mx-auto">
            <div>
              <Label htmlFor="name" className="text-white">
                Full Name *
              </Label>
              <Input
                id="name"
                value={contactInfo.name}
                onChange={(e) => setContactInfo((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-white">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-white">
                Phone Number (Optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo((prev) => ({ ...prev, phone: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                placeholder="(555) 123-4567"
              />
            </div>
            <Button
              type="button"
              onClick={handleContactSubmit}
              className="w-full bg-white text-emerald-600 hover:bg-slate-100 font-semibold"
            >
              Start Quiz
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  if (currentStep === "quiz") {
    const question = quizQuestions[currentQuestion]
    const progress = ((currentQuestion + 1) / quizQuestions.length) * 100

    return (
      <Card className="bg-gradient-to-r from-emerald-600 to-cyan-600 border-emerald-500/50 max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <Badge className="bg-white/20 text-white">
              Question {currentQuestion + 1} of {quizQuestions.length}
            </Badge>
            <div className="text-white text-sm">{Math.round(progress)}% Complete</div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mb-4">
            <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <CardTitle className="text-white text-xl text-center">{question.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[question.id] || ""}
            onValueChange={(value) => handleAnswerSelect(question.id, value as "llc" | "scorp")}
            className="space-y-4"
          >
            {question.options.map((option, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 bg-white/10 rounded-lg p-4 hover:bg-white/20 transition-colors cursor-pointer"
              >
                <RadioGroupItem
                  value={option.value}
                  id={`${question.id}-${index}`}
                  className="border-white text-white"
                />
                <Label htmlFor={`${question.id}-${index}`} className="text-white font-medium cursor-pointer flex-1">
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    )
  }

  if (currentStep === "results") {
    const results = calculateResults()

    return (
      <Card className="bg-gradient-to-r from-emerald-600 to-cyan-600 border-emerald-500/50 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white text-center text-2xl mb-4">Your Recommendation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
              {results.recommendation === "LLC" ? (
                <Building2 className="w-10 h-10 text-white" />
              ) : (
                <TrendingUp className="w-10 h-10 text-white" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{results.recommendation}</h3>
            <Badge className="bg-white/20 text-white mb-4">{results.confidence}% Match</Badge>
            <p className="text-emerald-100 max-w-2xl mx-auto">{results.summary}</p>
          </div>

          {error && <div className="bg-red-500/20 text-red-200 p-4 rounded-lg text-center">{error}</div>}

          <div className="bg-white/10 rounded-lg p-6 text-center">
            <Button
              onClick={() => {
                console.log("🔴 BUTTON CLICKED!")
                submitQuizData()
              }}
              className="bg-white text-emerald-600 hover:bg-slate-100"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Save Results & Get Detailed Analysis
                  <Mail className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (currentStep === "thanks") {
    return (
      <Card className="bg-gradient-to-r from-emerald-600 to-cyan-600 border-emerald-500/50 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white text-center text-2xl mb-4">Thank You!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
            <CheckIcon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Submission Received</h3>
          <p className="text-emerald-100 max-w-2xl mx-auto">
            Thank you for completing our Business Structure Quiz. We've saved your results and will send you a detailed
            analysis to your email shortly.
          </p>
          <p className="text-emerald-100">
            One of our business formation experts may reach out to discuss your specific needs and answer any questions
            you might have.
          </p>
          <div className="bg-white/10 rounded-lg p-6 mt-6">
            <Button
              onClick={() => {
                setCurrentStep("contact")
                setContactInfo({ name: "", email: "", phone: "" })
                setAnswers({})
                setCurrentQuestion(0)
                setError(null)
              }}
              className="bg-white text-emerald-600 hover:bg-slate-100"
            >
              Take Quiz Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}

// Simple check icon component
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
