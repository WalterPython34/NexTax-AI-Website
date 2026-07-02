"use client";
// app/content-engine-x7q4k9/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — internal review surface. OWNER-ONLY.
//
// Deliberately unlinked from every product surface and parked on a
// non-guessable path (defense-in-depth; the real control is the server-side
// owner gate on every API route — this page renders nothing without a 200).
// The workflow ends at a staged/approved draft that Steve copies and posts
// himself; there is no post or schedule action here, by constitution.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const API = "/api/content-engine-x7q4k9";

type Candidate = {
  deal_run_id: string;
  industry: string | null;
  created_at: string | null;
  revenue: number | null;
  reported_sde: number | null;
  usable_sde: number | null;
  asking_price: number | null;
  dscr: number | null;
  triggers: Array<{ topic_key: string; tier: string }>;
  mode: string;
  mode_reasons: string[];
  prior_weight: number;
};

type DraftRow = {
  id: string;
  created_at: string;
  status: string;
  mode: string;
  topic_key: string;
  template_key: string | null;
  target_subreddit: string;
  title: string | null;
  numeric_check_passed: boolean;
  posted_url: string | null;
};

type DraftDetail = DraftRow & {
  body_md: string | null;
  anonymization: { mode: string; reasons: string[]; suppressed: string[]; source_deal_count: number } | null;
  numeric_check: {
    passed: boolean;
    unmatched: string[];
    extracted: Array<{ token: string; matched: boolean }>;
    label_checks: Array<{ check: string; passed: boolean; detail: string }>;
  } | null;
  fact_sheet: { entries: Array<{ key: string; display: string; qualifier: string | null }> } | null;
  source_deal_ids: string[];
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function money(n: number | null): string {
  if (n === null || !isFinite(n)) return "—";
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1_000)}K`;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-700 text-zinc-200",
  staged: "bg-blue-900 text-blue-200",
  approved: "bg-emerald-900 text-emerald-200",
  discarded: "bg-zinc-800 text-zinc-500",
  posted_manually: "bg-purple-900 text-purple-200",
};

export default function ContentEngineReview() {
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [tab, setTab] = useState<"candidates" | "drafts">("candidates");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [detail, setDetail] = useState<DraftDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [postedUrl, setPostedUrl] = useState("");

  const call = useCallback(async (path: string, init?: RequestInit): Promise<any | null> => {
    const headers = await authHeaders();
    const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
    if (res.status === 401 || res.status === 403) {
      setForbidden(`HTTP ${res.status} — this surface is owner-only.`);
      return null;
    }
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setNotice(json?.error ? `${json.error}${json.reason ? `: ${json.reason}` : ""}${json.detail ? `: ${json.detail}` : ""}` : `HTTP ${res.status}`);
      return null;
    }
    return json;
  }, []);

  const loadCandidates = useCallback(async () => {
    const json = await call("/candidates");
    if (json) setCandidates(json.candidates);
  }, [call]);

  const loadDrafts = useCallback(async () => {
    const json = await call("/drafts");
    if (json) setDrafts(json.drafts);
  }, [call]);

  useEffect(() => {
    loadCandidates();
    loadDrafts();
  }, [loadCandidates, loadDrafts]);

  const openDraft = useCallback(async (id: string) => {
    const json = await call(`/drafts/${id}`);
    if (json) {
      setDetail(json.draft);
      setEditTitle(json.draft.title ?? "");
      setEditBody(json.draft.body_md ?? "");
      setPostedUrl("");
    }
  }, [call]);

  const generate = async (dealRunId: string, topicKey: string) => {
    setBusy(`${dealRunId}:${topicKey}`);
    setNotice("Generating draft (claude-sonnet-4-6)…");
    const json = await call("/drafts", { method: "POST", body: JSON.stringify({ deal_run_id: dealRunId, topic_key: topicKey }) });
    setBusy(null);
    if (json) {
      setNotice(`Draft created — numeric check ${json.draft.numeric_check_passed ? "PASSED" : "FAILED (unstageable until fixed)"}`);
      await loadDrafts();
      setTab("drafts");
      await openDraft(json.draft.id);
    }
  };

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!detail) return;
    setBusy(action);
    const json = await call(`/drafts/${detail.id}`, { method: "PATCH", body: JSON.stringify({ action, ...extra }) });
    setBusy(null);
    if (json) {
      setDetail(json.draft);
      setEditTitle(json.draft.title ?? "");
      setEditBody(json.draft.body_md ?? "");
      setNotice(`${action}: ok — status '${json.draft.status}', numeric check ${json.draft.numeric_check_passed ? "passed" : "failed"}`);
      await loadDrafts();
    }
  };

  const copyDraft = async () => {
    if (!detail) return;
    await navigator.clipboard.writeText(`${editTitle}\n\n${editBody}`);
    setNotice("Copied title + body to clipboard.");
  };

  if (forbidden) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-300 flex items-center justify-center">
        <p className="text-sm">{forbidden}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-6 max-w-6xl mx-auto">
      <h1 className="text-lg font-semibold text-zinc-100">Content Engine — internal review</h1>
      <p className="text-xs text-zinc-500 mt-1 mb-4">
        Owner-only. Workflow ends at an approved draft you copy and post yourself. Nothing here posts or schedules anything.
      </p>

      {notice && <div className="text-xs text-amber-300 border border-amber-900 rounded px-3 py-2 mb-4">{notice}</div>}

      <div className="flex gap-2 mb-4">
        {(["candidates", "drafts"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm ${tab === t ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-300"}`}>
            {t === "candidates" ? `Candidates (${candidates.length})` : `Drafts (${drafts.length})`}
          </button>
        ))}
      </div>

      {tab === "candidates" && (
        <div className="space-y-2">
          {candidates.length === 0 && <p className="text-sm text-zinc-500">No eligible candidates (or still loading).</p>}
          {candidates.map((c) => (
            <div key={c.deal_run_id} className="border border-zinc-800 rounded p-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-zinc-100">{c.industry ?? "?"}</span>
                <span className="text-zinc-400">rev {money(c.revenue)} · SDE {money(c.usable_sde)} (stated {money(c.reported_sde)}) · ask {money(c.asking_price)} · DSCR {c.dscr ?? "—"}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${c.mode === "single_deal" ? "bg-emerald-950 text-emerald-300" : "bg-blue-950 text-blue-300"}`}>{c.mode}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {c.triggers.map((t) => (
                  <button key={t.topic_key} disabled={busy !== null}
                    onClick={() => generate(c.deal_run_id, t.topic_key)}
                    className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50">
                    {busy === `${c.deal_run_id}:${t.topic_key}` ? "generating…" : `Draft: ${t.topic_key} (${t.tier})`}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "drafts" && !detail && (
        <div className="space-y-2">
          {drafts.length === 0 && <p className="text-sm text-zinc-500">No drafts yet.</p>}
          {drafts.map((d) => (
            <button key={d.id} onClick={() => openDraft(d.id)}
              className="w-full text-left border border-zinc-800 rounded p-3 hover:border-zinc-600">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[d.status] ?? "bg-zinc-700"}`}>{d.status}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${d.numeric_check_passed ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"}`}>
                  {d.numeric_check_passed ? "numbers verified" : "numeric check FAILED"}
                </span>
                <span className="text-zinc-400 text-xs">{d.topic_key} · {d.mode} · r/{d.target_subreddit}</span>
              </div>
              <div className="text-zinc-100 mt-1 text-sm">{d.title ?? "(untitled)"}</div>
            </button>
          ))}
        </div>
      )}

      {tab === "drafts" && detail && (
        <div className="space-y-4">
          <button onClick={() => setDetail(null)} className="text-xs text-zinc-400 hover:text-zinc-200">← back to drafts</button>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[detail.status] ?? "bg-zinc-700"}`}>{detail.status}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${detail.numeric_check_passed ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"}`}>
              {detail.numeric_check_passed ? "numbers verified" : "numeric check FAILED — cannot stage"}
            </span>
            <span className="text-xs text-zinc-500">{detail.topic_key} · {detail.mode} · {detail.source_deal_ids.length} source deal(s) · r/{detail.target_subreddit}</span>
          </div>

          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100" placeholder="Title" />
          <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={22}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 font-mono" placeholder="Body (markdown)" />

          <div className="flex flex-wrap gap-2">
            <button onClick={() => act("save", { title: editTitle, body_md: editBody })} disabled={busy !== null}
              className="text-xs px-3 py-1.5 rounded bg-zinc-100 text-zinc-900 disabled:opacity-50">Save + re-verify</button>
            <button onClick={copyDraft} className="text-xs px-3 py-1.5 rounded bg-zinc-800">Copy for Reddit</button>
            {detail.status === "draft" && (
              <button onClick={() => act("stage")} disabled={busy !== null || !detail.numeric_check_passed}
                title={detail.numeric_check_passed ? "" : "numeric check must pass first"}
                className="text-xs px-3 py-1.5 rounded bg-blue-900 text-blue-100 disabled:opacity-40">Stage</button>
            )}
            {detail.status === "staged" && (
              <button onClick={() => act("approve")} disabled={busy !== null}
                className="text-xs px-3 py-1.5 rounded bg-emerald-900 text-emerald-100 disabled:opacity-50">Approve</button>
            )}
            {["draft", "staged", "approved"].includes(detail.status) && (
              <button onClick={() => act("discard")} disabled={busy !== null}
                className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-zinc-400 disabled:opacity-50">Discard</button>
            )}
            {detail.status === "approved" && (
              <span className="flex items-center gap-2">
                <input value={postedUrl} onChange={(e) => setPostedUrl(e.target.value)} placeholder="reddit.com/r/... (after you post it yourself)"
                  className="text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 w-72" />
                <button onClick={() => act("mark_posted", { posted_url: postedUrl })} disabled={busy !== null || !postedUrl.trim()}
                  className="text-xs px-3 py-1.5 rounded bg-purple-900 text-purple-100 disabled:opacity-40">Record manual post</button>
              </span>
            )}
          </div>

          {detail.numeric_check && !detail.numeric_check.passed && (
            <div className="border border-red-900 rounded p-3 text-xs">
              <div className="text-red-300 font-medium mb-1">Numeric check failures</div>
              {detail.numeric_check.unmatched.length > 0 && (
                <div className="text-red-200">Unmatched numbers: {detail.numeric_check.unmatched.join(", ")}</div>
              )}
              {detail.numeric_check.label_checks.filter((c) => !c.passed).map((c) => (
                <div key={c.check} className="text-red-200">{c.check}: {c.detail}</div>
              ))}
              <div className="text-zinc-500 mt-1">Fix the text (or remove the number) and Save + re-verify. Every number must trace to the fact sheet below.</div>
            </div>
          )}

          {detail.fact_sheet && (
            <details className="border border-zinc-800 rounded p-3 text-xs">
              <summary className="cursor-pointer text-zinc-300">Fact sheet — the only numbers this draft may contain ({detail.fact_sheet.entries.length})</summary>
              <ul className="mt-2 space-y-1 text-zinc-400">
                {detail.fact_sheet.entries.map((e) => (
                  <li key={e.key}><span className="text-zinc-200">{e.key}</span>: {e.display}{e.qualifier ? ` — ${e.qualifier}` : ""}</li>
                ))}
              </ul>
            </details>
          )}

          {detail.anonymization && (
            <details className="border border-zinc-800 rounded p-3 text-xs">
              <summary className="cursor-pointer text-zinc-300">Anonymization decision ({detail.anonymization.mode}, {detail.anonymization.source_deal_count} deal(s))</summary>
              <ul className="mt-2 space-y-1 text-zinc-400">
                {detail.anonymization.reasons.map((r, i) => <li key={i}>{r}</li>)}
                <li className="text-zinc-500">Always suppressed: {detail.anonymization.suppressed.join("; ")}</li>
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
