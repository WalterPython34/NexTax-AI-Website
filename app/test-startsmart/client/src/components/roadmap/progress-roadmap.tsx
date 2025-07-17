import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, Circle, Info, MessageSquare, Plus, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ProgressTask } from "@shared/schema";

export function ProgressRoadmap() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper function to check if a task is overdue
  const isTaskOverdue = (task: ProgressTask): boolean => {
    if (!task.dueDate || task.status === "completed") return false;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };
  
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileAnswers, setProfileAnswers] = useState({
    businessName: "",
    nameAvailable: "",
    businessType: "",
    registeredAgent: "",
    documents: "",
    ein: ""
  });
  
  const { data: tasks = [], isLoading } = useQuery<ProgressTask[]>({
    queryKey: ["/api/progress"],
    retry: false,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: { title: string; description: string; category: string; source: string; dueDate?: string }) => {
      await apiRequest("POST", "/api/progress/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({
        title: "Task created successfully!",
        description: "Your custom task has been added to the roadmap.",
      });
      setIsCreateTaskOpen(false);
      resetCreateForm();
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
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const resetCreateForm = () => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskCategory("");
    setNewTaskDueDate("");
  };

  const resetProfileForm = () => {
    setProfileAnswers({
      businessName: "",
      nameAvailable: "",
      businessType: "",
      registeredAgent: "",
      documents: "",
      ein: ""
    });
  };

  const handleProfileSubmit = () => {
    if (!profileAnswers.businessName || !profileAnswers.businessType) {
      toast({
        title: "Required fields missing",
        description: "Please answer all required questions",
        variant: "destructive",
      });
      return;
    }

    createProfileMutation.mutate(profileAnswers);
  };

  const handleCreateCustomTask = () => {
    if (!newTaskTitle || !newTaskCategory) {
      toast({
        title: "Missing information",
        description: "Please provide a title and select a category.",
        variant: "destructive",
      });
      return;
    }

    createTaskMutation.mutate({
      title: newTaskTitle,
      description: newTaskDescription,
      category: newTaskCategory,
      source: "Custom",
      dueDate: newTaskDueDate || undefined
    });
  };

  // Business profile creation mutation
  const createProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      await apiRequest("POST", "/api/business-profile", profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({
        title: "Business Profile Created!",
        description: "Your personalized roadmap has been generated based on your responses.",
      });
      setIsProfileModalOpen(false);
      resetProfileForm();
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
        description: "Failed to create business profile",
        variant: "destructive",
      });
    },
  });

  // Task status update mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      await apiRequest("PATCH", `/api/progress/${taskId}`, { status });
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

  const handleTaskStatusClick = (task: ProgressTask) => {
    // Cycle through status: pending -> in_progress -> completed -> pending
    let newStatus: string;
    switch (task.status) {
      case "pending":
        newStatus = "in_progress";
        break;
      case "in_progress":
        newStatus = "completed";
        break;
      case "completed":
        newStatus = "pending";
        break;
      default:
        newStatus = "in_progress";
    }
    
    updateTaskMutation.mutate({ taskId: task.id, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const completedTasks = (tasks as ProgressTask[]).filter((task: ProgressTask) => task.status === "completed");
  const inProgressTasks = (tasks as ProgressTask[]).filter((task: ProgressTask) => task.status === "in_progress");
  const overallProgress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const tasksByCategory = (tasks as ProgressTask[]).reduce((acc: any, task: ProgressTask) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {});

  const getStatusIcon = (task: ProgressTask) => {
    const baseClasses = "h-6 w-6 cursor-pointer hover:scale-110 transition-transform";
    const onClick = () => handleTaskStatusClick(task);
    const isOverdue = isTaskOverdue(task);
    
    // Override with overdue styling if task is overdue
    if (isOverdue && task.status !== "completed") {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle 
              className={`${baseClasses} text-red-500 hover:text-red-600`} 
              onClick={onClick}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Overdue - Click to mark as in progress</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    
    switch (task.status) {
      case "completed":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CheckCircle 
                className={`${baseClasses} text-green-500 hover:text-green-600`} 
                onClick={onClick}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to mark as pending</p>
            </TooltipContent>
          </Tooltip>
        );
      case "in_progress":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Clock 
                className={`${baseClasses} text-amber-500 hover:text-amber-600`} 
                onClick={onClick}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to mark as completed</p>
            </TooltipContent>
          </Tooltip>
        );
      default:
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Circle 
                className={`${baseClasses} text-slate-400 hover:text-blue-500`} 
                onClick={onClick}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to start working on this task</p>
            </TooltipContent>
          </Tooltip>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Complete</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">In Progress</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const categoryDescriptions = {
    "Foundation": "Core business setup including entity formation, naming, and initial registrations",
    "Legal": "Legal documentation, compliance requirements, and intellectual property protection",
    "Financial": "Banking, accounting, tax setup, and financial planning essentials",
    "Operational": "Day-to-day business operations, systems, and workflow establishment",
    "Compliance": "Ongoing regulatory requirements, reporting, and legal obligations"
  };

  return (
    <TooltipProvider>
      <section className="flex-1 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Business Launch Roadmap</h2>
              <p className="text-slate-600 dark:text-slate-300">Track your progress through each phase of starting your business</p>
            </div>
            <Button onClick={() => setIsCreateTaskOpen(true)} className="nexTax-gradient text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Task
            </Button>
          </div>
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
                      className="text-[hsl(174,73%,53%)]"
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
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {completedTasks.length} of {tasks.length} steps complete
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Completed</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{completedTasks.length} tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">In Progress</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{inProgressTasks.length} tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roadmap Steps */}
        <div className="space-y-6">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Circle className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No Progress Tasks Yet
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Create a business profile to get started with your personalized roadmap.
                </p>
                <Button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="nexTax-gradient text-white"
                >
                  Create Business Profile
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.entries(tasksByCategory).map(([category, categoryTasks]: [string, any]) => {
              const completedInCategory = categoryTasks.filter((t: ProgressTask) => t.status === "completed").length;
              const totalInCategory = categoryTasks.length;
              const categoryProgress = Math.round((completedInCategory / totalInCategory) * 100);
              
              return (
                <Card key={category} className="overflow-hidden">
                  <CardHeader className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 nexTax-gradient rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {Object.keys(tasksByCategory).indexOf(category) + 1}
                          </span>
                        </div>
                        <CardTitle className="text-lg capitalize">{category.replace('_', ' ')} Phase</CardTitle>
                      </div>
                      {getStatusBadge(
                        completedInCategory === totalInCategory ? "completed" : 
                        completedInCategory > 0 ? "in_progress" : "pending"
                      )}
                    </div>
                    <Progress value={categoryProgress} className="mt-2" />
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {categoryTasks.map((task: ProgressTask) => {
                        const isOverdue = isTaskOverdue(task);
                        return (
                          <div 
                            key={task.id} 
                            className={`flex items-center space-x-4 p-3 rounded-lg ${
                              isOverdue ? 'border-2 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20' : ''
                            }`}
                          >
                            {getStatusIcon(task)}
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 dark:text-white">{task.taskName}</h4>
                              {task.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {task.completedAt ? (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Completed {new Date(task.completedAt).toLocaleDateString()}
                                </span>
                              ) : task.dueDate ? (
                                <span className={`text-xs ${
                                  isOverdue 
                                    ? 'text-red-600 dark:text-red-400 font-semibold' 
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}>
                                  {isOverdue ? 'OVERDUE - ' : 'Due '}{new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        </div>
        
        {/* Create Custom Task Dialog */}
        <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Custom Task</DialogTitle>
              <DialogDescription>
                Add a custom task to your business roadmap for better progress tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-task-title">Task Title</Label>
                <Input
                  id="new-task-title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-task-description">Description</Label>
                <Textarea
                  id="new-task-description"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Enter task description..."
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-task-category">Category</Label>
                <Select value={newTaskCategory} onValueChange={setNewTaskCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal">📋 Legal</SelectItem>
                    <SelectItem value="financial">💰 Financial</SelectItem>
                    <SelectItem value="compliance">⚖️ Compliance</SelectItem>
                    <SelectItem value="marketing">📈 Marketing</SelectItem>
                    <SelectItem value="operational">⚙️ Operational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-task-due-date">Due Date (Optional)</Label>
                <Input
                  id="new-task-due-date"
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCustomTask}
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Business Profile Creation Modal */}
        <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Business Profile</DialogTitle>
              <DialogDescription>
                Answer these questions to generate your personalized startup roadmap with tasks based on your specific needs.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Question 1: Business Name */}
              <div className="space-y-3">
                <Label className="text-base font-medium">1. Have you decided on a business name yet?</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="name-yes"
                      name="businessName"
                      value="yes"
                      checked={profileAnswers.businessName === "yes"}
                      onChange={(e) => setProfileAnswers({...profileAnswers, businessName: e.target.value})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="name-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="name-no"
                      name="businessName"
                      value="no"
                      checked={profileAnswers.businessName === "no"}
                      onChange={(e) => setProfileAnswers({...profileAnswers, businessName: e.target.value})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="name-no">No</Label>
                  </div>
                </div>
              </div>

              {/* Question 2: Name Availability */}
              <div className="space-y-3">
                <Label className="text-base font-medium">2. Did you check if the business name was available in your State?</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="available-yes"
                      name="nameAvailable"
                      value="yes"
                      checked={profileAnswers.nameAvailable === "yes"}
                      onChange={(e) => setProfileAnswers({...profileAnswers, nameAvailable: e.target.value})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="available-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="available-no"
                      name="nameAvailable"
                      value="no"
                      checked={profileAnswers.nameAvailable === "no"}
                      onChange={(e) => setProfileAnswers({...profileAnswers, nameAvailable: e.target.value})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="available-no">No</Label>
                  </div>
                </div>
              </div>

              {/* Question 3: Business Type */}
              <div className="space-y-3">
                <Label className="text-base font-medium">3. Which type of business will you be operating as?</Label>
                <Select value={profileAnswers.businessType} onValueChange={(value) => setProfileAnswers({...profileAnswers, businessType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llc">LLC</SelectItem>
                    <SelectItem value="s-corp">S-Corp</SelectItem>
                    <SelectItem value="corporation">Corporation</SelectItem>
                    <SelectItem value="sole-proprietor">Sole Proprietor</SelectItem>
                    <SelectItem value="undecided">Undecided</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Question 4: Registered Agent */}
              <div className="space-y-3">
                <Label className="text-base font-medium">4. Has a Registered Agent been appointed for your Company?</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="agent-yes"
                      name="registeredAgent"
                      value="yes"
                      checked={profileAnswers.registeredAgent === "yes"}
                      onChange={(e) => setProfileAnswers({...profileAnswers, registeredAgent: e.target.value})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="agent-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="agent-no"
                      name="registeredAgent"
                      value="no"
                      checked={profileAnswers.registeredAgent === "no"}
                      onChange={(e) => setProfileAnswers({...profileAnswers, registeredAgent: e.target.value})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="agent-no">No</Label>
                  </div>
                </div>
              </div>

              {/* Question 5: Legal Documents */}
              <div className="space-y-3">
                <Label className="text-base font-medium">5. Have you had the Operating Agreement (for LLC's), or the Corporate Articles of Incorporation (Corporations) prepared and signed?</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="docs-yes"
                      name="documents"
                      value="yes"
                      checked={profileAnswers.documents === "yes"}
                      onChange={(e) => setProfileAnswers({...profileAnswers, documents: e.target.value})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="docs-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="docs-no"
                      name="documents"
                      value="no"
                      checked={profileAnswers.documents === "no"}
                      onChange={(e) => setProfileAnswers({...profileAnswers, documents: e.target.value})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="docs-no">No</Label>
                  </div>
                </div>
              </div>

              {/* Question 6: EIN */}
              <div className="space-y-3">
                <Label className="text-base font-medium">6. Does your New Business have an Employer Identification Number (EIN) assigned to it already?</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="ein-yes"
                      name="ein"
                      value="yes"
                      checked={profileAnswers.ein === "yes"}
                      onChange={(e) => setProfileAnswers({...profileAnswers, ein: e.target.value})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="ein-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="ein-no"
                      name="ein"
                      value="no"
                      checked={profileAnswers.ein === "no"}
                      onChange={(e) => setProfileAnswers({...profileAnswers, ein: e.target.value})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="ein-no">No</Label>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsProfileModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleProfileSubmit}
                disabled={createProfileMutation.isPending}
                className="nexTax-gradient text-white"
              >
                {createProfileMutation.isPending ? "Creating Profile..." : "Create Profile & Generate Tasks"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </TooltipProvider>
  );
}
