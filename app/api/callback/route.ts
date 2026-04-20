// app/auth/callback/route.ts
// Handles Supabase magic link and OAuth callbacks.
// Exchanges the `code` param for a session, then redirects to `next`
// (defaults to /buyer-dashboard so magic links land in the right place).

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` is set by emailRedirectTo in signInWithOtp — default to /buyer-dashboard
  const next = searchParams.get("next") ?? "/buyer-dashboard";

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send to buyer-dashboard anyway so they can retry
  return NextResponse.redirect(`${origin}/buyer-dashboard`);
}
