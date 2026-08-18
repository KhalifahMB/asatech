import { cn } from "@/utils/cn";

/**
 * Lightweight SVG charts (no charting dependency) used on the admin overview.
 */

export function LineChart({ data, height = 180, color = "#3b82f6", formatValue = (v) => v }) {
  const w = 560;
  const pad = { top: 16, right: 12, bottom: 24, left: 12 };
  const innerW = w - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const min = 0;
  const pts = data.map((d, i) => {
    const x = pad.left + (i / (data.length - 1)) * innerW;
    const y = pad.top + innerH - ((d.value - min) / (max - min)) * innerH;
    return { x, y, ...d };
  });
  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${pad.left},${pad.top + innerH} ${line} ${pad.left + innerW},${pad.top + innerH}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Line chart">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => (
        <line
          key={t}
          x1={pad.left}
          x2={pad.left + innerW}
          y1={pad.top + innerH * t}
          y2={pad.top + innerH * t}
          stroke="currentColor"
          className="text-line"
          strokeDasharray="3 4"
          strokeWidth="1"
        />
      ))}
      <polygon points={area} fill="url(#areaFill)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p) => (
        <circle key={p.label} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
      {pts.map((p) => (
        <text key={p.label} x={p.x} y={height - 6} textAnchor="middle" className="fill-faint" fontSize="10">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

export function BarChart({ data, height = 180, color = "#3b82f6", formatValue = (v) => v }) {
  const w = 560;
  const pad = { top: 16, right: 12, bottom: 24, left: 12 };
  const innerW = w - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const barW = (innerW / data.length) * 0.55;
  const gap = innerW / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const h = ((d.value) / max) * innerH;
        const x = pad.left + i * gap + (gap - barW) / 2;
        const y = pad.top + innerH - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={h} rx="4" fill={d.color || color} opacity="0.9" />
            <text x={x + barW / 2} y={height - 6} textAnchor="middle" className="fill-faint" fontSize="10">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DonutChart({ data, size = 160, thickness = 18, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-line" strokeWidth={thickness} />
        {data.map((d) => {
          const len = (d.value / total) * c;
          const seg = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return seg;
        })}
        <text x="50%" y="48%" textAnchor="middle" className="fill-ink" fontSize="22" fontWeight="700">
          {centerValue}
        </text>
        <text x="50%" y="62%" textAnchor="middle" className="fill-faint" fontSize="10">
          {centerLabel}
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="text-muted">{d.label}</span>
            <span className="ml-auto font-semibold text-ink tabular-nums">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScoreBar({ score, className }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = clamped < 30 ? "#10b981" : clamped < 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className={cn("w-full", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
    </div>
  );
}
