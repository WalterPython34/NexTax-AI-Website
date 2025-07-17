import { useEffect } from 'react';

export function CustomDomainRedirect() {
  useEffect(() => {
    // Only run on custom domain
    if (window.location.hostname !== 'startsmart.nextax.ai') {
      return;
    }

    console.log('🌐 Custom domain detected - setting up API redirects');

    // Check if user is trying to access API endpoints directly
    const path = window.location.pathname;
    if (path.startsWith('/api/')) {
      console.log('🔄 API endpoint accessed on custom domain, redirecting to working backend');
      
      // Redirect API calls to the working Replit domain
      const replitDomain = '89c940af-8b32-4fc9-81c0-f4e571924056-00-ean17kbdh45e.riker.replit.dev';
      
      if (path === '/api/login') {
        // Handle login redirect with return URL
        const returnUrl = encodeURIComponent(window.location.origin + '/');
        const redirectUrl = `https://${replitDomain}/api/login?return_to=${returnUrl}`;
        console.log('🔑 Redirecting login to:', redirectUrl);
        window.location.href = redirectUrl;
      } else if (path === '/api/logout') {
        // Handle logout redirect with return URL
        const returnUrl = encodeURIComponent(window.location.origin + '/');
        const redirectUrl = `https://${replitDomain}/api/logout?return_to=${returnUrl}`;
        console.log('🚪 Redirecting logout to:', redirectUrl);
        window.location.href = redirectUrl;
      } else {
        // For other API endpoints, they should be handled by useAuth hook
        console.warn('⚠️ API endpoint accessed directly on custom domain:', path);
        window.location.href = '/?error=api_not_available';
      }
    }

    // Override window.fetch for API calls to route through working domain
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      let url: string;
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.href;
      } else {
        url = (input as Request).url;
      }
      
      // If it's an API call and we're on custom domain, route through working domain
      if (url.startsWith('/api/') && window.location.hostname === 'startsmart.nextax.ai') {
        const replitDomain = '89c940af-8b32-4fc9-81c0-f4e571924056-00-ean17kbdh45e.riker.replit.dev';
        const fullUrl = `https://${replitDomain}${url}`;
        console.log('🔄 Routing API call through working domain:', url, '→', fullUrl);
        
        // Add credentials to include cookies for authentication
        const newInit = {
          ...init,
          credentials: 'include' as RequestCredentials,
          headers: {
            ...init?.headers,
            'Origin': window.location.origin,
          }
        };
        
        return originalFetch(fullUrl, newInit);
      }
      
      return originalFetch(input, init);
    };

    // Cleanup function to restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null; // This component doesn't render anything
}