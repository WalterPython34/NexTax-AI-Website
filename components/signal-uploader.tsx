"use client";

import React, { useState } from "react";

const PLATFORMS = [
  { value: "reddit", label: "Reddit" },
  { value: "twitter", label: "Twitter / X" },
  { value: "searchfunder", label: "Searchfunder" },
  { value: "biggerpockets", label: "BiggerPockets" },
  { value: "acquisition_lab", label: "Acquisition Lab" },
  { value: "other", label: "Other" },
];

interface UploadResult {
  title: string;
  status: string;
}

export default function SignalUploader() {
  const [mode, setMode] = useState<"url" | "paste" | "batch">("paste");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("reddit");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ signals_found: number; signals_inserted: number; results: UploadResult[] } | null>(null);
  const [error, setError] = useState("");
  const [totalUploaded, setTotalUploaded] = useState(0);

  const handleUpload = async () => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/upload-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: mode === "url" ? undefined : content,
          url: mode === "url" ? url : undefined,
          platform,
          batchMode: mode === "batch",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data);
        setTotalUploaded((prev) => prev + data.signals_inserted);
        if (data.signals_inserted > 0) {
          setContent("");
          setUrl("");
        }
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Failed to connect to server");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        textarea:focus,input:focus{outline:none;border-color:rgba(99,102,241,0.4)!important}
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px 60px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", color: "#E2E8F0" }}>📡 Signal Upload</h1>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
            Manually add community signals from Reddit, Searchfunder, Twitter, and other acquisition forums. AI classifies each signal automatically.
          </p>
        </div>

        {/* Stats */}
        {totalUploaded > 0 && (
          <div style={{ padding: "10px 16px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 16, fontSize: 13, color: "#10B981" }}>
            ✓ {totalUploaded} signals uploaded this session
          </div>
        )}

        {/* Mode Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {[
            { id: "paste" as const, label: "📝 Paste Post Text", desc: "Paste a single post or thread" },
            { id: "url" as const, label: "🔗 Submit URL", desc: "Enter a URL to analyze" },
            { id: "batch" as const, label: "📋 Batch Paste", desc: "Paste multiple posts at once" },
          ].map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              flex: 1, padding: "12px 16px", borderRadius: 10, border: "none",
              background: mode === m.id ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
              color: mode === m.id ? "#818CF8" : "#6B7280",
              fontSize: 13, fontWeight: mode === m.id ? 600 : 400, cursor: "pointer", textAlign: "left",
            }}>
              <div>{m.label}</div>
              <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Platform Selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Source Platform</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {PLATFORMS.map((p) => (
              <button key={p.value} onClick={() => setPlatform(p.value)} style={{
                padding: "6px 14px", borderRadius: 6, border: "none",
                background: platform === p.value ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                color: platform === p.value ? "#818CF8" : "#6B7280",
                fontSize: 12, fontWeight: platform === p.value ? 600 : 400, cursor: "pointer",
              }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        {mode === "url" ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Post URL</div>
            <input
              type="url"
              placeholder="https://reddit.com/r/acquisitions/comments/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 14 }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {mode === "batch" ? "Paste Multiple Posts (separate with blank lines)" : "Post Content"}
              </div>
              <div style={{ fontSize: 10, color: "#4B5563" }}>{content.length} chars</div>
            </div>
            <textarea
              placeholder={mode === "batch"
                ? "Paste multiple Reddit/forum posts here...\n\nSeparate each post with a blank line.\n\nThe AI will extract and classify each one individually."
                : "Paste the post title, body text, or thread discussion here...\n\nInclude as much context as possible for better classification."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ width: "100%", minHeight: mode === "batch" ? 300 : 200, padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
            />
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={loading || (!content && !url)}
          style={{
            width: "100%", padding: "14px", borderRadius: 10, border: "none",
            background: loading || (!content && !url) ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
            color: loading || (!content && !url) ? "#6B7280" : "#fff",
            fontSize: 15, fontWeight: 700, cursor: loading || (!content && !url) ? "not-allowed" : "pointer",
            marginBottom: 20,
          }}
        >
          {loading ? "🔄 Analyzing & Classifying..." : mode === "batch" ? "📡 Upload & Classify All Signals" : "📡 Upload & Classify Signal"}
        </button>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
            ✕ {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px" }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#818CF8", fontFamily: "'JetBrains Mono', monospace" }}>{results.signals_found}</div>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase" }}>Found</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>{results.signals_inserted}</div>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase" }}>Inserted</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#F59E0B", fontFamily: "'JetBrains Mono', monospace" }}>{results.signals_found - results.signals_inserted}</div>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase" }}>Skipped</div>
              </div>
            </div>

            {results.results.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 6, background: r.status === "inserted" ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)", marginBottom: 4, border: r.status === "inserted" ? "1px solid rgba(16,185,129,0.1)" : "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ fontSize: 12, color: "#C9D1D9", flex: 1, marginRight: 12 }}>{r.title}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: r.status === "inserted" ? "#10B981" : r.status.startsWith("skipped") ? "#F59E0B" : "#EF4444", whiteSpace: "nowrap" }}>
                  {r.status === "inserted" ? "✓ Inserted" : r.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Quick Tips */}
        <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 8 }}>💡 Tips for Best Results</div>
          <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.7 }}>
            • <strong style={{ color: "#94A3B8" }}>Reddit:</strong> Copy the full post text including title. Include comments for richer classification.<br />
            • <strong style={{ color: "#94A3B8" }}>Searchfunder:</strong> Copy thread discussions about deal sourcing, valuations, or lessons learned.<br />
            • <strong style={{ color: "#94A3B8" }}>Twitter/X:</strong> Copy tweet threads about SMB acquisitions, deal analysis, or market commentary.<br />
            • <strong style={{ color: "#94A3B8" }}>Batch mode:</strong> Paste multiple posts separated by blank lines. AI will extract and classify each one separately.<br />
            • <strong style={{ color: "#94A3B8" }}>Best sources:</strong> r/acquisitions, r/smallbusiness, r/Entrepreneur, r/searchfunds, Searchfunder forums, Acquisition Lab
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <a href="/intelligence" style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.08)", color: "#818CF8", fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>
            ← Intelligence Dashboard
          </a>
          <a href="/admin/import" style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#6B7280", fontSize: 13, fontWeight: 500, textAlign: "center", textDecoration: "none" }}>
            Deal Import Tool →
          </a>
        </div>
      </div>
    </div>
  );
}
