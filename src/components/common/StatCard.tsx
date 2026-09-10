import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: string;
  colorClass?: string; // e.g. text-flame, text-secondary, text-primary-container
  progressPct?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  colorClass = 'text-primary-container',
  progressPct,
}) => {
  return (
    <div className="bg-surface-container-low p-4 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/10 hover:border-outline-variant/30 transition-all">
      <div className="flex items-center justify-between">
        <span className="font-heading text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          {title}
        </span>
        <span className={`material-symbols-outlined text-[20px] ${colorClass}`}>{icon}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-heading text-2xl font-extrabold text-on-surface">{value}</span>
        {subtext && <span className="text-xs text-on-surface-variant font-medium">{subtext}</span>}
      </div>
      {progressPct !== undefined && (
        <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 bg-current ${colorClass}`}
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      )}
    </div>
  );
};
