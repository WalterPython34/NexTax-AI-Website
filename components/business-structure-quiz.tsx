"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Building, Users, DollarSign, Shield } from "lucide-react"

interface QuizAnswer {
  question: string
  answer: string
  weight: number
}

const questions = [
  {
    id: 1,
    question: "How many owners will your business have?",
    options: [
      { value: "sole", label: "Just me (1 owner)", weights: { sole: 3, llc: 2, corp: 0, scorp: 0 } },
      { value: "partnership", label: "2-3 owners", weights: { sole: 0, llc: 3, corp: 2, scorp: 2 } },
      { value: "multiple", label: "4+ owners", weights: { sole: 0, llc: 2, corp: 3, scorp: 3 } },
    ],
  },
  {
    id: 2,
    question: "What's your expected annual revenue?",
    options: [
      { value: "low", label: "Under $50,000", weights: { sole: 3, llc: 2, corp: 0, scorp: 1 } },
      { value: "medium", label: "$50,000 - $200,000", weights: { sole: 2, llc: 3, corp: 1, scorp: 2 } },
      { value: "high", label: "Over $200,000", weights: { sole: 1, llc: 2, corp: 3, scorp: 3 } },
    ],
  },
  {
    id: 3,
    question: "How important is personal liability protection?",
    options: [
      { value: "not-important", label: "Not very important", weights: { sole: 3, llc: 1, corp: 0, scorp: 0 } },
      { value: "somewhat", label: "Somewhat important", weights: { sole: 1, llc: 3, corp: 2, scorp: 2 } },
      { value: "very", label: "Very important", weights: { sole: 0, llc: 2, corp: 3, scorp: 3 } },
    ],
  },
  {
    id: 4,
    question: "Do you plan to seek investors or go public?",
    options: [
      { value: "no", label: "No plans for investors", weights: { sole: 2, llc: 3, corp: 1, scorp: 1 } },
      { value: "maybe", label: "Possibly in the future", weights: { sole: 1, llc: 2, corp: 3, scorp: 2 } },
      { value: "yes", label: "Yes, definitely", weights: { sole: 0, llc: 1, corp: 3, scorp: 2 } },
    ],
  },
  {
    id: 5,
    question: "How do you prefer to handle taxes?",
    options: [
      { value: "simple", label: "Keep it simple", weights: { sole: 3, llc: 2, corp: 0, scorp: 1 } },
      { value: "flexible", label: "Want flexibility", weights: { sole: 1, llc: 3, corp: 1, scorp: 2 } },
      { value: "optimize", label: "Optimize for tax savings", weights: { sole: 0, llc: 1, corp: 2, scorp: 3 } },
    ],
  },
]

const businessStructures = {
  sole: {
    name: "Sole Proprietorship",
    icon: Users,
    description: "Simple structure for single-owner businesses",
    pros: ["Easy to set up", "Complete control", "Simple tax filing"],
    cons: ["Unlimited personal liability", "Hard to raise capital", "Business dies with owner"],
  },
  llc: {
    name: "Limited Liability Company (LLC)",
    icon: Shield,
    description: "Flexible structure with liability protection",
    pros: ["Personal liability protection", "Tax flexibility", "Operational flexibility"],
    cons: ["More paperwork", "Self-employment taxes", "Varies by state"],
  },
  corp: {
    name: "C Corporation",
    icon: Building,
    description: "Traditional corporate structure",
    pros: ["Strong liability protection", "Easy to raise capital", "Perpetual existence"],
    cons: ["Double taxation", "Complex regulations", "Extensive record-keeping"],
  },
  scorp: {
    name: "S Corporation",
    icon: DollarSign,
    description: "Tax-advantaged corporate structure",
    pros: ["No double taxation", "Liability protection", "Tax savings on self-employment"],
    cons: ["Strict eligibility rules", "Limited to 100 shareholders", "Complex payroll requirements"],
  },
}

export function BusinessStructureQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState("")

  const handleAnswer = () => {
    if (!selectedAnswer) return

    const question = questions[currentQuestion]
    const selectedOption = question.options.find((opt) => opt.value === selectedAnswer)

    if (selectedOption) {
      const newAnswer: QuizAnswer = {
        question: question.question,
        answer: selectedOption.label,
        weight: 1,
      }

      setAnswers([...answers, newAnswer])
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer("")
    } else {
      calculateResults()
    }
  }

  const calculateResults = () => {
    const scores = { sole: 0, llc: 0, corp: 0, scorp: 0 }

    answers.forEach((answer, index) => {
      const question = questions[index]
      const selectedOption = question.options.find((opt) => opt.label === answer.answer)

      if (selectedOption) {
        Object.entries(selectedOption.weights).forEach(([structure, weight]) => {
          scores[structure as keyof typeof scores] += weight
        })
      }
    })

    setShowResults(true)
  }

  const getRecommendation = () => {
    const scores = { sole: 0, llc: 0, corp: 0, scorp: 0 }

    answers.forEach((answer, index) => {
      const question = questions[index]
      const selectedOption = question.options.find((opt) => opt.label === answer.answer)

      if (selectedOption) {
        Object.entries(selectedOption.weights).forEach(([structure, weight]) => {
          scores[structure as keyof typeof scores] += weight
        })
      }
    })

    const recommendedStructure = Object.entries(scores).reduce((a, b) =>
      scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b,
    )[0] as keyof typeof businessStructures

    return businessStructures[recommendedStructure]
  }

  const resetQuiz = () => {
    setCurrentQuestion(0)
    setAnswers([])
    setShowResults(false)
    setSelectedAnswer("")
  }

  if (showResults) {
    const recommendation = getRecommendation()
    const IconComponent = recommendation.icon

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Your Recommended Business Structure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <IconComponent className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-blue-900 mb-2">{recommendation.name}</h3>
            <p className="text-blue-700">{recommendation.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">Advantages:</h4>
              <ul className="space-y-1">
                {recommendation.pros.map((pro, index) => (
                  <li key={index} className="text-sm text-green-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-orange-700 mb-2">Considerations:</h4>
              <ul className="space-y-1">
                {recommendation.cons.map((con, index) => (
                  <li key={index} className="text-sm text-orange-600">
                    • {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-gray-600">
              This recommendation is based on your responses. Consider consulting with a professional for personalized
              advice.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={resetQuiz} variant="outline">
                Take Quiz Again
              </Button>
              <Button asChild>
                <a href="/contact">Get Professional Advice</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100
  const question = questions[currentQuestion]

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
        <CardTitle className="text-xl">{question.question}</CardTitle>
        <CardDescription>Choose the option that best describes your situation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
          {question.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (currentQuestion > 0) {
                setCurrentQuestion(currentQuestion - 1)
                setSelectedAnswer("")
              }
            }}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          <Button onClick={handleAnswer} disabled={!selectedAnswer}>
            {currentQuestion === questions.length - 1 ? "Get Results" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

