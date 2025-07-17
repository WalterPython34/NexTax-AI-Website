import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAiUsage } from "@/hooks/useAiUsage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageBubble } from "./message-bubble";
import { Logo } from "@/components/ui/logo";
import UpgradeModal from "@/components/ui/upgrade-modal";
import { useTheme } from "@/components/ui/theme-provider";
import { Moon, Sun, History, Send, Lock, AlertTriangle } from "lucide-react";
import type { Message, Conversation } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

export function ChatInterface() {
  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState<{
    open: boolean;
    feature: string;
    plan: "pro" | "premium";
  }>({ open: false, feature: "", plan: "pro" });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { usage, refetch: refetchUsage, getUsageDisplay, getTooltipText, getTierColor } = useAiUsage();

  // Fetch conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    retry: false,
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/conversations", { title });
      return response.json();
    },
    onSuccess: (conversation: Conversation) => {
      setCurrentConversationId(conversation.id);
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
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        role: "user",
        content,
      });
      return response.json();
    },
    onSuccess: () => {
      // Force refresh both queries and usage
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conversations/${currentConversationId}/messages`] 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      refetchUsage(); // Refresh usage count after sending message
      // Force immediate refetch of messages
      refetchMessages();
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
      
      // Check if it's a usage limit error (429 status)
      if (error.message.includes("429:")) {
        setUpgradeDialog({
          open: true,
          feature: "AI Chat - Message Limit Reached",
          plan: usage?.tier === "free" ? "pro" : "premium",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Fetch messages for current conversation  
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${currentConversationId}/messages`],
    enabled: !!currentConversationId,
    retry: false,
    staleTime: 0, // Always fetch fresh data
    refetchInterval: sendMessageMutation.isPending ? 2000 : false, // Poll every 2s while sending
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [message]);

  // Create initial conversation if none exists
  useEffect(() => {
    if (conversations.length === 0 && !currentConversationId) {
      // Wait for user to send first message to create conversation
      return;
    }
    if (conversations.length > 0 && !currentConversationId) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);



  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const messageContent = message.trim();
    setMessage("");

    try {
      // Create conversation if none exists
      if (!currentConversationId) {
        const conversation = await createConversationMutation.mutateAsync("New Chat");
        await sendMessageMutation.mutateAsync({
          conversationId: conversation.id,
          content: messageContent,
        });
      } else {
        await sendMessageMutation.mutateAsync({
          conversationId: currentConversationId,
          content: messageContent,
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSuggestionClick = (suggestion: string) => {
    const suggestions = {
      'entity-formation': 'Help me understand the different business entity types and which one is right for my business.',
      'business-plan': 'I need help creating a comprehensive business plan for my startup.',
      'tax-setup': 'What do I need to know about tax setup and compliance for my new business?'
    };
    
    setMessage(suggestions[suggestion as keyof typeof suggestions] || suggestion);
    textareaRef.current?.focus();
  };

  return (
    <section className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Logo size="lg" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Sidekick</h2>
              <p className="text-sm text-[hsl(174,73%,53%)]">Ready to help launch your business</p>
            </div>
          </div>
          
          {/* Usage Display */}
          <div className="flex items-center space-x-3">
            {usage && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden sm:flex items-center space-x-2">
                      <Badge variant="outline" className={getTierColor()}>
                        {usage.tier.charAt(0).toUpperCase() + usage.tier.slice(1)}
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {getUsageDisplay()}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getTooltipText()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <div className="hidden lg:flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm">
              <History className="h-4 w-4" />
            </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full max-h-[calc(100vh-200px)]">
          <div className="p-4 lg:p-6 space-y-4">
        {messages.length === 0 ? (
          // Welcome Message
          <div className="chat-bubble flex items-start space-x-3">
            <Logo size="md" />
            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-md p-4 shadow-sm border border-slate-200 dark:border-slate-700 max-w-2xl">
              <p className="text-slate-900 dark:text-white">
                👋 Welcome to StartSmart! I'm your AI sidekick, ready to help you navigate every step of starting your business.
              </p>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Whether you need help with entity formation, compliance, financial planning, or market research, I'm here to guide you through it all. What would you like to work on today?
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSuggestionClick('entity-formation')}
                  className="nexTax-gradient text-white hover:shadow-md"
                >
                  🏢 Entity Formation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick('business-plan')}
                >
                  📋 Business Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick('tax-setup')}
                >
                  💰 Tax Setup
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Message History
          messages.map((msg: Message) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        {/* Typing Indicator */}
        {sendMessageMutation.isPending && (
          <div className="chat-bubble flex items-start space-x-3">
            <Logo size="md" />
            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-md p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[hsl(174,73%,53%)] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[hsl(174,73%,53%)] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-[hsl(174,73%,53%)] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

          <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Chat Input */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4 lg:p-6 bg-white dark:bg-slate-800">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder={
                usage && !usage.canSend
                  ? "Message limit reached - Upgrade to continue chatting"
                  : "Ask me anything about starting your business..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[48px] max-h-[120px] resize-none bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:ring-[hsl(174,73%,53%)] focus:border-[hsl(174,73%,53%)]"
              disabled={sendMessageMutation.isPending || (usage && !usage.canSend)}
            />
          </div>
          <Button
            onClick={usage && !usage.canSend ? () => {
              setUpgradeDialog({
                open: true,
                feature: "AI Chat - Message Limit Reached",
                plan: usage.tier === "free" ? "pro" : "premium",
              });
            } : handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className={`text-white hover:shadow-lg h-12 w-12 p-0 ${
              usage && !usage.canSend
                ? "bg-slate-400 hover:bg-slate-500 cursor-not-allowed"
                : "nexTax-gradient"
            }`}
            title={usage && !usage.canSend ? "Upgrade to continue chatting" : "Send message"}
          >
            {usage && !usage.canSend ? <Lock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {/* Usage Warning */}
        {usage && (usage.warningMessage || usage.upgradeMessage) && (
          <div className="mt-2 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                {usage.warningMessage || usage.upgradeMessage}
              </span>
            </div>
            {usage.upgradeMessage && (
              <Button
                size="sm"
                onClick={() => setUpgradeDialog({
                  open: true,
                  feature: "AI Chat - Approaching Limit",
                  plan: usage.tier === "free" ? "pro" : "premium",
                })}
                className="text-xs nexTax-gradient text-white"
              >
                Upgrade
              </Button>
            )}
          </div>
        )}
        
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className="hidden sm:inline">Powered by OpenAI GPT</span>
        </div>
      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeDialog.open}
        onClose={() => setUpgradeDialog({ open: false, feature: "", plan: "pro" })}
        feature={upgradeDialog.feature}
        plan={upgradeDialog.plan}
      />
    </section>
  );
}
