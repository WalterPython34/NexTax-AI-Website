"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  CalendarIcon,
  FileText,
  DollarSign,
  Building,
  Bell,
  TrendingUp,
  MapPin,
} from "lucide-react"

interface ComplianceTask {
  id: string
  title: string
  description: string
  dueDate: Date
  status: "completed" | "pending" | "overdue"
  priority: "high" | "medium" | "low"
  category: string
  state?: string
  estimatedCost?: number
  frequency: "annual" | "quarterly" | "monthly" | "one-time"
}

interface StateRequirement {
  state: string
  requirements: {
    annualFiling: boolean
    franchiseTax: boolean
    registeredAgent: boolean
    businessLicense: boolean
    specialRequirements: string[]
  }
  costs: {
    annualFiling: number
    franchiseTax: number
    registeredAgent: number
  }
}

export function EnhancedComplianceCenter() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedState, setSelectedState] = useState("CA")

  const [tasks] = useState<ComplianceTask[]>([
    {
      id: "1",
      title: "California Annual LLC Filing",
      description: "Submit Statement of Information to California Secretary of State",
      dueDate: new Date("2024-03-15"),
      status: "pending",
      priority: "high",
      category: "State Filing",
      state: "CA",
      estimatedCost: 20,
      frequency: "annual",
    },
    {
      id: "2",
      title: "Federal Tax Return (Form 1120S)",
      description: "File S-Corporation tax return with IRS",
      dueDate: new Date("2024-03-15"),
      status: "pending",
      priority: "high",
      category: "Tax Filing",
      estimatedCost: 0,
      frequency: "annual",
    },
    {
      id: "3",
      title: "Quarterly Estimated Taxes",
      description: "Submit Q1 estimated tax payments",
      dueDate: new Date("2024-04-15"),
      status: "pending",
      priority: "medium",
      category: "Tax Payment",
      estimatedCost: 2500,
      frequency: "quarterly",
    },
    {
      id: "4",
      title: "Business License Renewal",
      description: "Renew city business license",
      dueDate: new Date("2024-02-28"),
      status: "overdue",
      priority: "high",
      category: "License",
      estimatedCost: 150,
      frequency: "annual",
    },
    {
      id: "5",
      title: "Workers' Compensation Insurance",
      description: "Review and renew workers' comp policy",
      dueDate: new Date("2024-05-01"),
      status: "pending",
      priority: "medium",
      category: "Insurance",
      estimatedCost: 1200,
      frequency: "annual",
    },
  ])

  const [stateRequirements] = useState<StateRequirement[]>([
    {
      state: "CA",
      requirements: {
        annualFiling: true,
        franchiseTax: true,
        registeredAgent: true,
        businessLicense: true,
        specialRequirements: ["Workers' Compensation", "Disability Insurance", "CCPA Compliance"],
      },
      costs: {
        annualFiling: 20,
        franchiseTax: 800,
        registeredAgent: 199,
      },
    },
    {
      state: "DE",
      requirements: {
        annualFiling: true,
        franchiseTax: true,
        registeredAgent: true,
        businessLicense: false,
        specialRequirements: ["Annual Franchise Tax Report"],
      },
      costs: {
        annualFiling: 300,
        franchiseTax: 400,
        registeredAgent: 199,
      },
    },
    {
      state: "TX",
      requirements: {
        annualFiling: false,
        franchiseTax: true,
        registeredAgent: true,
        businessLicense: true,
        specialRequirements: ["No State Income Tax", "Margin Tax"],
      },
      costs: {
        annualFiling: 0,
        franchiseTax: 0,
        registeredAgent: 199,
      },
    },
  ])

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
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      default:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "medium":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
    }
  }

  const completedTasks = tasks.filter((task) => task.status === "completed").length
  const totalTasks = tasks.length
  const completionRate = (completedTasks / totalTasks) * 100

  const overdueTasks = tasks.filter((task) => task.status === "overdue")
  const upcomingTasks = tasks.filter((task) => {
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    return task.status === "pending" && task.dueDate <= thirtyDaysFromNow
  })

  const totalEstimatedCosts = tasks
    .filter((task) => task.status === "pending")
    .reduce((sum, task) => sum + (task.estimatedCost || 0), 0)

  const currentStateReqs = stateRequirements.find((req) => req.state === selectedState)

  return (
    <section className="flex-1 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Compliance Center</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Stay compliant with automated tracking and state-specific requirements
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CA">California</SelectItem>
                <SelectItem value="DE">Delaware</SelectItem>
                <SelectItem value="TX">Texas</SelectItem>
                <SelectItem value="NY">New York</SelectItem>
                <SelectItem value="FL">Florida</SelectItem>
              </SelectContent>
            </Select>

            <Button className="bg-[hsl(174,73%,53%)] hover:bg-[hsl(174,73%,48%)]">
              <Bell className="h-4 w-4 mr-2" />
              Set Reminders
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Compliance Rate</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{Math.round(completionRate)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <Progress value={completionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 dark:text-red-300">Overdue Tasks</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">{overdueTasks.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Due Soon</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{upcomingTasks.length}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Est. Costs</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    ${totalEstimatedCosts.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="state-requirements">State Requirements</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            {/* Priority Tasks */}
            {overdueTasks.length > 0 && (
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Overdue Tasks - Immediate Action Required</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overdueTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(task.status)}
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-white">{task.title}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                              <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                              <span className="text-xs text-slate-500">Due: {task.dueDate.toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="destructive" size="sm">
                          Complete Now
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>All Compliance Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {getStatusIcon(task.status)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-slate-900 dark:text-white">{task.title}</h4>
                            {task.state && (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {task.state}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{task.description}</p>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                            <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                            <Badge variant="outline">{task.category}</Badge>
                            <span className="text-xs text-slate-500">Due: {task.dueDate.toLocaleDateString()}</span>
                            {task.estimatedCost && task.estimatedCost > 0 && (
                              <span className="text-xs text-slate-500">Cost: ${task.estimatedCost}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
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

          <TabsContent value="calendar" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarIcon className="h-5 w-5" />
                    <span>Compliance Calendar</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Deadlines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white">{task.title}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Due: {task.dueDate.toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="state-requirements" className="space-y-4">
            {currentStateReqs && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5" />
                    <span>{currentStateReqs.state} State Requirements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Required Filings</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Annual Filing</span>
                          {currentStateReqs.requirements.annualFiling ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-slate-500">Not Required</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Franchise Tax</span>
                          {currentStateReqs.requirements.franchiseTax ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-slate-500">Not Required</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Registered Agent</span>
                          {currentStateReqs.requirements.registeredAgent ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-slate-500">Not Required</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Business License</span>
                          {currentStateReqs.requirements.businessLicense ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-slate-500">Not Required</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Estimated Annual Costs</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Annual Filing</span>
                          <span className="text-sm font-medium">${currentStateReqs.costs.annualFiling}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Franchise Tax</span>
                          <span className="text-sm font-medium">${currentStateReqs.costs.franchiseTax}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Registered Agent</span>
                          <span className="text-sm font-medium">${currentStateReqs.costs.registeredAgent}</span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-sm">Total Estimated</span>
                            <span className="text-sm">
                              $
                              {currentStateReqs.costs.annualFiling +
                                currentStateReqs.costs.franchiseTax +
                                currentStateReqs.costs.registeredAgent}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {currentStateReqs.requirements.specialRequirements.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Special Requirements</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentStateReqs.requirements.specialRequirements.map((req, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Tasks</span>
                      <span className="font-semibold">{totalTasks}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Completed</span>
                      <span className="font-semibold text-green-600">{completedTasks}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pending</span>
                      <span className="font-semibold text-amber-600">
                        {tasks.filter((t) => t.status === "pending").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overdue</span>
                      <span className="font-semibold text-red-600">{overdueTasks.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["State Filing", "Tax Filing", "License", "Insurance"].map((category) => {
                      const categoryTasks = tasks.filter((task) => task.category === category)
                      const categoryCost = categoryTasks.reduce((sum, task) => sum + (task.estimatedCost || 0), 0)

                      return (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm">{category}</span>
                          <span className="font-semibold">${categoryCost.toLocaleString()}</span>
                        </div>
                      )
                    })}
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
