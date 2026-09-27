'use client';
import { useState } from 'react';
import { Shield } from 'lucide-react';

const VECTORS = [
  { key: 'session-handling', label: 'Session Handling' },
  { key: 'access-control',   label: 'Access Control' },
  { key: 'input-handling',   label: 'Input Handling' },
  { key: 'api-config',       label: 'API Config' },
  { key: 'client-config',    label: 'Client Config' },
  { key: 'transport-config', label: 'Transport Config' },
  { key: 'data-storage',     label: 'Data Storage' },
];

function getVectorScore(categoryKey, findings) {
  if (!findings.length) return 0;
  const matched = findings.filter((f) => f.category === categoryKey);
  return Math.min(100, Math.round((matched.length / findings.length) * 100 + matched.length * 8));
}

export default function SecurityRadarChart({ findings = [] }) {
  const [hoveredVector, setHoveredVector] = useState(null);

  const size = 300;
  const center = size / 2;
  const maxRadius = 100;
  const rings = [0.25, 0.5, 0.75, 1];
  const numVectors = VECTORS.length;

  const vectorPoints = VECTORS.map((v, i) => {
    const angle = (i * (360 / numVectors) - 90) * (Math.PI / 180);
    const score = getVectorScore(v.key, findings);
    const radius = (score / 100) * maxRadius;
    const count = findings.filter((f) => f.category === v.key).length;
    return {
      ...v,
      angle,
      score,
      count,
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      labelX: center + (maxRadius + 28) * Math.cos(angle),
      labelY: center + (maxRadius + 28) * Math.sin(angle),
      axisX: center + maxRadius * Math.cos(angle),
      axisY: center + maxRadius * Math.sin(angle),
    };
  });

  const polygonPoints = vectorPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
            Category Coverage Radar
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          7 Vectors Analyzed
        </span>
      </div>

      <div className="relative flex items-center justify-center py-2">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full max-w-[320px] h-auto overflow-visible select-none"
        >
          {/* Background Concentric Rings */}
          {rings.map((pct, idx) => (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={maxRadius * pct}
              fill="none"
              stroke="currentColor"
              strokeDasharray="3 3"
              className="text-slate-800/80"
              strokeWidth="1"
            />
          ))}

          {/* Axes lines */}
          {vectorPoints.map((p, idx) => (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={p.axisX}
              y2={p.axisY}
              stroke="currentColor"
              className="text-slate-800"
              strokeWidth="1"
            />
          ))}

          {/* Polygon area */}
          <polygon
            points={polygonPoints}
            fill="rgba(16, 185, 129, 0.2)"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Vector data nodes */}
          {vectorPoints.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={hoveredVector?.key === p.key ? 5 : 3.5}
              fill={p.score > 0 ? '#10b981' : '#64748b'}
              stroke="#0f172a"
              strokeWidth="1.5"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredVector(p)}
              onMouseLeave={() => setHoveredVector(null)}
            />
          ))}

          {/* Vector text labels */}
          {vectorPoints.map((p, idx) => {
            const isHovered = hoveredVector?.key === p.key;
            return (
              <text
                key={idx}
                x={p.labelX}
                y={p.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                className={`text-[10px] font-mono cursor-pointer transition-colors duration-150 ${
                  isHovered ? 'fill-emerald-400 font-bold' : 'fill-slate-400'
                }`}
                onMouseEnter={() => setHoveredVector(p)}
                onMouseLeave={() => setHoveredVector(null)}
              >
                {p.label}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredVector && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-700 shadow-xl backdrop-blur text-center flex flex-col gap-0.5">
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {hoveredVector.label}
            </span>
            <span className="text-[11px] text-slate-300 font-mono">
              Score: {hoveredVector.score}/100 • {hoveredVector.count} finding{hoveredVector.count !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
