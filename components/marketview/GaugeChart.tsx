"use client";

interface GaugeChartProps {
  score: number;
  riskBand: string;
  riskColor: string;
}

export function GaugeChart({ score, riskBand, riskColor }: GaugeChartProps) {
  const angle = (score / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const cx = 100;
  const cy = 90;
  const r = 70;
  const x = cx - r * Math.cos(rad);
  const y = cy - r * Math.sin(rad);

  return (
    <div className="text-center">
      <svg viewBox="0 0 200 110" width="220" height="125">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="35%" stopColor="#eab308" />
            <stop offset="65%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Indicator dot */}
        <circle cx={x} cy={y} r="6" fill={riskColor} stroke="#0a0f1a" strokeWidth="3" />
        {/* Score text */}
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fill="white"
          fontSize="28"
          fontWeight="700"
          fontFamily="'JetBrains Mono', monospace"
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize="9"
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing="2"
        >
          / 100
        </text>
      </svg>
      <div
        className="inline-block px-4 py-1 rounded mono text-xs font-bold -mt-1"
        style={{
          backgroundColor: riskColor + "18",
          border: `1px solid ${riskColor}40`,
          color: riskColor,
          letterSpacing: "2px",
        }}
      >
        {riskBand} SATURATION
      </div>
    </div>
  );
}
