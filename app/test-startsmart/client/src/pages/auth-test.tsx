import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function AuthTest() {
  const { login, isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Authentication Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Domain: {window.location.hostname}
            </p>
            
            {isAuthenticated ? (
              <div className="space-y-2">
                <p className="text-green-600 font-medium">✅ Authenticated</p>
                <p className="text-sm">User: {user?.email}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-orange-600 font-medium">🔐 Not Authenticated</p>
                <Button 
                  onClick={login}
                  className="w-full"
                >
                  Test Login Flow
                </Button>
                <p className="text-xs text-slate-500">
                  This will redirect to the working domain for authentication
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}