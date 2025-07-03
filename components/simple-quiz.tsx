"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react"

interface QuizData {
  businessType: string
  businessName: string
  state: string
  owners: string
  revenue: string
  employees: string
  industry: string
  goals: string
  timeline: string
  email: string
  phone: string
  additionalInfo: string
}

const questions = [
  {
    id: "businessType",
    title: "What type of business are you starting?",
    type: "radio",
    options: [
      "Service-based business",
      "Product-based business",
      "E-commerce/Online business",
      "Consulting/Professional services",
      "Restaurant/Food service",
      "Retail store",
      "Technology/Software",
      "Other",
    ],
  },
  {
    id: "businessName",
    title: "What is your business name?",
    type: "text",
    placeholder: "Enter your business name",
  },
  {
    id: "state",
    title: "In which state will you operate?",
    type: "text",
    placeholder: "Enter state name",
  },
  {
    id: "owners",
    title: "How many owners will the business have?",
    type: "radio",
    options: ["1 (Just me)", "2", "3-5", "More than 5"],
  },
  {
    id: "revenue",
    title: "What is your expected annual revenue?",
    type: "radio",
    options: [
      "Less than $50,000",
      "$50,000 - $100,000",
      "$100,000 - $500,000",
      "$500,000 - $1,000,000",
      "More than $1,000,000",
    ],
  },
  {
    id: "employees",
    title: "Do you plan to hire employees?",
    type: "radio",
    options: ["No employees planned", "1-5 employees", "6-20 employees", "More than 20 employees"],
  },
  {
    id: "industry",
    title: "What industry best describes your business?",
    type: "radio",
    options: [
      "Professional Services",
      "Healthcare",
      "Technology",
      "Retail/E-commerce",
      "Food & Beverage",
      "Construction",
      "Manufacturing",
      "Education",
      "Other",
    ],
  },
  {
    id: "goals",
    title: "What are your primary business goals?",
    type: "textarea",
    placeholder: "Describe your main business objectives...",
  },
  {
    id: "timeline",
    title: "When do you want to launch your business?",
    type: "radio",
    options: ["Within 1 month", "1-3 months", "3-6 months", "6-12 months", "More than 1 year"],
  },
  {
    id: "email",
    title: "What is your email address?",
    type: "email",
    placeholder: "your@email.com",
  },
  {
    id: "phone",
    title: "What is your phone number?",
    type: "tel",
    placeholder: "(555) 123-4567",
  },
  {
    id: "additionalInfo",
    title: "Any additional information or specific questions?",
    type: "textarea",
    placeholder: "Tell us anything else that might help us provide better recommendations...",
  },
]

export function SimpleQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Partial<QuizData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/submit-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(answers),
      })

      if (response.ok) {
        setIsCompleted(true)
      } else {
        throw new Error("Failed to submit quiz")
      }
    } catch (error) {
      console.error("Error submitting quiz:", error)
      alert("There was an error submitting your quiz. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCompleted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your business assessment has been submitted successfully. We'll analyze your responses and send you
            personalized recommendations within 24 hours.
          </p>
          <Button onClick={() => window.location.reload()}>Take Another Assessment</Button>
        </CardContent>
      </Card>
    )
  }

  const currentQ = questions[currentQuestion]
  const currentAnswer = answers[currentQ.id as keyof QuizData] || ""
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <CardTitle className="text-xl">
          Question {currentQuestion + 1} of {questions.length}
        </CardTitle>
        <CardDescription>{currentQ.title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentQ.type === "radio" && (
          <RadioGroup value={currentAnswer} onValueChange={(value) => handleAnswer(currentQ.id, value)}>
            {currentQ.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {currentQ.type === "text" && (
          <Input
            value={currentAnswer}
            onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
            placeholder={currentQ.placeholder}
          />
        )}

        {currentQ.type === "email" && (
          <Input
            type="email"
            value={currentAnswer}
            onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
            placeholder={currentQ.placeholder}
          />
        )}

        {currentQ.type === "tel" && (
          <Input
            type="tel"
            value={currentAnswer}
            onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
            placeholder={currentQ.placeholder}
          />
        )}

        {currentQ.type === "textarea" && (
          <Textarea
            value={currentAnswer}
            onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
            placeholder={currentQ.placeholder}
            rows={4}
          />
        )}

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={handlePrevious} disabled={currentQuestion === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={!currentAnswer || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Assessment"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!currentAnswer}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
