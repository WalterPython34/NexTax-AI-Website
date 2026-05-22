// app/acquiflow-intel/_lib/authedFetch.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Institutional Read — resilient READ-ONLY auth transport.
//
// The intel surface is a parallel layer; it must not import the operational
// app's Supabase client. This helper independently and robustly:
//   - extracts the access token from localStorage (raw JSON, base64- prefix,
//     array or object shapes — matching the API route's tolerance);
//   - detects an expired/expiring token and refreshes it via Supabase's token
//     endpoint using the stored refresh_token;
//   - on a 401 / unauthenticated response, refreshes once and retries.
//
// It performs NO writes. It only reads tokens and GETs data. If refresh fails,
// it surfaces the original auth error so the page can prompt re-sign-in.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_AUTH_KEY = "sb-sgrosezedxunoicmglpj-auth-token";
const SUPABASE_URL = "https://sgrosezedxunoicmglpj.supabase.co";
// Public anon key is safe to ship to the client (it is, by design, public).
// Pulled from the standard NEXT_PUBLIC env at build; falls back to empty.
const SUPABASE_ANON_KEY =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || "";

interface StoredSession {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number; // unix seconds
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SUPABASE_AUTH_KEY);
    if (!raw) return null;
    let value = raw;
    if (value.startsWith("base64-")) {
      value = atob(value.slice("base64-".length));
    }
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const first = parsed[0];
      if (first && typeof first === "object") return first as StoredSession;
      if (typeof first === "string") return { access_token: first };
      return null;
    }
    if (parsed && typeof parsed === "object") return parsed as StoredSession;
    return null;
  } catch {
    return null;
  }
}

function tokenExpiringSoon(session: StoredSession | null): boolean {
  if (!session?.expires_at) return false; // unknown → assume usable, let server decide
  const nowSec = Math.floor(Date.now() / 1000);
  return session.expires_at - nowSec < 60; // refresh if <60s remaining
}

async function refreshSession(session: StoredSession): Promise<StoredSession | null> {
  if (!session.refresh_token || !SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.access_token) return null;
    const next: StoredSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? session.refresh_token,
      expires_at: data.expires_at ?? (data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined),
    };
    // Persist the refreshed session so the operational app stays in sync.
    try {
      window.localStorage.setItem(SUPABASE_AUTH_KEY, JSON.stringify(next));
    } catch {
      /* storage write best-effort; not required for this request */
    }
    return next;
  } catch {
    return null;
  }
}

/**
 * GET a URL with the current Supabase access token. If the token is expiring or
 * the server returns 401/unauthenticated, refresh once and retry. Returns the
 * parsed JSON body (the route's success/error envelope). READ-ONLY.
 */
export async function authedGet(url: string): Promise<any> {
  let session = readStoredSession();

  // Proactive refresh if we can see the token is about to expire.
  if (session && tokenExpiringSoon(session)) {
    const refreshed = await refreshSession(session);
    if (refreshed) session = refreshed;
  }

  const doFetch = async (token: string | undefined) =>
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

  let res = await doFetch(session?.access_token);
  let json = await res.json().catch(() => ({ success: false, error_kind: "bad_response", reason: "Unreadable response." }));

  // Reactive refresh-and-retry on an auth failure.
  const isAuthFail =
    res.status === 401 ||
    json?.error_kind === "unauthenticated" ||
    json?.error_kind === "auth_token_missing";

  if (isAuthFail && session) {
    const refreshed = await refreshSession(session);
    if (refreshed?.access_token) {
      res = await doFetch(refreshed.access_token);
      json = await res.json().catch(() => ({ success: false, error_kind: "bad_response", reason: "Unreadable response." }));
    }
  }

  return json;
}
