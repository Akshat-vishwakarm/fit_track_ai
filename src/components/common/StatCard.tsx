import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: string;
  colorClass?: string;
  progressPct?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  progressPct,
}) => {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col justify-between hover:bg-surface-container-low transition-colors duration-150">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[11px] text-secondary uppercase tracking-wider font-medium">
          {title}
        </span>
        <span className="material-symbols-outlined text-[18px] text-primary">
          {icon}
        </span>
      </div>

      <div className="mt-3">
        <div className="font-heading text-2xl sm:text-3xl text-primary tracking-tight font-semibold">
          {value}
        </div>
        {subtext && (
          <div className="font-mono text-xs text-secondary mt-1 flex items-center gap-1">
            <span>{subtext}</span>
          </div>
        )}
      </div>

      {progressPct !== undefined && (
        <div className="w-full bg-surface-container h-1 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      )}
    </div>
  );
};
