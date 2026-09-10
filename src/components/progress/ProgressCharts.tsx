import React from 'react';
import type { ProgressEntry } from '../../types';

interface ProgressChartsProps {
  entries: ProgressEntry[];
  onLogClick: () => void;
  onDeleteEntry: (id: string) => Promise<void>;
}

export const ProgressCharts: React.FC<ProgressChartsProps> = ({ entries, onLogClick, onDeleteEntry }) => {
  const hasEnoughData = entries.length >= 2;

  // Build SVG Path for weight chart
  const weights = entries.map((e) => e.weight).filter((w): w is number => w !== undefined);
  const minW = weights.length > 0 ? Math.min(...weights) - 1 : 60;
  const maxW = weights.length > 0 ? Math.max(...weights) + 1 : 100;

  const points = entries
    .filter((e) => e.weight !== undefined)
    .map((e, idx, arr) => {
      const x = (idx / Math.max(1, arr.length - 1)) * 300 + 20;
      const y = 120 - ((e.weight! - minW) / Math.max(1, maxW - minW)) * 90;
      return { x, y, weight: e.weight!, date: e.date };
    });

  const pathD = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  return (
    <div className="space-y-6">
      {/* Zero State if < 2 records */}
      {!hasEnoughData && (
        <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/20 shadow-lg text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary-container mb-4">
            <span className="material-symbols-outlined text-[36px]">monitoring</span>
          </div>
          <h3 className="font-heading text-lg font-bold text-on-surface mb-1">Not enough data yet</h3>
          <p className="text-sm text-on-surface-variant max-w-sm mb-6">
            Log at least 2 body weight/measurement entries to unlock historical trend analytics and visual charts.
          </p>
          <button
            onClick={onLogClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-fixed font-heading font-bold text-sm shadow-[0_0_12px_rgba(0,210,255,0.3)] hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Log Weight Entry</span>
          </button>
        </div>
      )}

      {/* SVG Trend Chart Card */}
      {hasEnoughData && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
                Body Weight Trajectory
              </span>
              <p className="text-xs text-on-surface-variant">Real persisted measurement points</p>
            </div>
            <button
              onClick={onLogClick}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-container text-on-primary-fixed text-xs font-heading font-bold shadow-[0_0_10px_rgba(0,210,255,0.3)]"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Log Entry</span>
            </button>
          </div>

          <div className="bg-surface-container rounded-xl p-4 border border-outline-variant/10 relative overflow-hidden">
            <svg viewBox="0 0 340 140" className="w-full h-44 overflow-visible">
              {/* Horizontal Grid lines */}
              <line x1="10" y1="30" x2="330" y2="30" stroke="#31353e" strokeDasharray="3 3" />
              <line x1="10" y1="75" x2="330" y2="75" stroke="#31353e" strokeDasharray="3 3" />
              <line x1="10" y1="120" x2="330" y2="120" stroke="#31353e" strokeDasharray="3 3" />

              {/* Connecting trend line */}
              <path d={pathD} fill="none" stroke="#00d2ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Points */}
              {points.map((pt, idx) => (
                <g key={idx} className="group">
                  <circle cx={pt.x} cy={pt.y} r="5" fill="#00d2ff" className="transition-transform group-hover:r-7" />
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    fill="#dfe2ee"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {pt.weight}kg
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* Persistent Entries Table */}
      {entries.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
            Logged Measurement Logs ({entries.length})
          </div>

          <div className="divide-y divide-outline-variant/10">
            {entries.slice().reverse().map((entry) => (
              <div key={entry.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-heading font-bold text-on-surface">{entry.date}</span>
                  <span className="text-primary-container font-bold ml-3">
                    {entry.weight ? `${entry.weight} kg` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[11px] text-on-surface-variant">
                    {entry.body_fat ? `Fat: ${entry.body_fat}% | ` : ''}
                    {entry.waist ? `Waist: ${entry.waist}cm` : ''}
                  </div>
                  <button
                    onClick={() => onDeleteEntry(entry.id)}
                    className="text-on-surface-variant hover:text-error p-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
