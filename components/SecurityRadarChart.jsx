'use client';
import { useState } from 'react';

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
    <div className="bg-canvas-raised border border-border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h3 className="text-sm font-medium text-ink">
          Category Coverage Radar
        </h3>
        <span className="text-xs text-ink-faint">
          7 Vectors
        </span>
      </div>

      <div className="relative flex items-center justify-center py-2">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Security radar chart displaying category coverage across 7 vectors"
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
              className="text-border"
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
              className="text-border"
              strokeWidth="1"
            />
          ))}

          {/* Polygon area */}
          <polygon
            points={polygonPoints}
            fill="#3E7BFA"
            fillOpacity="0.15"
            stroke="#3E7BFA"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Vector data nodes */}
          {vectorPoints.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={hoveredVector?.key === p.key ? 4.5 : 3}
              fill={p.score > 0 ? '#3E7BFA' : '#5D6069'}
              stroke="#0B0D10"
              strokeWidth="1.5"
              tabIndex={0}
              role="button"
              aria-label={`${p.label}: score ${p.score} of 100, ${p.count} findings`}
              className="cursor-pointer transition-all duration-150 focus:outline-none"
              onMouseEnter={() => setHoveredVector(p)}
              onMouseLeave={() => setHoveredVector(null)}
              onFocus={() => setHoveredVector(p)}
              onBlur={() => setHoveredVector(null)}
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
                className={`text-[10px] cursor-pointer transition-colors duration-150 ${
                  isHovered ? 'fill-accent font-medium' : 'fill-ink-muted'
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
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1.5 rounded bg-canvas-overlay border border-border shadow-raised text-center flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-accent">
              {hoveredVector.label}
            </span>
            <span className="text-[11px] text-ink-muted">
              Score: {hoveredVector.score}/100 • {hoveredVector.count} finding{hoveredVector.count !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
