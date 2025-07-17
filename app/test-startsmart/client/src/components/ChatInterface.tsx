import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { Send, Bot, User, History, Lightbulb, FileText, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

const suggestionButtons = [
  {
    id: "entity-formation",
    label: "🏢 Entity Formation",
    text: "Help me understand the different business entity types and which one is right for my business."
  },
  {
    id: "business-plan",
    label: "📋 Business Plan",
    text: "I need help creating a comprehensive business plan for my startup."
  },
  {
    id: "tax-setup",
    label: "💰 Tax Setup",
    text: "What do I need to know about tax setup and compliance for my new business?"
  }
];

export function ChatInterface() {
  const [currentMessage, setCurrentMessage] = useState("");
  const [currentConversation, setCurrentConversation] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
    retry: false,
  });

  // Fetch messages for current conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/conversations", currentConversation, "messages"],
    enabled: !!currentConversation,
    retry: false,
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/conversations", { title });
      return response.json();
    },
    onSuccess: (conversation) => {
      setCurrentConversation(conversation.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
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
        description: "Failed to create conversation",
        variant: "destructive",
      });
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number; content: string }) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", currentConversation, "messages"] });
      setCurrentMessage("");
      setIsTyping(false);
    },
    onError: (error) => {
      setIsTyping(false);
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
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Quick chat for first-time users
  const quickChatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat/quick", { message });
      return response.json();
    },
    onSuccess: async (data) => {
      // Create a new conversation with the first message
      const title = currentMessage.slice(0, 50) + (currentMessage.length > 50 ? "..." : "");
      const conversation = await createConversationMutation.mutateAsync(title);
      
      // The mutation will handle setting the current conversation
      setIsTyping(false);
    },
    onError: (error) => {
      setIsTyping(false);
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
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    const message = currentMessage.trim();
    if (!message) return;

    setIsTyping(true);

    if (currentConversation) {
      sendMessageMutation.mutate({ conversationId: currentConversation, content: message });
    } else {
      // First message - use quick chat to create conversation
      quickChatMutation.mutate(message);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setCurrentMessage(text);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [currentMessage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start with first conversation if available
  useEffect(() => {
    if (conversations.length > 0 && !currentConversation) {
      setCurrentConversation(conversations[0].id);
    }
  }, [conversations, currentConversation]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 nexTax-gradient rounded-xl flex items-center justify-center">
              <Bot className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Sidekick</h2>
              <p className="text-sm text-emerald-600">Ready to help launch your business</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <History size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        {/* Welcome Message */}
        {(!currentConversation || messages.length === 0) && (
          <div className="chat-bubble flex items-start space-x-3">
            <div className="w-8 h-8 nexTax-gradient rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="text-white" size={16} />
            </div>
            <Card className="rounded-2xl rounded-tl-md p-4 max-w-2xl border-slate-200 dark:border-slate-700">
              <p className="text-slate-900 dark:text-white">
                👋 Welcome to StartSmart! I'm your AI sidekick, ready to help you navigate every step of starting your business.
              </p>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Whether you need help with entity formation, compliance, financial planning, or market research, I'm here to guide you through it all. What would you like to work on today?
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestionButtons.map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    variant={suggestion.id === "entity-formation" ? "default" : "secondary"}
                    size="sm"
                    className={
                      suggestion.id === "entity-formation"
                        ? "nexTax-gradient text-white hover:shadow-md"
                        : ""
                    }
                    onClick={() => handleSuggestionClick(suggestion.text)}
                  >
                    {suggestion.label}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Messages */}
        {messagesLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          messages.map((message: Message) => (
            <div
              key={message.id}
              className={`chat-bubble flex items-start space-x-3 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === "user"
                    ? "bg-slate-200 dark:bg-slate-600"
                    : "nexTax-gradient"
                }`}
              >
                {message.role === "user" ? (
                  <User className="text-slate-600 dark:text-slate-300" size={16} />
                ) : (
                  <Bot className="text-white" size={16} />
                )}
              </div>
              <Card
                className={`rounded-2xl p-4 max-w-2xl ${
                  message.role === "user"
                    ? "nexTax-gradient text-white rounded-tr-md"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-tl-md"
                }`}
              >
                <div className={message.role === "user" ? "text-white" : "text-slate-900 dark:text-white"}>
                  {message.content.split('\n').map((line, index) => (
                    <p key={index} className={index > 0 ? "mt-2" : ""}>
                      {line}
                    </p>
                  ))}
                </div>
              </Card>
            </div>
          ))
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="chat-bubble flex items-start space-x-3">
            <div className="w-8 h-8 nexTax-gradient rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="text-white" size={16} />
            </div>
            <Card className="rounded-2xl rounded-tl-md p-4 border-slate-200 dark:border-slate-700">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4 lg:p-6 bg-white dark:bg-slate-800">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about starting your business..."
              className="resize-none bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500"
              rows={1}
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || isTyping}
            className="w-12 h-12 nexTax-gradient text-white hover:shadow-lg"
            size="sm"
          >
            <Send size={16} />
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className="hidden sm:inline">Powered by OpenAI GPT</span>
        </div>
      </div>
    </div>
  );
}
