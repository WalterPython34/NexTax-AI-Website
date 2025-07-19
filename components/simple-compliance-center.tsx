"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertTriangle, Clock } from "lucide-react"

interface ComplianceTask {
  id: string
  title: string
  description: string
  dueDate: Date
  status: "completed" | "pending" | "overdue"
  priority: "high" | "medium" | "low"
}

export function SimpleComplianceCenter() {
  const [tasks] = useState<ComplianceTask[]>([
    {
      id: "1",
      title: "Annual State Filing",
      description: "Submit annual report to state",
      dueDate: new Date("2024-03-15"),
      status: "pending",
      priority: "high",
    },
    {
      id: "2",
      title: "Tax Return Filing",
      description: "File federal tax return",
      dueDate: new Date("2024-04-15"),
      status: "pending",
      priority: "high",
    },
    {
      id: "3",
      title: "Business License Renewal",
      description: "Renew business license",
      dueDate: new Date("2024-02-28"),
      status: "overdue",
      priority: "medium",
    },
  ])

  const completedTasks = tasks.filter((task) => task.status === "completed").length
  const totalTasks = tasks.length
  const completionRate = (completedTasks / totalTasks) * 100

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-amber-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-amber-100 text-amber-800"
    }
  }

  return (
    <section className="flex-1 p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Compliance Center</h2>
          <p className="text-slate-600 dark:text-slate-300">Track your business compliance requirements</p>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-green-500 rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Completion Rate</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{Math.round(completionRate)}%</p>
                </div>
              </div>
              <Progress value={completionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-amber-500 rounded"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pending Tasks</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {tasks.filter((t) => t.status === "pending").length}
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
                  <p className="text-sm text-slate-600 dark:text-slate-400">Overdue</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {tasks.filter((t) => t.status === "overdue").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">{task.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                        <span className="text-xs text-slate-500">Due: {task.dueDate.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
