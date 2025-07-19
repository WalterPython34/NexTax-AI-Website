"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Circle, Clock, ArrowRight, Lightbulb, FileText, Building, DollarSign, Shield } from "lucide-react"

interface RoadmapStep {
  id: string
  title: string
  description: string
  status: "completed" | "current" | "upcoming" | "locked"
  category: "planning" | "formation" | "compliance" | "operations"
  estimatedTime: string
  tasks: Array<{
    id: string
    title: string
    completed: boolean
    description?: string
  }>
}

export function ProgressRoadmap() {
  const [roadmapSteps] = useState<RoadmapStep[]>([
    {
      id: "1",
      title: "Business Planning",
      description: "Define your business idea and create a solid foundation",
      status: "completed",
      category: "planning",
      estimatedTime: "1-2 weeks",
      tasks: [
        { id: "1-1", title: "Business idea validation", completed: true, description: "Research market demand" },
        { id: "1-2", title: "Business model canvas", completed: true, description: "Define your business model" },
        { id: "1-3", title: "Market research", completed: true, description: "Analyze competitors and target market" },
        { id: "1-4", title: "Financial projections", completed: true, description: "Create basic financial forecasts" },
      ],
    },
    {
      id: "2",
      title: "Entity Formation",
      description: "Choose and register your business structure",
      status: "current",
      category: "formation",
      estimatedTime: "1-2 weeks",
      tasks: [
        {
          id: "2-1",
          title: "Choose business entity type",
          completed: true,
          description: "LLC vs Corporation decision",
        },
        { id: "2-2", title: "Select business name", completed: true, description: "Check name availability" },
        {
          id: "2-3",
          title: "File formation documents",
          completed: false,
          description: "Submit Articles of Organization/Incorporation",
        },
        {
          id: "2-4",
          title: "Create operating agreement",
          completed: false,
          description: "Draft LLC operating agreement or corporate bylaws",
        },
      ],
    },
    {
      id: "3",
      title: "Tax & Legal Setup",
      description: "Handle tax registrations and legal requirements",
      status: "upcoming",
      category: "compliance",
      estimatedTime: "1 week",
      tasks: [
        { id: "3-1", title: "Apply for EIN", completed: false, description: "Get federal tax ID number" },
        {
          id: "3-2",
          title: "Register for state taxes",
          completed: false,
          description: "State tax registration if required",
        },
        { id: "3-3", title: "Choose tax elections", completed: false, description: "S-Corp election if beneficial" },
        {
          id: "3-4",
          title: "Get business licenses",
          completed: false,
          description: "Apply for required licenses and permits",
        },
      ],
    },
    {
      id: "4",
      title: "Business Operations",
      description: "Set up banking, accounting, and operational systems",
      status: "upcoming",
      category: "operations",
      estimatedTime: "1-2 weeks",
      tasks: [
        {
          id: "4-1",
          title: "Open business bank account",
          completed: false,
          description: "Separate business and personal finances",
        },
        {
          id: "4-2",
          title: "Set up accounting system",
          completed: false,
          description: "Choose and configure accounting software",
        },
        {
          id: "4-3",
          title: "Get business insurance",
          completed: false,
          description: "General liability and other needed coverage",
        },
        {
          id: "4-4",
          title: "Create business processes",
          completed: false,
          description: "Document key business procedures",
        },
      ],
    },
    {
      id: "5",
      title: "Ongoing Compliance",
      description: "Maintain compliance and grow your business",
      status: "locked",
      category: "compliance",
      estimatedTime: "Ongoing",
      tasks: [
        { id: "5-1", title: "Annual filings", completed: false, description: "State annual reports and renewals" },
        { id: "5-2", title: "Tax compliance", completed: false, description: "Quarterly and annual tax obligations" },
        { id: "5-3", title: "Record keeping", completed: false, description: "Maintain corporate records and minutes" },
        { id: "5-4", title: "Business growth", completed: false, description: "Scale operations and expand" },
      ],
    },
  ])

  const getCategoryIcon = (category: RoadmapStep["category"]) => {
    switch (category) {
      case "planning":
        return <Lightbulb className="h-5 w-5" />
      case "formation":
        return <Building className="h-5 w-5" />
      case "compliance":
        return <Shield className="h-5 w-5" />
      case "operations":
        return <DollarSign className="h-5 w-5" />
      default:
        return <Circle className="h-5 w-5" />
    }
  }

  const getCategoryColor = (category: RoadmapStep["category"]) => {
    switch (category) {
      case "planning":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "formation":
        return "bg-[hsl(174,73%,53%)]/10 text-[hsl(174,73%,53%)] border-[hsl(174,73%,53%)]/20"
      case "compliance":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "operations":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: RoadmapStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case "current":
        return <Clock className="h-6 w-6 text-[hsl(174,73%,53%)]" />
      case "upcoming":
        return <Circle className="h-6 w-6 text-slate-400" />
      case "locked":
        return <Circle className="h-6 w-6 text-slate-300" />
      default:
        return <Circle className="h-6 w-6 text-slate-400" />
    }
  }

  const currentStep = roadmapSteps.find((step) => step.status === "current")
  const completedSteps = roadmapSteps.filter((step) => step.status === "completed").length
  const totalSteps = roadmapSteps.length
  const overallProgress = (completedSteps / totalSteps) * 100

  // Calculate current step progress
  const currentStepProgress = currentStep
    ? (currentStep.tasks.filter((task) => task.completed).length / currentStep.tasks.length) * 100
    : 0

  return (
    <section className="flex-1 p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Business Formation Roadmap</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Track your progress through the business formation process
          </p>
        </div>

        {/* Overall Progress */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Progress</span>
              <span className="text-2xl font-bold text-[hsl(174,73%,53%)]">{Math.round(overallProgress)}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallProgress} className="h-3 mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {completedSteps} of {totalSteps} major steps completed
            </p>
          </CardContent>
        </Card>

        {/* Current Step Highlight */}
        {currentStep && (
          <Card className="mb-6 border-[hsl(174,73%,53%)] bg-[hsl(174,73%,53%)]/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-[hsl(174,73%,53%)]" />
                <span>Currently Working On</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{currentStep.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{currentStep.description}</p>
                </div>
                <Badge className={getCategoryColor(currentStep.category)}>{currentStep.category}</Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Step Progress</span>
                  <span>
                    {currentStep.tasks.filter((t) => t.completed).length} of {currentStep.tasks.length} tasks
                  </span>
                </div>
                <Progress value={currentStepProgress} className="h-2" />
              </div>

              <div className="space-y-2">
                {currentStep.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {task.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-400" />
                    )}
                    <div className="flex-1">
                      <span
                        className={`text-sm ${task.completed ? "line-through text-slate-500" : "text-slate-900 dark:text-white"}`}
                      >
                        {task.title}
                      </span>
                      {task.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{task.description}</p>
                      )}
                    </div>
                    {!task.completed && (
                      <Button size="sm" variant="outline">
                        Start
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Roadmap Steps */}
        <div className="space-y-4">
          {roadmapSteps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connector Line */}
              {index < roadmapSteps.length - 1 && (
                <div className="absolute left-6 top-16 w-0.5 h-16 bg-slate-200 dark:bg-slate-700 z-0"></div>
              )}

              <Card className={`relative z-10 ${step.status === "current" ? "ring-2 ring-[hsl(174,73%,53%)]" : ""}`}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">{getStatusIcon(step.status)}</div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                          <Badge className={getCategoryColor(step.category)}>
                            {getCategoryIcon(step.category)}
                            <span className="ml-1">{step.category}</span>
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500 dark:text-slate-400">Est. {step.estimatedTime}</p>
                        </div>
                      </div>

                      <p className="text-slate-600 dark:text-slate-400 mb-4">{step.description}</p>

                      {/* Task Progress */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Tasks</span>
                          <span>
                            {step.tasks.filter((t) => t.completed).length} of {step.tasks.length} completed
                          </span>
                        </div>
                        <Progress
                          value={(step.tasks.filter((t) => t.completed).length / step.tasks.length) * 100}
                          className="h-1.5"
                        />
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-2">
                          {step.status === "current" && (
                            <Button className="bg-[hsl(174,73%,53%)] hover:bg-[hsl(174,73%,48%)]">
                              Continue
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                          {step.status === "completed" && (
                            <Button variant="outline">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          )}
                          {step.status === "upcoming" && (
                            <Button variant="outline" disabled>
                              Coming Next
                            </Button>
                          )}
                          {step.status === "locked" && (
                            <Button variant="outline" disabled>
                              Locked
                            </Button>
                          )}
                        </div>

                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
