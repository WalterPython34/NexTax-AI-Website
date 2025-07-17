import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { CustomDomainRedirect } from "@/components/CustomDomainRedirect";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import AuthTest from "@/pages/auth-test";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <>
      <CustomDomainRedirect />
      <Switch>
        {isLoading || !isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="/auth-test" component={AuthTest} />
          </>
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/auth-test" component={AuthTest} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="startsmart-ui-theme">
        <TooltipProvider>
          <div className="ios-status-bar ios-bottom-safe min-h-screen">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
