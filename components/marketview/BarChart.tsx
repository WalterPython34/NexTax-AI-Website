"use client";

interface BarChartItem {
  label: string;
  value: number;
  color: string;
}

interface BarChartProps {
  data: BarChartItem[];
}

export function BarChart({ data }: BarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div
            className="w-[100px] text-right mono text-xs shrink-0"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {item.label}
          </div>
          <div className="flex-1 h-[22px] rounded overflow-hidden relative"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div
              className="h-full rounded transition-all duration-700"
              style={{
                width: `${(item.value / maxVal) * 100}%`,
                background: `linear-gradient(90deg, ${item.color}cc, ${item.color}88)`,
              }}
            />
          </div>
          <div
            className="w-9 mono text-xs font-semibold"
            style={{ color: item.color }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
