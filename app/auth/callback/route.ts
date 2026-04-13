import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    // After session is established, backfill deal_runs and deal_leads
    // using the authenticated user's ID and email
    if (!error && data?.user) {
      const { id: user_id, email } = data.user;
      if (user_id && email) {
        // Fire and forget — non-blocking, never delays the redirect
        fetch(`${requestUrl.origin}/api/auth/link-deals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id, email }),
        }).catch((err) => {
          console.error("link-deals fetch error:", err);
        });
      }
    }
  }

  // Redirect to the `next` param if present, otherwise fall back to home
  const next = requestUrl.searchParams.get("next") ?? "/buyer-dashboard";
return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
