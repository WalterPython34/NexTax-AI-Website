// Collectors: pull RawSignals from public sources. Gated sources (Searchfunder,
// Axial) are fed via the manual-add API instead — never scrape them.

import { X_QUERIES, REDDIT_SUBS, PODCAST_FEEDS, clusterHits } from "./config";
import type { RawSignal } from "./types";

// --- X (Twitter) API v2 recent search --------------------------------------
export async function collectFromX(): Promise<RawSignal[]> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return [];
  const out: RawSignal[] = [];

  for (const query of Object.values(X_QUERIES)) {
    const url =
      "https://api.twitter.com/2/tweets/search/recent?max_results=50" +
      "&tweet.fields=author_id,created_at&expansions=author_id" +
      "&user.fields=username,name,description" +
      `&query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) continue;
    const data = await res.json();
    const users = new Map<string, any>(
      (data.includes?.users ?? []).map((u: any) => [u.id, u]),
    );
    for (const t of data.data ?? []) {
      const u = users.get(t.author_id);
      out.push({
        source: "x",
        source_url: u ? `https://x.com/${u.username}/status/${t.id}` : undefined,
        author_handle: u ? `@${u.username}` : undefined,
        author_name: u?.name,
        text: t.text,
      });
    }
  }
  return out;
}

// --- Reddit: poll /r/{sub}/new.json, keyword pre-filter --------------------
export async function collectFromReddit(): Promise<RawSignal[]> {
  const out: RawSignal[] = [];
  for (const sub of REDDIT_SUBS) {
    const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=50`, {
      headers: { "User-Agent": "acquiflow-buyer-engine/1.0" },
    });
    if (!res.ok) continue;
    const data = await res.json();
    for (const child of data.data?.children ?? []) {
      const p = child.data;
      const text = `${p.title}\n\n${p.selftext ?? ""}`;
      const h = clusterHits(text);
      if (!(h.qoe || h.hot || h.warm)) continue; // pre-filter before model call
      out.push({
        source: "reddit",
        source_url: `https://www.reddit.com${p.permalink}`,
        author_handle: `u/${p.author}`,
        text,
      });
    }
  }
  return out;
}

// --- Podcasts: parse RSS, treat each new episode's guest as a buyer --------
export async function collectFromPodcasts(): Promise<RawSignal[]> {
  const out: RawSignal[] = [];
  for (const feed of PODCAST_FEEDS) {
    const res = await fetch(feed);
    if (!res.ok) continue;
    const xml = await res.text();
    // Lightweight RSS parse — swap for `rss-parser` if you want robustness.
    const items = xml.split(/<item>/i).slice(1, 6); // newest few
    for (const item of items) {
      const title = (item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "")
        .replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      const desc = (item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ?? "")
        .replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      const link = item.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim();
      out.push({ source: "podcast", source_url: link, text: `${title}\n\n${desc}` });
    }
  }
  return out;
}

export async function collectAll(): Promise<RawSignal[]> {
  const batches = await Promise.allSettled([
    collectFromX(),
    collectFromReddit(),
    collectFromPodcasts(),
  ]);
  return batches.flatMap((b) => (b.status === "fulfilled" ? b.value : []));
}
