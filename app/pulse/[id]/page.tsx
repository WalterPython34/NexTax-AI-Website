/**
 * app/pulse/[id]/page.tsx
 * Public web viewer for a weekly pulse report.
 * Also has a "Download PDF" button that fetches the stored PDF URL.
 */

import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import PulseReport from "@/components/pulse/pulse-report";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: `NexTax SMB Pulse — Week of ${params.id}`,
    description: `Weekly SMB acquisition market intelligence. Deal Reality Index, industry heatmap, and top opportunities.`,
    openGraph: {
      title: `NexTax SMB Pulse — ${params.id}`,
      description: "Are SMB deals overpriced this week? Find out.",
      url: `https://nextax.ai/pulse/${params.id}`,
    },
  };
}

export default async function PulsePage({ params }: { params: { id: string } }) {
  const { data: report, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("slug", params.id)
    .eq("is_published", true)
    .single();

  if (error || !report) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "#080C14" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* Sticky top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,12,20,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>N</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", fontFamily: "'DM Sans', sans-serif" }}>
            NexTax<span style={{ color: "#6366F1" }}>.AI</span>
            <span style={{ color: "#4B5563", margin: "0 8px" }}>|</span>
            <span style={{ color: "#6B7280", fontWeight: 400 }}>SMB Pulse</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a
            href="/deal-reality-check"
            style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
              color: "#818CF8", textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Check My Deal →
          </a>
          {report.pdf_url && (
            <a
              href={report.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                color: "#fff", textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              ↓ Download PDF
            </a>
          )}
        </div>
      </div>

      {/* Report content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 60px" }}>
        <PulseReport report={report} />
      </div>

      {/* Bottom CTA */}
      <div style={{
        background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "32px 24px", textAlign: "center",
      }}>
        <p style={{ fontSize: 13, color: "#6B7280", fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
          This report is powered by NexTax Market Intelligence — 13,000+ closed transaction benchmarks across 26 industries.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/deal-reality-check" style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
            ⚡ Check My Deal
          </a>
          <a href="/intelligence" style={{ padding: "10px 24px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#E2E8F0", fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
            View Live Intelligence Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
