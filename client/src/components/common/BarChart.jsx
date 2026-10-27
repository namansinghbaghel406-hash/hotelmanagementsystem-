// Dependency-free SVG bar chart. data: [{ label, value }]
export default function BarChart({ data, format = (v) => v, height = 220, title = "Chart" }) {
  const W = 600;
  const pad = { t: 22, r: 8, b: 30, l: 8 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = (W - pad.l - pad.r) / Math.max(1, data.length);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-100" role="img" aria-label={title}>
      <line x1={pad.l} x2={W - pad.r} y1={height - pad.b} y2={height - pad.b} stroke="currentColor" opacity="0.3" />
      {data.map((d, i) => {
        const h = ((height - pad.t - pad.b) * d.value) / max;
        const w = slot * 0.7;
        const x = pad.l + i * slot + slot * 0.15;
        const y = height - pad.b - h;
        return (
          <g key={`${d.label}-${i}`}>
            <rect x={x} y={y} width={w} height={Math.max(h, 1)} rx="3" fill="var(--bs-primary)" opacity="0.85">
              <title>{`${d.label}: ${format(d.value)}`}</title>
            </rect>
            {d.value > 0 && (
              <text x={x + w / 2} y={y - 5} textAnchor="middle" fontSize="10" fill="currentColor">
                {format(d.value)}
              </text>
            )}
            <text x={x + w / 2} y={height - pad.b + 14} textAnchor="middle" fontSize="10" fill="currentColor">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
