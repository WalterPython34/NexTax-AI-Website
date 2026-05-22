// app/acquiflow-intel/_lib/authedFetch.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Institutional Read — resilient READ-ONLY auth transport.
//
// The intel surface is a parallel layer; it must not import the operational
// app's Supabase client. But the operational app DOES run its own Supabase
// (GoTrue) client on the page, and that client refreshes the session token in
// the background automatically. So this helper does NOT perform its own token
// refresh. Instead it:
//   - extracts the access token from localStorage (raw JSON, base64- prefix,
//     array or object shapes — matching the API route's tolerance);
//   - on a 401 / unauthenticated response, waits briefly and RE-READS the token
//     from localStorage (the app's own client may have just refreshed it), then
//     retries — up to two short attempts.
//
// This avoids replicating Supabase's refresh protocol or depending on the anon
// key being inlined here. It simply picks up the refresh the app already does.
// Performs NO writes. Read-only.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_AUTH_KEY = "sb-sgrosezedxunoicmglpj-auth-token";

function readAccessToken(): string | null {
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
      if (first && typeof first === "object" && typeof first.access_token === "string") return first.access_token;
      if (typeof first === "string" && first.split(".").length === 3) return first;
      return null;
    }
    if (parsed && typeof parsed === "object" && typeof parsed.access_token === "string") {
      return parsed.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * GET a URL with the current Supabase access token. On an auth failure, wait
 * briefly and re-read the token (the app's own Supabase client refreshes it in
 * the background), then retry — up to two short attempts. Returns the parsed
 * JSON envelope. READ-ONLY.
 */
export async function authedGet(url: string): Promise<any> {
  const attempt = async () => {
    const token = readAccessToken();
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const json = await res
      .json()
      .catch(() => ({ success: false, error_kind: "bad_response", reason: "Unreadable response." }));
    const authFail =
      res.status === 401 ||
      json?.error_kind === "unauthenticated" ||
      json?.error_kind === "auth_token_missing";
    return { json, authFail };
  };

  // First try.
  let { json, authFail } = await attempt();
  if (!authFail) return json;

  // The app's GoTrue client may be mid-refresh. Give it a moment, re-read, retry.
  for (const wait of [350, 900]) {
    await sleep(wait);
    const r = await attempt();
    if (!r.authFail) return r.json;
    json = r.json;
  }

  // Still failing after retries — surface the auth error so the page can prompt
  // the user to refresh or re-sign-in.
  return json;
}
