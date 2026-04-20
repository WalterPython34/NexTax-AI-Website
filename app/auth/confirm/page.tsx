// app/auth/confirm/page.tsx
// Client-side auth handler.
// Catches BOTH the hash fragment flow (#access_token=...) AND
// the code flow (?code=...) — whichever Supabase sends.
// After session is established, redirects to `next` param.

"use client";

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthConfirm() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const next        = searchParams.get("next") ?? "/buyer-dashboard";

  useEffect(() => {
    async function handleAuth() {
      // Case 1: hash fragment flow — #access_token=... in the URL
      // getSession() picks this up automatically from the hash
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(next);
        return;
      }

      // Case 2: code flow — ?code=... in the URL (PKCE)
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
      }

      // Case 3: onAuthStateChange fires when Supabase processes the hash
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (session) {
            subscription.unsubscribe();
            router.replace(next);
          }
        }
      );

      // If nothing resolves in 8 seconds, give up and send to dashboard anyway
      setTimeout(() => {
        subscription.unsubscribe();
        router.replace(next);
      }, 8000);
    }

    handleAuth();
  }, [next, router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080C13",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#94A3B8",
      fontFamily: "'Inter',sans-serif",
      fontSize: 14,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🔐</div>
        <div>Signing you in...</div>
      </div>
    </div>
  );
}
