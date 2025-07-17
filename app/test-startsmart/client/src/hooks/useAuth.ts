import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const isCustomDomain = window.location.hostname === 'startsmart.nextax.ai';
  const replitDomain = '89c940af-8b32-4fc9-81c0-f4e571924056-00-ean17kbdh45e.riker.replit.dev';
  
  // For custom domain, use the working Replit domain for API calls
  const apiBaseUrl = isCustomDomain ? `https://${replitDomain}` : '';

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/api/auth/user`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin,
        },
      });
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      return response.json();
    },
    retry: false,
  });

  // Check if user has pro subscription or higher
  const { data: usage } = useQuery({
    queryKey: ["/api/auth/user/usage"],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/api/auth/user/usage`, {
        credentials: 'include',
        headers: {
          'Origin': window.location.origin,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch usage');
      }
      return response.json();
    },
    retry: false,
    enabled: !!user,
  });

  // Temporary admin override for testing - safe to remove later
  const isAdminUser = user?.id === "40936537";

  // Custom domain login redirect
  const login = () => {
    if (isCustomDomain) {
      // Custom domain infrastructure doesn't reach our Express server
      // Redirect to working Replit domain for authentication
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `https://${replitDomain}/api/login?return_to=${returnUrl}`;
    } else {
      // Standard login for Replit domains
      window.location.href = '/api/login';
    }
  };

  // Logout function
  const logout = () => {
    if (isCustomDomain) {
      const returnUrl = encodeURIComponent(window.location.origin);
      window.location.href = `https://${replitDomain}/api/logout?return_to=${returnUrl}`;
    } else {
      window.location.href = '/api/logout';
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isProUser: (usage?.tier === 'pro' || usage?.tier === 'premium') || isAdminUser,
    isPremiumUser: usage?.tier === 'premium' || isAdminUser,
    usage,
    isAdminUser, // Add admin flag for testing all tiers
    login,
    logout,
    error,
  };
}
