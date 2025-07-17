import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Clock, Circle, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ProgressTask {
  id: number;
  category: string;
  taskName: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  orderIndex: number;
  completedAt: string | null;
  createdAt: string;
}

const categoryConfig = {
  foundation: {
    name: "Foundation Phase",
    color: "emerald",
    icon: "1"
  },
  legal: {
    name: "Legal Formation",
    color: "amber",
    icon: "2"
  },
  financial: {
    name: "Financial Setup",
    color: "blue",
    icon: "3"
  },
  operational: {
    name: "Operational Setup",
    color: "purple",
    icon: "4"
  },
  compliance: {
    name: "Compliance & Licensing",
    color: "red",
    icon: "5"
  }
};

export function ProgressRoadmap() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch progress tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/progress"],
    retry: false,
  });

  // Update task status
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/progress/${taskId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({
        title: "Progress Updated",
        description: "Task status updated successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  // Group tasks by category
  const groupedTasks = tasks.reduce((acc: Record<string, ProgressTask[]>, task: ProgressTask) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {});

  // Calculate overall progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task: ProgressTask) => task.status === "completed").length;
  const inProgressTasks = tasks.filter((task: ProgressTask) => task.status === "in_progress").length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleTaskStatusChange = (taskId: number, newStatus: string) => {
    updateTaskMutation.mutate({ taskId, status: newStatus });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="text-emerald-500" size={20} />;
      case "in_progress":
        return <Clock className="text-amber-500" size={20} />;
      default:
        return <Circle className="text-slate-400" size={20} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">Complete</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Upcoming</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Business Launch Roadmap</h2>
          <p className="text-slate-600 dark:text-slate-300">Track your progress through each phase of starting your business</p>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200 dark:text-slate-600"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                    />
                    <path
                      className="text-emerald-500"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${overallProgress}, 100`}
                      d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{overallProgress}%</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Overall Progress</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{completedTasks} of {totalTasks} steps complete</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                  <CheckCircle className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Completed</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{completedTasks} tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <Clock className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">In Progress</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{inProgressTasks} tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roadmap Steps */}
        <div className="space-y-4">
          {Object.entries(categoryConfig).map(([category, config]) => {
            const categoryTasks = groupedTasks[category] || [];
            const completedCount = categoryTasks.filter(task => task.status === "completed").length;
            const totalCount = categoryTasks.length;
            const categoryStatus = totalCount === 0 ? "empty" : 
                                 completedCount === totalCount ? "completed" :
                                 categoryTasks.some(task => task.status === "in_progress") ? "in_progress" : "pending";

            return (
              <Card key={category} className="overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        categoryStatus === "completed" ? "nexTax-gradient" : 
                        categoryStatus === "in_progress" ? "bg-amber-500" : "bg-slate-400"
                      }`}>
                        <span className="text-white font-bold text-sm">{config.icon}</span>
                      </div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                    </div>
                    {getStatusBadge(categoryStatus)}
                  </div>
                  {totalCount > 0 && (
                    <Progress value={(completedCount / totalCount) * 100} className="mt-2" />
                  )}
                </CardHeader>
                <CardContent className="p-6">
                  {totalCount === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-4">
                      No tasks available for this category yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {categoryTasks
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((task) => (
                          <div key={task.id} className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {getStatusIcon(task.status)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 dark:text-white">{task.taskName}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
                              {task.completedAt && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  Completed {new Date(task.completedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {task.status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleTaskStatusChange(task.id, "in_progress")}
                                  className="nexTax-gradient text-white"
                                >
                                  Start
                                </Button>
                              )}
                              {task.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTaskStatusChange(task.id, "completed")}
                                >
                                  Complete
                                </Button>
                              )}
                              <Button variant="ghost" size="sm">
                                <ChevronRight size={16} />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
