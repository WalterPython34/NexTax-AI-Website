// app/login/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Mode = "password" | "magic";

export default function LoginPage() {
  const [mode, setMode]         = useState<Mode>("password");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");

  const handlePasswordSignIn = async () => {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (authError) {
      setError(authError.message.toLowerCase().includes("invalid")
        ? "Incorrect email or password. Use the Magic Link tab if you haven't set a password yet."
        : authError.message);
      setLoading(false);
      return;
    }
    window.location.href = "/buyer-dashboard";
  };

  const handleMagicLink = async () => {
    if (!email || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/buyer-dashboard` },
    });
    if (authError) {
      setError(authError.message.toLowerCase().includes("rate")
        ? "Too many requests — please wait a few minutes, or sign in with your password instead."
        : "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  };

  const handleSubmit = () => mode === "password" ? handlePasswordSignIn() : handleMagicLink();
  const canSubmit = email && (mode === "magic" || password);

  return (
    <div style={{ minHeight: "100vh", background: "#080C13", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        input { font-family: 'Inter', sans-serif; }
        input:focus { outline: none; border-color: rgba(99,102,241,0.5) !important; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter Tight', sans-serif", letterSpacing: "-0.02em" }}>NexTax</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#6366F1", fontFamily: "'Inter Tight', sans-serif" }}>.AI</span>
          </a>
        </div>

        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "36px 32px" }}>

          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", margin: "0 0 10px", fontFamily: "'Inter Tight', sans-serif", letterSpacing: "-0.02em" }}>Check your inbox</h2>
              <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 20px", lineHeight: 1.6 }}>
                Magic link sent to <strong style={{ color: "#E2E8F0" }}>{email}</strong>. Click it to sign in and access your dashboard.
              </p>
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", fontSize: 12, color: "#818CF8", lineHeight: 1.6, marginBottom: 16 }}>
                Link expires in 60 minutes. Check your spam folder if you don't see it.
              </div>
              <button onClick={() => { setSent(false); setEmail(""); setPassword(""); }} style={{ background: "none", border: "none", color: "#4B5563", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>🔑</div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F1F5F9", margin: "0 0 8px", fontFamily: "'Inter Tight', sans-serif", letterSpacing: "-0.02em" }}>
                  Sign in to NexTax
                </h1>
                <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>
                  {mode === "password" ? "Welcome back. Enter your email and password." : "Enter your email and we'll send you a magic link."}
                </p>
              </div>

              {/* Mode toggle */}
              <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4, border: "1px solid rgba(255,255,255,0.06)" }}>
                {(["password", "magic"] as Mode[]).map((m) => (
                  <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, padding: "8px 12px", borderRadius: 7, border: "none", background: mode === m ? "rgba(99,102,241,0.2)" : "transparent", color: mode === m ? "#C4B5FD" : "#4B5563", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}>
                    {m === "password" ? "🔒 Password" : "✉️ Magic Link"}
                  </button>
                ))}
              </div>

              {/* Email */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, marginBottom: 6 }}>Email Address</label>
                <input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && mode === "password" && password && !loading && handleSubmit()} style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }} />
              </div>

              {/* Password field */}
              {mode === "password" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, marginBottom: 6 }}>Password</label>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()} style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }} />
                  <div style={{ marginTop: 8, textAlign: "right" }}>
                    <button onClick={() => { setMode("magic"); setError(""); }} style={{ background: "none", border: "none", color: "#4B5563", fontSize: 11, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                      Forgot password? Use magic link →
                    </button>
                  </div>
                </div>
              )}

              {mode === "magic" && <div style={{ marginBottom: 16 }} />}

              {/* Error */}
              {error && (
                <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: 13, color: "#FCA5A5", lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button onClick={handleSubmit} disabled={loading || !canSubmit} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: canSubmit ? "linear-gradient(135deg, #3B82F6, #6366F1)" : "rgba(255,255,255,0.06)", color: canSubmit ? "#fff" : "#4B5563", fontSize: 14, fontWeight: 600, cursor: canSubmit && !loading ? "pointer" : "not-allowed", fontFamily: "'Inter', sans-serif", transition: "opacity 0.15s" }}>
                {loading ? "Signing in..." : mode === "password" ? "Sign In →" : "Send Magic Link →"}
              </button>

              <p style={{ fontSize: 11, color: "#374151", textAlign: "center", marginTop: 14, fontFamily: "'Inter', sans-serif" }}>
                {mode === "password" ? (
                  <>No account yet? <a href="/deal-reality-check" style={{ color: "#6366F1", textDecoration: "none" }}>Run a free deal analysis →</a></>
                ) : (
                  <>Have a password? <button onClick={() => setMode("password")} style={{ background: "none", border: "none", color: "#6366F1", fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "'Inter', sans-serif" }}>Sign in with password</button></>
                )}
              </p>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#374151", fontFamily: "'Inter', sans-serif" }}>
          First time here via magic link?{" "}
          <a href="/buyer-dashboard" style={{ color: "#6366F1", textDecoration: "none" }}>Go to dashboard to set a password →</a>
        </p>
      </div>
    </div>
  );
}
