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
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-container-low border border-outline-variant/20 rounded-2xl shadow-md my-4">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high border border-outline-variant/30 flex items-center justify-center mb-4 shadow-inner">
        <span className="material-symbols-outlined text-primary-container text-[32px]">{icon}</span>
      </div>
      {badge && (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-surface-container-highest text-secondary uppercase tracking-wider mb-2">
          {badge}
        </span>
      )}
      <h3 className="font-heading text-lg font-bold text-on-surface mb-1">{title}</h3>
      <p className="text-sm text-on-surface-variant max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-fixed font-heading font-bold text-sm shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
