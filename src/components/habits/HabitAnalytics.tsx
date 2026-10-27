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
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
            Cadence Analytics
          </span>
          <p className="text-xs text-on-surface-variant">21-Day consecutive consistency density</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-surface-container-highest font-heading text-[10px] font-bold text-secondary uppercase">
          Telemetry Active
        </span>
      </div>

      {/* Histogram Graphic */}
      <div className="flex flex-col bg-surface-container rounded-xl p-4 space-y-2 border border-outline-variant/10">
        <div className="flex justify-between items-center text-on-surface-variant font-heading text-[11px]">
          <span>Completion Density</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>W1
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary-container"></span>W2
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>W3
            </span>
          </div>
        </div>

        <div className="h-28 flex items-end justify-between pt-4 gap-1">
          {days21.map((item) => {
            let barColor = 'bg-primary-container';
            if (item.weekGroup === 2) barColor = 'bg-secondary-container';
            if (item.weekGroup === 3) barColor = 'bg-tertiary-container';

            return (
              <div
                key={item.dateStr}
                className="flex-1 flex flex-col items-center h-full justify-end group relative"
                title={`Day ${item.dayNum}: ${item.completedCount}/${habits.length} habits (${Math.round(item.pct)}%)`}
              >
                <div
                  className={`w-full ${barColor} rounded-t-sm transition-all duration-500`}
                  style={{ height: `${Math.max(5, item.pct)}%` }}
                />
                <span className="font-heading text-[9px] text-on-surface-variant mt-1">
                  {item.dayNum}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/10">
          <div className="text-[10px] font-heading font-bold text-on-surface-variant uppercase">
            Active Habits
          </div>
          <div className="font-heading text-lg font-extrabold text-on-surface">{habits.length}</div>
        </div>
        <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/10">
          <div className="text-[10px] font-heading font-bold text-on-surface-variant uppercase">
            21-Day Mean
          </div>
          <div className="font-heading text-lg font-extrabold text-tertiary-container">{overallMeanPct}%</div>
        </div>
        <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/10">
          <div className="text-[10px] font-heading font-bold text-on-surface-variant uppercase">
            Current Streak
          </div>
          <div className="font-heading text-lg font-extrabold text-flame">{streak.currentStreak} Days</div>
        </div>
        <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/10">
          <div className="text-[10px] font-heading font-bold text-on-surface-variant uppercase">
            Best Streak
          </div>
          <div className="font-heading text-lg font-extrabold text-secondary">{streak.bestStreak} Days</div>
        </div>
      </div>
    </div>
  );
};
