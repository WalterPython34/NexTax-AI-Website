"use client";

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: string;
}

export function MetricCard({ label, value, sublabel, accent }: MetricCardProps) {
  return (
    <div className="card flex-1 min-w-[140px]">
      <div className="label-caps mb-2">{label}</div>
      <div
        className="mono text-2xl font-bold leading-none"
        style={{ color: accent || "#e2e8f0" }}
      >
        {value}
      </div>
      {sublabel && (
        <div className="mono text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
