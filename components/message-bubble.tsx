"use client"

import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { Message } from "@shared/schema"
import { Copy, ThumbsUp, ThumbsDown, BookmarkPlus } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { isUnauthorizedError } from "@/lib/authUtils"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskCategory, setTaskCategory] = useState("")

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: { title: string; description: string; category: string; source: string }) => {
      await apiRequest("POST", "/api/progress/tasks", taskData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] })
      toast({
        title: "Task saved to roadmap!",
        description: "You can now track this task in your Business Roadmap.",
      })
      setIsDialogOpen(false)
      resetForm()
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        })
        setTimeout(() => {
          window.location.href = "/api/login"
        }, 500)
        return
      }
      toast({
        title: "Error",
        description: "Failed to save task to roadmap",
        variant: "destructive",
      })
    },
  })

  const resetForm = () => {
    setTaskTitle("")
    setTaskDescription("")
    setTaskCategory("")
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    toast({
      title: "Copied to clipboard",
      description: "Message content has been copied.",
    })
  }

  const handleSaveToRoadmap = () => {
    // Extract potential task from AI message content
    const suggestedTask = extractActionableTask(message.content)
    setTaskTitle(suggestedTask.title)
    setTaskDescription(suggestedTask.description)
    setIsDialogOpen(true)
  }

  const handleCreateTask = () => {
    if (!taskTitle || !taskCategory) {
      toast({
        title: "Missing information",
        description: "Please provide a title and select a category.",
        variant: "destructive",
      })
      return
    }

    createTaskMutation.mutate({
      title: taskTitle,
      description: taskDescription,
      category: taskCategory,
      source: "AI Chat",
    })
  }

  const handleFeedback = (type: "helpful" | "not_helpful") => {
    toast({
      title: "Feedback received",
      description: `Thank you for rating this response as ${type === "helpful" ? "helpful" : "not helpful"}.`,
    })
    // TODO: Implement API call to save feedback
  }

  // Function to extract actionable task from AI response
  const extractActionableTask = (content: string) => {
    // Look for specific actionable phrases
    const actionPatterns = [
      /file (.+?) with/i,
      /register (.+?) in/i,
      /apply for (.+)/i,
      /obtain (.+?) from/i,
      /complete (.+?) form/i,
      /submit (.+?) to/i,
      /create (.+?) for/i,
      /set up (.+)/i,
      /choose (.+?) for/i,
      /contact (.+?) to/i,
    ]

    for (const pattern of actionPatterns) {
      const match = content.match(pattern)
      if (match) {
        return {
          title: match[0].charAt(0).toUpperCase() + match[0].slice(1),
          description: content.split(".")[0] + ".",
        }
      }
    }

    // Fallback: use first sentence as task
    const firstSentence = content.split(".")[0] + "."
    return {
      title: firstSentence.length > 60 ? firstSentence.substring(0, 60) + "..." : firstSentence,
      description: firstSentence,
    }
  }

  if (isUser) {
    return (
      <div className="chat-bubble flex items-start space-x-3 flex-row-reverse">
        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
          <i className="fas fa-user text-slate-600 dark:text-slate-300 text-sm"></i>
        </div>
        <div className="nexTax-gradient rounded-2xl rounded-tr-md p-4 max-w-2xl">
          <p className="text-white whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-bubble flex items-start space-x-3">
      <Logo size="md" />
      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-md p-4 shadow-sm border border-slate-200 dark:border-slate-700 max-w-2xl">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="text-slate-900 dark:text-white whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Message Actions */}
        <div className="mt-3 flex items-center space-x-2 flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSaveToRoadmap} className="h-7 px-2">
            <BookmarkPlus className="h-3 w-3 mr-1" />
            Save to Roadmap
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleFeedback("helpful")} className="h-7 px-2">
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleFeedback("not_helpful")} className="h-7 px-2">
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Category Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Task to Roadmap</DialogTitle>
            <DialogDescription>
              Where should this task go? Choose the most appropriate category for tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Enter task description..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-category">Category</Label>
              <Select value={taskCategory} onValueChange={setTaskCategory}>
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
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? "Saving..." : "Save to Roadmap"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
