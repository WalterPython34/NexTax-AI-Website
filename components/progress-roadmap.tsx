"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  Circle,
  Clock,
  Target,
  TrendingUp,
  DollarSign,
  Building,
  Shield,
  Lightbulb,
  Rocket,
} from "lucide-react"

interface Milestone {
  id: string
  title: string
  description: string
  category: "foundation" | "legal" | "financial" | "operational" | "growth"
  status: "completed" | "in-progress" | "pending" | "blocked"
  progress: number
  estimatedDays: number
  dependencies?: string[]
  tasks: Task[]
}

interface Task {
  id: string
  title: string
  completed: boolean
  optional?: boolean
}

export function ProgressRoadmap() {
  const [milestones] = useState<Milestone[]>([
    {
      id: "1",
      title: "Business Foundation",
      description: "Establish your business entity and basic structure",
      category: "foundation",
      status: "completed",
      progress: 100,
      estimatedDays: 7,
      tasks: [
        { id: "1-1", title: "Choose business name", completed: true },
        { id: "1-2", title: "Check name availability", completed: true },
        { id: "1-3", title: "Register business entity", completed: true },
        { id: "1-4", title: "Get EIN from IRS", completed: true },
      ],
    },
    {
      id: "2",
      title: "Legal Structure",
      description: "Set up legal documents and compliance framework",
      category: "legal",
      status: "in-progress",
      progress: 60,
      estimatedDays: 14,
      dependencies: ["1"],
      tasks: [
        { id: "2-1", title: "Draft operating agreement", completed: true },
        { id: "2-2", title: "Set up registered agent", completed: true },
        { id: "2-3", title: "Create corporate bylaws", completed: false },
        { id: "2-4", title: "Establish compliance calendar", completed: false },
        { id: "2-5", title: "Get business insurance", completed: false, optional: true },
      ],
    },
    {
      id: "3",
      title: "Financial Setup",
      description: "Establish banking, accounting, and financial systems",
      category: "financial",
      status: "pending",
      progress: 0,
      estimatedDays: 10,
      dependencies: ["1", "2"],
      tasks: [
        { id: "3-1", title: "Open business bank account", completed: false },
        { id: "3-2", title: "Set up accounting system", completed: false },
        { id: "3-3", title: "Choose tax elections", completed: false },
        { id: "3-4", title: "Set up payroll system", completed: false, optional: true },
      ],
    },
    {
      id: "4",
      title: "Operational Launch",
      description: "Get your business ready for operations",
      category: "operational",
      status: "pending",
      progress: 0,
      estimatedDays: 21,
      dependencies: ["2", "3"],
      tasks: [
        { id: "4-1", title: "Get business licenses", completed: false },
        { id: "4-2", title: "Set up workspace", completed: false },
        { id: "4-3", title: "Create business processes", completed: false },
        { id: "4-4", title: "Hire initial team", completed: false, optional: true },
      ],
    },
    {
      id: "5",
      title: "Growth & Scaling",
      description: "Prepare for business growth and expansion",
      category: "growth",
      status: "pending",
      progress: 0,
      estimatedDays: 30,
      dependencies: ["4"],
      tasks: [
        { id: "5-1", title: "Develop marketing strategy", completed: false },
        { id: "5-2", title: "Set up customer systems", completed: false },
        { id: "5-3", title: "Plan for funding", completed: false, optional: true },
        { id: "5-4", title: "Establish partnerships", completed: false, optional: true },
      ],
    },
  ])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "foundation":
        return <Building className="h-5 w-5" />
      case "legal":
        return <Shield className="h-5 w-5" />
      case "financial":
        return <DollarSign className="h-5 w-5" />
      case "operational":
        return <Target className="h-5 w-5" />
      case "growth":
        return <Rocket className="h-5 w-5" />
      default:
        return <Circle className="h-5 w-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "foundation":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300"
      case "legal":
        return "text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300"
      case "financial":
        return "text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300"
      case "operational":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300"
      case "growth":
        return "text-pink-600 bg-pink-100 dark:bg-pink-900/20 dark:text-pink-300"
      default:
        return "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case "in-progress":
        return <Clock className="h-6 w-6 text-amber-500" />
      case "blocked":
        return <Circle className="h-6 w-6 text-red-500" />
      default:
        return <Circle className="h-6 w-6 text-slate-400" />
    }
  }

  const overallProgress = milestones.reduce((sum, milestone) => sum + milestone.progress, 0) / milestones.length
  const completedMilestones = milestones.filter((m) => m.status === "completed").length
  const totalTasks = milestones.reduce((sum, milestone) => sum + milestone.tasks.length, 0)
  const completedTasks = milestones.reduce(
    (sum, milestone) => sum + milestone.tasks.filter((task) => task.completed).length,
    0,
  )

  return (
    <section className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Progress Roadmap</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Track your business launch progress with our guided roadmap
          </p>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-[hsl(174,73%,53%)]/10 to-[hsl(174,73%,53%)]/5">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-[hsl(174,73%,53%)] rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Overall Progress</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{Math.round(overallProgress)}%</p>
                </div>
              </div>
              <Progress value={overallProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-green-500 rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Milestones</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {completedMilestones} of {milestones.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-blue-500 rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Tasks Complete</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {completedTasks} of {totalTasks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-purple-500 rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Est. Days Left</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {milestones.filter((m) => m.status !== "completed").reduce((sum, m) => sum + m.estimatedDays, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="roadmap" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="current">Current Tasks</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="roadmap" className="space-y-6">
            {/* Roadmap Timeline */}
            <div className="space-y-6">
              {milestones.map((milestone, index) => (
                <Card key={milestone.id} className="relative">
                  {/* Timeline connector */}
                  {index < milestones.length - 1 && (
                    <div className="absolute left-8 top-16 w-0.5 h-16 bg-slate-200 dark:bg-slate-700 z-0"></div>
                  )}

                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">{getStatusIcon(milestone.status)}</div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{milestone.title}</h3>
                            <Badge className={getCategoryColor(milestone.category)}>
                              {getCategoryIcon(milestone.category)}
                              <span className="ml-1 capitalize">{milestone.category}</span>
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-500">{milestone.estimatedDays} days</span>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {milestone.progress}%
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 mb-4">{milestone.description}</p>

                        <Progress value={milestone.progress} className="mb-4" />

                        {/* Dependencies */}
                        {milestone.dependencies && milestone.dependencies.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-slate-500 mb-1">Dependencies:</p>
                            <div className="flex space-x-1">
                              {milestone.dependencies.map((depId) => {
                                const dep = milestones.find((m) => m.id === depId)
                                return dep ? (
                                  <Badge key={depId} variant="outline" className="text-xs">
                                    {dep.title}
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          </div>
                        )}

                        {/* Tasks */}
                        <div className="space-y-2">
                          {milestone.tasks.map((task) => (
                            <div key={task.id} className="flex items-center space-x-2">
                              {task.completed ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-slate-400" />
                              )}
                              <span
                                className={`text-sm ${
                                  task.completed ? "text-slate-500 line-through" : "text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {task.title}
                              </span>
                              {task.optional && (
                                <Badge variant="outline" className="text-xs">
                                  Optional
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>

                        {milestone.status === "in-progress" && (
                          <div className="mt-4 flex space-x-2">
                            <Button size="sm" className="bg-[hsl(174,73%,53%)] hover:bg-[hsl(174,73%,48%)]">
                              Continue
                            </Button>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        )}

                        {milestone.status === "pending" &&
                          milestone.dependencies?.every(
                            (depId) => milestones.find((m) => m.id === depId)?.status === "completed",
                          ) && (
                            <div className="mt-4">
                              <Button size="sm" className="bg-[hsl(174,73%,53%)] hover:bg-[hsl(174,73%,48%)]">
                                Start Milestone
                              </Button>
                            </div>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="current" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {milestones
                    .filter((m) => m.status === "in-progress")
                    .flatMap((milestone) =>
                      milestone.tasks
                        .filter((task) => !task.completed)
                        .map((task) => ({ ...task, milestone: milestone.title, category: milestone.category })),
                    )
                    .map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Circle className="h-4 w-4 text-slate-400" />
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-white">{task.title}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">From: {task.milestone}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getCategoryColor(task.category)}>{task.category}</Badge>
                          <Button variant="outline" size="sm">
                            Mark Complete
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Progress Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average completion time</span>
                      <span className="font-semibold">12 days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tasks completed this week</span>
                      <span className="font-semibold">4</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Projected completion</span>
                      <span className="font-semibold">March 15, 2024</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5" />
                    <span>Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        Focus on completing legal structure tasks to unblock financial setup
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-300">
                        Consider scheduling a consultation for tax election decisions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
