// middleware.ts — project root (alongside next.config.ts)
// Guards /admin/* routes — requires authenticated Supabase session.
// No new infrastructure: uses the existing Supabase auth cookie.

import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res  = NextResponse.next();
  const path = req.nextUrl.pathname;

  // Only guard admin routes — all other pages pass through unchanged
  if (!path.startsWith("/admin")) return res;

  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = new URL("/buyer-dashboard", req.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  // Optional role check — uncomment if profiles table has a `role` column:
  // const { data: profile } = await supabase
  //   .from("profiles").select("role").eq("id", session.user.id).single();
  // if (profile?.role !== "admin") {
  //   return NextResponse.redirect(new URL("/buyer-dashboard", req.url));
  // }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
