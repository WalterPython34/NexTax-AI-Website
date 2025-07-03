"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface QuizData {
  businessType: string
  revenue: string
  employees: string
  location: string
  email: string
  name: string
}

export default function SimpleQuiz() {
  const [currentStep, setCurrentStep] = useState(0)
  const [quizData, setQuizData] = useState<QuizData>({
    businessType: "",
    revenue: "",
    employees: "",
    location: "",
    email: "",
    name: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const questions = [
    {
      id: "name",
      title: "What's your name?",
      type: "input",
      placeholder: "Enter your full name",
    },
    {
      id: "email",
      title: "What's your email address?",
      type: "input",
      placeholder: "Enter your email",
    },
    {
      id: "businessType",
      title: "What type of business are you starting?",
      type: "radio",
      options: [
        { value: "llc", label: "LLC (Limited Liability Company)" },
        { value: "corporation", label: "Corporation" },
        { value: "partnership", label: "Partnership" },
        { value: "sole-proprietorship", label: "Sole Proprietorship" },
        { value: "not-sure", label: "Not sure yet" },
      ],
    },
    {
      id: "revenue",
      title: "What's your expected annual revenue?",
      type: "radio",
      options: [
        { value: "under-50k", label: "Under $50,000" },
        { value: "50k-100k", label: "$50,000 - $100,000" },
        { value: "100k-500k", label: "$100,000 - $500,000" },
        { value: "over-500k", label: "Over $500,000" },
        { value: "not-sure", label: "Not sure yet" },
      ],
    },
    {
      id: "employees",
      title: "How many employees will you have?",
      type: "radio",
      options: [
        { value: "just-me", label: "Just me" },
        { value: "1-5", label: "1-5 employees" },
        { value: "6-20", label: "6-20 employees" },
        { value: "over-20", label: "Over 20 employees" },
      ],
    },
    {
      id: "location",
      title: "Where will your business be located?",
      type: "radio",
      options: [
        { value: "california", label: "California" },
        { value: "new-york", label: "New York" },
        { value: "texas", label: "Texas" },
        { value: "florida", label: "Florida" },
        { value: "other", label: "Other state" },
      ],
    },
  ]

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleInputChange = (value: string) => {
    const currentQuestion = questions[currentStep]
    setQuizData((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/submit-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quizData),
      })

      if (response.ok) {
        setIsComplete(true)
      } else {
        console.error("Failed to submit quiz")
      }
    } catch (error) {
      console.error("Error submitting quiz:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentQuestion = questions[currentStep]
  const currentValue = quizData[currentQuestion.id as keyof QuizData]
  const isCurrentStepValid = currentValue && currentValue.trim() !== ""

  if (isComplete) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-green-600">Thank You!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p>Your business assessment has been submitted successfully.</p>
          <p>We'll send you a personalized business formation guide within 24 hours.</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Take Quiz Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Business Formation Assessment</CardTitle>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">
          Question {currentStep + 1} of {questions.length}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">{currentQuestion.title}</h3>

          {currentQuestion.type === "input" ? (
            <Input
              value={currentValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={currentQuestion.placeholder}
              type={currentQuestion.id === "email" ? "email" : "text"}
            />
          ) : (
            <RadioGroup value={currentValue} onValueChange={handleInputChange}>
              {currentQuestion.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={!isCurrentStepValid || isSubmitting}>
            {isSubmitting ? "Submitting..." : currentStep === questions.length - 1 ? "Submit" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
