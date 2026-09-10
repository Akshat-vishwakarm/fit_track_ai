import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'habits', label: 'Habit Tracker', icon: 'check_box' },
  { id: 'workout', label: 'Gym & Workout', icon: 'fitness_center' },
  { id: 'nutrition', label: 'Nutrition Tracker', icon: 'restaurant' },
  { id: 'progress', label: 'Body Progress', icon: 'monitoring' },
  { id: 'goals', label: 'Goals', icon: 'flag' },
  { id: 'ai', label: 'AI Insights', icon: 'smart_toy', badge: 'ML' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="hidden md:flex flex-col w-64 fixed left-0 top-16 bottom-0 bg-surface-container-lowest/90 border-r border-outline-variant/20 p-4 space-y-2 overflow-y-auto z-30">
      <div className="px-3 py-2 text-[11px] font-heading font-bold text-on-surface-variant uppercase tracking-wider">
        Navigation
      </div>

      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-heading text-sm transition-all ${
                isActive
                  ? 'bg-primary-container text-on-primary-fixed font-bold shadow-[0_0_15px_rgba(0,210,255,0.25)]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-on-primary-fixed' : 'text-on-surface-variant'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-extrabold rounded uppercase ${
                    isActive
                      ? 'bg-on-primary-fixed/20 text-on-primary-fixed'
                      : 'bg-tertiary-container/20 text-tertiary-container'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="bg-surface-container-low border border-outline-variant/20 p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-on-surface truncate">FitTrack Engine</div>
            <div className="text-[10px] text-on-surface-variant truncate">Zero-Data Architecture</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
