import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Settings,
  Plus,
  DollarSign,
  FileText,
  Users,
  Award,
  AlertCircle
} from "lucide-react";
import type { ComplianceTask } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

export function SimpleComplianceCenter() {
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const { toast } = useToast();

  // Fetch compliance tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/compliance/tasks"],
    retry: false,
  });

  // Fetch compliance profile
  const { data: complianceProfile } = useQuery({
    queryKey: ["/api/compliance"],
    retry: false,
  });

  const typedTasks = tasks as ComplianceTask[];

  // Calculate task statistics
  const taskStats = {
    total: typedTasks.length,
    completed: typedTasks.filter((t: ComplianceTask) => t.status === "completed").length,
    inProgress: typedTasks.filter((t: ComplianceTask) => t.status === "in_progress").length,
    pending: typedTasks.filter((t: ComplianceTask) => t.status === "pending").length,
    overdue: typedTasks.filter((t: ComplianceTask) => {
      if (t.status === "completed") return false;
      return t.dueDate && new Date(t.dueDate) < new Date();
    }).length,
  };

  // Create compliance profile mutation
  const createComplianceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/compliance", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/tasks"] });
      setOnboardingOpen(false);
      toast({
        title: "Compliance Profile Created",
        description: "Your compliance tasks have been automatically generated!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create compliance profile",
        variant: "destructive",
      });
    },
  });

  // Create new task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/compliance/tasks", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/tasks"] });
      setNewTaskOpen(false);
      toast({
        title: "Task Created",
        description: "New compliance task added successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/compliance/tasks/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/tasks"] });
      toast({
        title: "Task Updated",
        description: "Task status updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Cleanup duplicate tasks mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/compliance/cleanup", {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Duplicate tasks cleaned up successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/tasks"] });
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
        description: "Failed to cleanup duplicate tasks",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "overdue":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "pending":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Shield className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string, priority?: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Complete</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">In Progress</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Overdue</Badge>;
      case "pending":
        const priorityColor = priority === "high" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" : 
                             priority === "medium" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
                             "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300";
        return <Badge className={priorityColor}>Pending</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "tax":
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case "legal":
        return <FileText className="h-5 w-5 text-blue-600" />;
      case "employment":
        return <Users className="h-5 w-5 text-purple-600" />;
      case "licensing":
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <Shield className="h-5 w-5 text-slate-600" />;
    }
  };

  // Filter tasks by category
  const filteredTasks = selectedCategory === "all" 
    ? typedTasks 
    : typedTasks.filter((t: ComplianceTask) => t.category === selectedCategory);

  return (
    <section className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Smart Compliance Center
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Automated compliance tracking with state-specific deadlines
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setOnboardingOpen(true)}
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Setup</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => cleanupMutation.mutate()}
              disabled={cleanupMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span>{cleanupMutation.isPending ? 'Cleaning...' : 'Cleanup'}</span>
            </Button>
            <Button
              onClick={() => setNewTaskOpen(true)}
              className="nexTax-gradient text-white flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Task</span>
            </Button>
          </div>
        </div>

        {/* Compliance Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">In Progress</p>
                  <p className="text-2xl font-bold text-amber-600">{taskStats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{taskStats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{taskStats.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-[hsl(174,73%,53%)]" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Overall</p>
                  <p className="text-2xl font-bold text-[hsl(174,73%,53%)]">
                    {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <Label className="text-sm font-medium">Filter by Category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="tax">Tax Compliance</SelectItem>
                <SelectItem value="legal">Legal & Registration</SelectItem>
                <SelectItem value="employment">Employment</SelectItem>
                <SelectItem value="licensing">Licenses & Permits</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-6">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="max-w-md mx-auto">
                  <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    No Compliance Tasks Yet
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Get started by setting up your compliance profile to automatically generate 
                    state-specific tasks and deadlines, or add custom tasks manually.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={() => setOnboardingOpen(true)}
                      className="nexTax-gradient text-white"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Setup Compliance Profile
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setNewTaskOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Task
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task: ComplianceTask) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-slate-900 dark:text-white">
                            {task.taskName}
                          </h4>
                          {task.autoGenerated && (
                            <Badge variant="outline" className="text-xs">Auto</Badge>
                          )}
                          {task.stateSpecific && (
                            <Badge variant="outline" className="text-xs">State</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {task.description}
                        </p>
                        {task.dueDate && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(task.status, task.priority)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newStatus = task.status === "completed" ? "pending" : 
                                         task.status === "pending" ? "in_progress" : "completed";
                          updateTaskMutation.mutate({
                            id: task.id,
                            updates: { status: newStatus }
                          });
                        }}
                      >
                        {task.status === "completed" ? "Reopen" : 
                         task.status === "pending" ? "Start" : "Complete"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Compliance Disclaimer */}
        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed">
                <strong>Disclaimer:</strong> The compliance deadlines and tax filing tasks shown are based on a default December 31 year-end and general entity type assumptions. Actual filing obligations may vary based on your business's fiscal year, state-specific rules, or other circumstances. Always consult a{" "}
                <a 
                  href="https://www.nextax.ai/contact" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[hsl(174,73%,53%)] hover:text-[hsl(174,73%,43%)] underline"
                >
                  licensed tax or legal professional
                </a>{" "}
                for personalized guidance.
              </p>
            </div>
          </div>
        </div>

        {/* Onboarding Modal */}
        <OnboardingModal
          open={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          onSubmit={(data) => createComplianceMutation.mutate(data)}
          isLoading={createComplianceMutation.isPending}
        />

        {/* Add Task Modal */}
        <AddTaskModal
          open={newTaskOpen}
          onClose={() => setNewTaskOpen(false)}
          onSubmit={(data) => createTaskMutation.mutate(data)}
          isLoading={createTaskMutation.isPending}
        />
      </div>
    </section>
  );
}

// Simplified Onboarding Modal
function OnboardingModal({ 
  open, 
  onClose, 
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    stateOfFormation: "",
    fiscalYearEnd: "12",
    entityType: "",
    hasEmployees: false,
    hasRetailSales: false,
    industry: "",
  });

  const usStates = [
    { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
    { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
    { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
    { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" },
    { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
    { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
    { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
    { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" },
    { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
    { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
    { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
    { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" },
    { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
    { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
    { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
    { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
    { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }
  ];

  const handleSubmit = () => {
    if (!formData.stateOfFormation || !formData.entityType) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>Compliance Setup</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Set up your compliance profile to get personalized task recommendations.
          </p>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="state">State of Formation *</Label>
              <Select value={formData.stateOfFormation} onValueChange={(value) => 
                setFormData({ ...formData, stateOfFormation: value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent>
                  {usStates.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="entity">Entity Type *</Label>
              <Select value={formData.entityType} onValueChange={(value) => 
                setFormData({ ...formData, entityType: value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LLC">LLC or Partnership</SelectItem>
                  <SelectItem value="S-Corp">S-Corporation</SelectItem>
                  <SelectItem value="Corporation">C-Corporation</SelectItem>
                  <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Technology, Consulting, Retail"
              />
            </div>

            <div className="space-y-3">
              <Label>Business Activities</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="employees"
                  checked={formData.hasEmployees}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, hasEmployees: !!checked })
                  }
                />
                <Label htmlFor="employees" className="text-sm">Will have employees</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="retail"
                  checked={formData.hasRetailSales}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, hasRetailSales: !!checked })
                  }
                />
                <Label htmlFor="retail" className="text-sm">Will sell products/services</Label>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Skip for Now
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !formData.stateOfFormation || !formData.entityType}
              className="flex-1 nexTax-gradient text-white"
            >
              {isLoading ? "Setting Up..." : "Create Profile"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simplified Add Task Modal
function AddTaskModal({ 
  open, 
  onClose, 
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    taskName: "",
    description: "",
    category: "legal",
    priority: "medium",
    dueDate: "",
  });

  const handleSubmit = () => {
    if (!formData.taskName) return;
    onSubmit({
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
    });
    setFormData({
      taskName: "",
      description: "",
      category: "legal",
      priority: "medium",
      dueDate: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="taskName">Task Name *</Label>
            <Input
              id="taskName"
              value={formData.taskName}
              onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
              placeholder="e.g., Obtain Business License"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the task"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => 
              setFormData({ ...formData, category: value })
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="legal">Legal & Registration</SelectItem>
                <SelectItem value="tax">Tax Compliance</SelectItem>
                <SelectItem value="employment">Employment</SelectItem>
                <SelectItem value="licensing">Licenses & Permits</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !formData.taskName}
              className="flex-1 nexTax-gradient text-white"
            >
              {isLoading ? "Adding..." : "Add Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}