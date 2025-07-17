import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Handle custom domain routing
  const isCustomDomain = window.location.hostname === 'startsmart.nextax.ai';
  const replitDomain = '89c940af-8b32-4fc9-81c0-f4e571924056-00-ean17kbdh45e.riker.replit.dev';
  
  let finalUrl = url;
  if (isCustomDomain && url.startsWith('/api/')) {
    finalUrl = `https://${replitDomain}${url}`;
  }
  
  const res = await fetch(finalUrl, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      'Origin': window.location.origin,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle custom domain routing
    const isCustomDomain = window.location.hostname === 'startsmart.nextax.ai';
    const replitDomain = '89c940af-8b32-4fc9-81c0-f4e571924056-00-ean17kbdh45e.riker.replit.dev';
    
    let url = queryKey[0] as string;
    if (isCustomDomain && url.startsWith('/api/')) {
      url = `https://${replitDomain}${url}`;
    }
    
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        'Origin': window.location.origin,
      },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
