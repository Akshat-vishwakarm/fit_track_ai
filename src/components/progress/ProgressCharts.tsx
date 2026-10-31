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

  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const initialWeight = weights.length > 0 ? weights[0] : null;
  const weightChange = latestWeight !== null && initialWeight !== null ? latestWeight - initialWeight : 0;

  return (
    <div className="space-y-6">
      {/* Metric summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg shadow-sm">
          <span className="font-mono text-[11px] uppercase tracking-wider text-secondary">Latest Weight</span>
          <div className="font-heading text-2xl sm:text-3xl font-semibold text-primary mt-1">
            {latestWeight !== null ? `${latestWeight} kg` : '0 kg'}
          </div>
          <span className="font-mono text-xs text-secondary mt-1 block">Most recent log</span>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg shadow-sm">
          <span className="font-mono text-[11px] uppercase tracking-wider text-secondary">Net Delta</span>
          <div className="font-heading text-2xl sm:text-3xl font-semibold text-primary mt-1">
            {weightChange > 0 ? `+${weightChange.toFixed(1)}` : `${weightChange.toFixed(1)}`} kg
          </div>
          <span className="font-mono text-xs text-secondary mt-1 block">Since baseline log</span>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg shadow-sm">
          <span className="font-mono text-[11px] uppercase tracking-wider text-secondary">Logged Checkpoints</span>
          <div className="font-heading text-2xl sm:text-3xl font-semibold text-primary mt-1">
            {entries.length} Entries
          </div>
          <span className="font-mono text-xs text-secondary mt-1 block">Indexed records</span>
        </div>
      </div>

      {/* Zero State if < 2 records */}
      {!hasEnoughData && (
        <div className="bg-surface-container-lowest rounded-lg p-8 border border-outline-variant text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded border border-outline-variant bg-surface flex items-center justify-center text-primary mb-3">
            <span className="material-symbols-outlined text-[24px]">monitoring</span>
          </div>
          <h3 className="font-heading text-base font-semibold text-primary mb-1">Not enough data yet</h3>
          <p className="text-xs text-secondary max-w-sm mb-4 leading-relaxed">
            Log at least 2 body weight entries to generate historical trend trajectories and charts.
          </p>
          <button
            onClick={onLogClick}
            className="h-9 px-4 bg-primary text-on-primary text-xs font-medium rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Log Weight Entry</span>
          </button>
        </div>
      )}

      {/* SVG Trend Chart Card */}
      {hasEnoughData && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
            <div>
              <h3 className="font-heading text-base font-semibold text-primary">
                Body Weight Trajectory
              </h3>
              <p className="font-mono text-xs text-secondary mt-0.5">Real persisted measurement points</p>
            </div>
            <button
              onClick={onLogClick}
              className="h-8 px-3 rounded bg-primary text-on-primary text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>Log Entry</span>
            </button>
          </div>

          <div className="bg-surface rounded p-4 border border-outline-variant relative overflow-hidden">
            <svg viewBox="0 0 340 140" className="w-full h-48 overflow-visible">
              {/* Horizontal Grid lines */}
              <line x1="10" y1="30" x2="330" y2="30" stroke="#e5e5e5" strokeDasharray="3 3" />
              <line x1="10" y1="75" x2="330" y2="75" stroke="#e5e5e5" strokeDasharray="3 3" />
              <line x1="10" y1="120" x2="330" y2="120" stroke="#e5e5e5" strokeDasharray="3 3" />

              {/* Connecting trend line */}
              <path d={pathD} fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Points */}
              {points.map((pt, idx) => (
                <g key={idx} className="group cursor-pointer">
                  <circle cx={pt.x} cy={pt.y} r="4.5" fill="#000000" className="transition-transform group-hover:r-6" />
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    fill="#111111"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
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

      {/* Historical Entries Table */}
      {entries.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold text-primary">Measurement Ledger</h3>
            <span className="font-mono text-xs text-secondary">{entries.length} Records</span>
          </div>

          <div className="divide-y divide-outline-variant text-xs">
            {entries.slice().reverse().map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 flex items-center justify-between hover:bg-surface transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-secondary">{entry.date}</span>
                  <span className="font-heading font-semibold text-sm text-primary">{entry.weight} kg</span>
                  {entry.notes && (
                    <span className="text-secondary italic hidden sm:inline truncate max-w-xs">
                      &mdash; {entry.notes}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onDeleteEntry(entry.id)}
                  className="text-secondary hover:text-error p-1 cursor-pointer"
                  title="Delete record"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
