'use client';
import { useState } from 'react';
import { TrendingUp } from 'lucide-react';

function TooltipItem({ label, value, valueClass }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px] font-mono">
      <span className="text-slate-400">{label}:</span>
      <span className={valueClass || 'text-slate-200 font-bold'}>{value}</span>
    </div>
  );
}

export default function RiskTrendChart({ historyScans = [] }) {
  const [hoveredScan, setHoveredScan] = useState(null);

  if (!historyScans || historyScans.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-center min-h-[160px]">
        <span className="text-xs font-mono text-slate-600">No scan history yet</span>
      </div>
    );
  }

  // Scans from /api/scans/history arrive ordered desc by startedAt.
  // For the chart timeline, reverse them so time flows left to right.
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
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
            Risk Score Trend
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          Last {historyScans.length} Scan{historyScans.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative py-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="riskAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

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
                  className="text-slate-800/80"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                />
                <text
                  x={padX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] font-mono fill-slate-600"
                >
                  {score}
                </text>
              </g>
            );
          })}

          {/* Gradient area under line */}
          {areaD && <path d={areaD} fill="url(#riskAreaGrad)" />}

          {/* Sparkline path */}
          <path
            d={pathD}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive node points */}
          {points.map((p, idx) => (
            <circle
              key={p.id || idx}
              cx={p.x}
              cy={p.y}
              r={hoveredScan?.id === p.id ? 6 : 4}
              fill={p.score >= 70 ? '#ef4444' : p.score >= 40 ? '#f97316' : '#06b6d4'}
              stroke="#0f172a"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredScan(p)}
              onMouseLeave={() => setHoveredScan(null)}
            />
          ))}

          {/* Scan labels at bottom */}
          {points.map((p, idx) => (
            <text
              key={`label-${idx}`}
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              className="text-[9px] font-mono fill-slate-500"
            >
              #{idx + 1}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip Box */}
        {hoveredScan && (
          <div className="absolute top-2 right-4 pointer-events-none p-3 rounded-lg bg-slate-950/95 border border-slate-700 shadow-xl backdrop-blur flex flex-col gap-1 min-w-[190px]">
            <div className="text-[11px] font-mono text-cyan-400 font-bold truncate max-w-[200px]">
              {hoveredScan.targetUrl}
            </div>
            <TooltipItem label="Risk Score" value={`${hoveredScan.score}/100`} valueClass={hoveredScan.score >= 70 ? 'text-red-400 font-bold' : hoveredScan.score >= 40 ? 'text-orange-400 font-bold' : 'text-emerald-400 font-bold'} />
            <TooltipItem label="Findings" value={hoveredScan.totalFindings} />
            <TooltipItem label="Critical" value={hoveredScan.criticalCount} valueClass="text-red-400 font-bold" />
            <TooltipItem label="Duration" value={`${hoveredScan.durationSeconds}s`} />
          </div>
        )}
      </div>
    </div>
  );
}
