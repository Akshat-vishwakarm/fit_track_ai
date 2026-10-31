import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  badge?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  badge,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface border border-outline rounded-xl my-4">
      <div className="w-12 h-12 rounded-lg bg-surface-variant border border-outline flex items-center justify-center mb-3">
        <span className="material-symbols-outlined text-primary text-[24px]">{icon}</span>
      </div>
      {badge && (
        <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-surface-variant text-on-surface-variant uppercase tracking-widest border border-outline mb-2">
          {badge}
        </span>
      )}
      <h3 className="font-heading text-sm font-bold text-on-surface mb-1 uppercase tracking-tight">{title}</h3>
      <p className="text-xs text-on-surface-variant max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-[#222222] text-on-primary font-heading font-bold text-xs transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
