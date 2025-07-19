"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, AlertTriangle, CheckCircle, Clock, FileText, DollarSign, Building, Shield } from "lucide-react"

interface ComplianceTask {
  id: string
  title: string
  description: string
  dueDate: Date
  priority: "high" | "medium" | "low"
  status: "completed" | "pending" | "overdue"
  category: "tax" | "filing" | "license" | "other"
  estimatedTime: string
}

interface ComplianceDeadline {
  id: string
  title: string
  date: Date
  type: "tax" | "filing" | "renewal"
  description: string
  completed: boolean
}

export function ComplianceCenter() {
  const [tasks] = useState<ComplianceTask[]>([
    {
      id: "1",
      title: "File Annual Report",
      description: "Submit your annual report to the state",
      dueDate: new Date("2024-03-15"),
      priority: "high",
      status: "pending",
      category: "filing",
      estimatedTime: "30 minutes",
    },
    {
      id: "2",
      title: "Renew Business License",
      description: "Renew your business operating license",
      dueDate: new Date("2024-02-28"),
      priority: "high",
      status: "overdue",
      category: "license",
      estimatedTime: "1 hour",
    },
    {
      id: "3",
      title: "Quarterly Tax Filing",
      description: "File quarterly estimated taxes",
      dueDate: new Date("2024-04-15"),
      priority: "medium",
      status: "pending",
      category: "tax",
      estimatedTime: "2 hours",
    },
    {
      id: "4",
      title: "Update Registered Agent",
      description: "Confirm registered agent information",
      dueDate: new Date("2024-01-30"),
      priority: "low",
      status: "completed",
      category: "filing",
      estimatedTime: "15 minutes",
    },
  ])

  const [deadlines] = useState<ComplianceDeadline[]>([
    {
      id: "1",
      title: "Annual Report Due",
      date: new Date("2024-03-15"),
      type: "filing",
      description: "State annual report filing deadline",
      completed: false,
    },
    {
      id: "2",
      title: "Q1 Tax Payment",
      date: new Date("2024-04-15"),
      type: "tax",
      description: "First quarter estimated tax payment",
      completed: false,
    },
    {
      id: "3",
      title: "Business License Renewal",
      date: new Date("2024-02-28"),
      type: "renewal",
      description: "Business operating license renewal",
      completed: false,
    },
  ])

  const getPriorityColor = (priority: ComplianceTask["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: ComplianceTask["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getCategoryIcon = (category: ComplianceTask["category"]) => {
    switch (category) {
      case "tax":
        return <DollarSign className="h-4 w-4" />
      case "filing":
        return <FileText className="h-4 w-4" />
      case "license":
        return <Shield className="h-4 w-4" />
      default:
        return <Building className="h-4 w-4" />
    }
  }

  const completedTasks = tasks.filter((task) => task.status === "completed").length
  const totalTasks = tasks.length
  const completionPercentage = (completedTasks / totalTasks) * 100

  const overdueTasks = tasks.filter((task) => task.status === "overdue")
  const upcomingTasks = tasks.filter((task) => task.status === "pending")

  return (
    <section className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Compliance Center</h2>
          <p className="text-slate-600 dark:text-slate-300">Stay on top of your business compliance requirements</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-[hsl(174,73%,53%)] rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Completion Rate</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {Math.round(completionPercentage)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-red-500 rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Overdue Tasks</p>
                  <p className="text-xl font-bold text-red-600">{overdueTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-yellow-500 rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pending Tasks</p>
                  <p className="text-xl font-bold text-yellow-600">{upcomingTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-green-500 rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Completed</p>
                  <p className="text-xl font-bold text-green-600">{completedTasks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-[hsl(174,73%,53%)]" />
              <span>Compliance Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Compliance</span>
                <span>
                  {completedTasks} of {totalTasks} tasks completed
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            {/* Overdue Tasks */}
            {overdueTasks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Overdue Tasks
                </h3>
                <div className="grid gap-4">
                  {overdueTasks.map((task) => (
                    <Card key={task.id} className="border-red-200 bg-red-50 dark:bg-red-900/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {getCategoryIcon(task.category)}
                              <h4 className="font-semibold text-slate-900 dark:text-white">{task.title}</h4>
                              <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{task.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-slate-500">
                              <span>Due: {task.dueDate.toLocaleDateString()}</span>
                              <span>Est. time: {task.estimatedTime}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(task.status)}
                            <Button size="sm" className="bg-[hsl(174,73%,53%)] hover:bg-[hsl(174,73%,48%)]">
                              Complete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Tasks */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Upcoming Tasks</h3>
              <div className="grid gap-4">
                {upcomingTasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getCategoryIcon(task.category)}
                            <h4 className="font-semibold text-slate-900 dark:text-white">{task.title}</h4>
                            <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{task.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-slate-500">
                            <span>Due: {task.dueDate.toLocaleDateString()}</span>
                            <span>Est. time: {task.estimatedTime}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(task.status)}
                          <Button variant="outline" size="sm">
                            Start
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="deadlines" className="space-y-4">
            <div className="grid gap-4">
              {deadlines.map((deadline) => (
                <Card key={deadline.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-[hsl(174,73%,53%)]" />
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">{deadline.title}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{deadline.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {deadline.date.toLocaleDateString()}
                        </p>
                        <Badge variant={deadline.completed ? "default" : "secondary"}>{deadline.type}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Calendar View</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Calendar integration coming soon. View all your compliance deadlines in one place.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
