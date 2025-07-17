import { useQuery } from "@tanstack/react-query";

export interface AiUsageData {
  tier: "free" | "pro" | "premium";
  usage: {
    messageCount: number;
    tokenCount: number;
  };
  limits: {
    maxMessages: number | "unlimited";
    description: string;
  };
  canSend: boolean;
  warningMessage?: string;
  upgradeMessage?: string;
}

export function useAiUsage() {
  const { data: usage, isLoading, refetch } = useQuery<AiUsageData>({
    queryKey: ["/api/auth/user/usage"],
    retry: false,
  });

  const getUsageDisplay = () => {
    if (!usage) return "";
    
    if (usage.tier === "premium") {
      return `${usage.usage.messageCount} messages used this month`;
    }
    
    const remaining = (usage.limits.maxMessages as number) - usage.usage.messageCount;
    return `${remaining}/${usage.limits.maxMessages} messages remaining`;
  };

  const getTooltipText = () => {
    if (!usage) return "";
    
    switch (usage.tier) {
      case "free":
        return "10 AI messages per month";
      case "pro":
        return "150 AI messages monthly";
      case "premium":
        return "Unlimited AI messages";
      default:
        return "";
    }
  };

  const getTierColor = () => {
    if (!usage) return "text-gray-500";
    
    switch (usage.tier) {
      case "free":
        return "text-gray-500";
      case "pro":
        return "text-blue-600";
      case "premium":
        return "text-amber-600";
      default:
        return "text-gray-500";
    }
  };

  // Restore original tier for final testing (comment out override)
  const enhancedUsage = usage;

  return {
    usage: enhancedUsage,
    isLoading,
    refetch,
    getUsageDisplay,
    getTooltipText,
    getTierColor,
  };
}