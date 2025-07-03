"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, User, Bot, AlertCircle } from "lucide-react"
import { getBusinessAdvice } from "@/lib/knowledge-base"
import { supabase, getUser, getUserSubscription } from "@/lib/supabase"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface EnhancedChatBotProps {
  className?: string
}

export default function EnhancedChatBot({ className }: EnhancedChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm StartSmart GPT, your AI business advisor. I can help you with business formation, tax strategies, compliance, and growth planning. What would you like to know?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [questionsUsed, setQuestionsUsed] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkUserAuth()
  }, [])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const checkUserAuth = async () => {
    try {
      const currentUser = await getUser()
      setUser(currentUser)

      if (currentUser) {
        const userSub = await getUserSubscription(currentUser.id)
        setSubscription(userSub)
        setQuestionsUsed(userSub?.questions_used || 0)
      }
    } catch (error) {
      console.error("Error checking auth:", error)
    }
  }

  const canAskQuestion = () => {
    if (!subscription) return true // Free tier gets 10 questions
    if (subscription.tier === "premium") return true // Unlimited
    if (subscription.tier === "pro") return questionsUsed < 150
    return questionsUsed < 10 // Free tier
  }

  const getQuestionLimit = () => {
    if (!subscription) return 10
    if (subscription.tier === "premium") return -1 // Unlimited
    if (subscription.tier === "pro") return 150
    return 10
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    if (!canAskQuestion()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "You've reached your question limit. Please upgrade your subscription to continue using StartSmart GPT.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newMessage])
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Get AI response
      const response = await getBusinessAdvice(input, messages)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Update question count if user is logged in
      if (user && subscription) {
        const newCount = questionsUsed + 1
        setQuestionsUsed(newCount)

        // Update in database
        await supabase.from("user_subscriptions").update({ questions_used: newCount }).eq("user_id", user.id)
      }
    } catch (error) {
      console.error("Error getting response:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "premium":
        return "bg-purple-500"
      case "pro":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const questionLimit = getQuestionLimit()
  const remainingQuestions = questionLimit === -1 ? "Unlimited" : Math.max(0, questionLimit - questionsUsed)

  return (
    <Card className={`w-full max-w-4xl mx-auto h-[600px] flex flex-col ${className}`}>
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-green-600" />
            StartSmart GPT
          </CardTitle>
          <div className="flex items-center gap-2">
            {subscription && (
              <Badge className={getTierBadgeColor(subscription.tier)}>{subscription.tier.toUpperCase()}</Badge>
            )}
            <Badge variant="outline">{remainingQuestions} questions left</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src="/images/startsmart-logo.png" />
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                </div>

                {message.role === "user" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src="/images/startsmart-logo.png" />
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          {!canAskQuestion() && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                You've reached your question limit. Upgrade to continue chatting!
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about business formation, taxes, compliance..."
              disabled={isLoading || !canAskQuestion()}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim() || !canAskQuestion()} size="icon">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
