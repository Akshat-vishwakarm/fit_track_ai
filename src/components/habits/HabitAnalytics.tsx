import React from 'react';
import type { Habit } from '../../types';
import { formatLocalDate } from '../../utils/dateUtils';

interface HabitAnalyticsProps {
  habits: Habit[];
  completionsMap: Record<string, Record<string, boolean>>;
  streak: { currentStreak: number; bestStreak: number };
}

export const HabitAnalytics: React.FC<HabitAnalyticsProps> = ({ habits, completionsMap, streak }) => {
  if (habits.length === 0) {
    return null;
  }

  // Calculate 21-day density histogram
  const today = new Date();
  const days21 = [];
  let totalCompletions21 = 0;
  let totalPossible21 = 0;

  for (let i = 20; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatLocalDate(d);
    let dayCompletedCount = 0;

    habits.forEach((h) => {
      totalPossible21++;
      if (completionsMap[h.id] && completionsMap[h.id][dateStr]) {
        dayCompletedCount++;
        totalCompletions21++;
      }
    });

    const dayPct = habits.length > 0 ? (dayCompletedCount / habits.length) * 100 : 0;
    days21.push({
      dayIndex: 21 - i,
      dateStr,
      dayNum: d.getDate(),
      completedCount: dayCompletedCount,
      pct: dayPct,
      weekGroup: i >= 14 ? 1 : i >= 7 ? 2 : 3,
    });
  }

  const overallMeanPct = totalPossible21 > 0 ? Math.round((totalCompletions21 / totalPossible21) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Cadence Bar Visualization Card (8 Cols) */}
      <div className="lg:col-span-8 border border-outline-variant rounded-lg bg-surface-container-lowest p-5 sm:p-6 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-outline-variant">
            <div className="flex flex-col">
              <span className="font-heading text-base font-semibold text-primary">Cadence Analytics</span>
              <span className="font-mono text-xs text-secondary mt-0.5">21-Day consecutive consistency density</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 border border-outline-variant rounded bg-surface font-mono text-xs text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>Telemetry Active</span>
            </div>
          </div>

          {/* Minimalist Monochrome Bar Chart */}
          <div className="mt-6">
            <div className="h-44 w-full flex items-end justify-between gap-1 sm:gap-2 px-1 pt-4 border-b border-outline-variant">
              {days21.map((item) => {
                let barColor = 'bg-[#CCCCCC]';
                if (item.weekGroup === 2) barColor = 'bg-[#777777]';
                if (item.weekGroup === 3) barColor = 'bg-[#111111]';

                const displayHeight = Math.max(8, Math.round(item.pct));

                return (
                  <div
                    key={item.dateStr}
                    className="flex-1 flex flex-col items-center gap-2 group h-full justify-end cursor-pointer"
                    title={`Day ${item.dayNum}: ${item.completedCount}/${habits.length} habits (${Math.round(item.pct)}%)`}
                  >
                    <div
                      className={`w-full ${barColor} rounded-t transition-all group-hover:brightness-90`}
                      style={{ height: `${displayHeight}%` }}
                    />
                    <span className="font-mono text-[10px] text-secondary hidden sm:inline">
                      {String(item.dayNum).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend and Aggregates */}
        <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 text-secondary border-t border-outline-variant">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span className="w-2.5 h-2.5 bg-[#CCCCCC] rounded-xs" />
              <span>W1 (Baseline)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span className="w-2.5 h-2.5 bg-[#777777] rounded-xs" />
              <span>W2 (Ramp)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span className="w-2.5 h-2.5 bg-[#111111] rounded-xs" />
              <span>W3 (Peak Cadence)</span>
            </div>
          </div>

          <div className="font-mono text-xs text-primary font-medium">
            Mean Consistency: {overallMeanPct}%
          </div>
        </div>
      </div>

      {/* Reference Telemetry Card (4 Cols) */}
      <div className="lg:col-span-4 border border-outline-variant rounded-lg bg-surface-container-lowest p-5 sm:p-6 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
            <span className="text-[11px] uppercase tracking-wider text-secondary font-medium">Execution Telemetry</span>
            <span className="font-mono text-[10px] text-secondary border border-outline-variant px-1 rounded">21D COHORT</span>
          </div>

          <div className="mt-4 space-y-3 font-sans text-xs">
            <div className="flex justify-between py-1.5 border-b border-outline-variant">
              <span className="text-secondary">Active Routines</span>
              <span className="font-mono text-primary font-medium">{habits.length}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-outline-variant">
              <span className="text-secondary">Current Continuous Streak</span>
              <span className="font-mono text-primary font-medium">{streak.currentStreak} Days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-outline-variant">
              <span className="text-secondary">Best Recorded Streak</span>
              <span className="font-mono text-primary font-medium">{streak.bestStreak} Days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-outline-variant">
              <span className="text-secondary">Storage Engine</span>
              <span className="font-mono text-primary font-medium">IndexedDB (Dexie)</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant">
          <p className="text-[11px] text-secondary leading-relaxed">
            Every daily check is strictly tracked. Frozen past days cannot be retroactively toggled, reinforcing authentic habit adherence.
          </p>
        </div>
      </div>
    </div>
  );
};
