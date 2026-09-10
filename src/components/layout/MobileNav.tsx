import React from 'react';
import { NAV_ITEMS } from './Sidebar';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  // Select top 5 primary items for bottom tab bar
  const mainItems = NAV_ITEMS.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/20 px-2 py-1 flex items-center justify-around">
      {mainItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-center transition-colors ${
              isActive ? 'text-primary-container font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${isActive ? 'text-primary-container' : ''}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-heading mt-0.5">{item.label.split(' ')[0]}</span>
          </button>
        );
      })}

      {/* Overflow menu for AI, Goals, Settings */}
      <button
        onClick={() => setActiveTab('settings')}
        className={`flex flex-col items-center py-1 px-3 rounded-lg text-center transition-colors ${
          ['ai', 'goals', 'settings'].includes(activeTab)
            ? 'text-primary-container font-bold'
            : 'text-on-surface-variant'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]">more_horiz</span>
        <span className="text-[10px] font-heading mt-0.5">More</span>
      </button>
    </nav>
  );
};
