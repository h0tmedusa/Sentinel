'use client';
import { useState } from 'react';

function TooltipItem({ label, value, valueClass }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-ink-muted">{label}:</span>
      <span className={valueClass || 'text-ink font-medium'}>{value}</span>
    </div>
  );
}

export default function RiskTrendChart({ historyScans = [] }) {
  const [hoveredScan, setHoveredScan] = useState(null);

  if (!historyScans || historyScans.length === 0) {
    return (
      <div className="bg-canvas-raised border border-border rounded-lg p-5 flex items-center justify-center min-h-[160px]">
        <span className="text-xs text-ink-faint">No scan history yet</span>
      </div>
    );
  }

  const scans = [...historyScans].reverse();

  const width = 640;
  const height = 180;
  const padX = 40;
  const padTop = 20;
  const padBottom = 30;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;

  const points = scans.map((s, idx) => {
    const x = scans.length === 1 ? width / 2 : padX + (idx / (scans.length - 1)) * chartW;
    const score = typeof s.riskScore === 'number' ? s.riskScore : 0;
    const y = padTop + chartH - (score / 100) * chartH;
    return { ...s, x, y, score };
  });

  const pathD = points.length === 1
    ? `M ${points[0].x - 20},${points[0].y} L ${points[0].x + 20},${points[0].y}`
    : points.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`, '');

  const areaD = points.length === 1
    ? ''
    : `${pathD} L ${points[points.length - 1].x},${padTop + chartH} L ${points[0].x},${padTop + chartH} Z`;

  return (
    <div className="bg-canvas-raised border border-border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h3 className="text-sm font-medium text-ink">
          Risk Score Trend
        </h3>
        <span className="text-xs text-ink-faint">
          Last {historyScans.length} Scan{historyScans.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative py-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Risk score trend sparkline across historical scans"
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Grid lines (0, 25, 50, 75, 100) */}
          {[0, 25, 50, 75, 100].map((score) => {
            const y = padTop + chartH - (score / 100) * chartH;
            return (
              <g key={score}>
                <line
                  x1={padX}
                  y1={y}
                  x2={width - padX}
                  y2={y}
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                />
                <text
                  x={padX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-ink-faint"
                >
                  {score}
                </text>
              </g>
            );
          })}

          {/* Area under line with flat fill opacity */}
          {areaD && <path d={areaD} fill="#3E7BFA" fillOpacity="0.1" />}

          {/* Sparkline path */}
          <path
            d={pathD}
            fill="none"
            stroke="#3E7BFA"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive node points */}
          {points.map((p, idx) => (
            <circle
              key={p.id || idx}
              cx={p.x}
              cy={p.y}
              r={hoveredScan?.id === p.id ? 5 : 3.5}
              fill={p.score >= 70 ? '#D33B3B' : p.score >= 40 ? '#D97A3D' : '#3E7BFA'}
              stroke="#0B0D10"
              strokeWidth="1.5"
              tabIndex={0}
              role="button"
              aria-label={`Scan #${idx + 1}, Risk Score ${p.score} of 100`}
              className="cursor-pointer transition-all duration-150 focus:outline-none focus:r-6"
              onMouseEnter={() => setHoveredScan(p)}
              onMouseLeave={() => setHoveredScan(null)}
              onFocus={() => setHoveredScan(p)}
              onBlur={() => setHoveredScan(null)}
            />
          ))}

          {/* Scan labels at bottom */}
          {points.map((p, idx) => (
            <text
              key={`label-${idx}`}
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              className="text-[9px] font-mono fill-ink-faint"
            >
              #{idx + 1}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip Box */}
        {hoveredScan && (
          <div className="absolute top-2 right-4 pointer-events-none p-3 rounded bg-canvas-overlay border border-border shadow-raised flex flex-col gap-1 min-w-[190px]">
            <div className="text-[11px] font-mono text-ink font-medium truncate max-w-[200px]">
              {hoveredScan.targetUrl}
            </div>
            <TooltipItem label="Risk Score" value={`${hoveredScan.score}/100`} valueClass={hoveredScan.score >= 70 ? 'text-severity-critical font-medium' : hoveredScan.score >= 40 ? 'text-severity-high font-medium' : 'text-severity-low font-medium'} />
            <TooltipItem label="Findings" value={hoveredScan.totalFindings} />
            <TooltipItem label="Critical" value={hoveredScan.criticalCount} valueClass="text-severity-critical font-medium" />
            <TooltipItem label="Duration" value={`${hoveredScan.durationSeconds}s`} />
          </div>
        )}
      </div>
    </div>
  );
}
