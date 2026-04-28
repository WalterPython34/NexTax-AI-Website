import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res  = NextResponse.next();
  const path = req.nextUrl.pathname;

  if (!path.startsWith("/admin")) return res;

  // TEMPORARILY DISABLED — testing if middleware itself is the cause
  // const supabase = createMiddlewareClient({ req, res });
  // const { data: { session } } = await supabase.auth.getSession();
  // if (!session) {
  //   const loginUrl = new URL("/buyer-dashboard", req.url);
  //   loginUrl.searchParams.set("redirect", path);
  //   return NextResponse.redirect(loginUrl);
  // }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
