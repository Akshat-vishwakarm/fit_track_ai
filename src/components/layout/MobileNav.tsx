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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest border-t border-outline-variant px-2 py-1 flex items-center justify-around">
      {mainItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center py-1 px-2.5 rounded text-center transition-colors ${
              isActive ? 'text-primary font-semibold' : 'text-secondary hover:text-primary'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-primary' : 'text-secondary'}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-sans mt-0.5">{item.label.split(' ')[0]}</span>
          </button>
        );
      })}

      {/* Overflow menu for AI, Goals, Calendar, Settings */}
      <button
        onClick={() => setActiveTab('calendar')}
        className={`flex flex-col items-center py-1 px-2.5 rounded text-center transition-colors ${
          ['ai', 'goals', 'calendar', 'settings'].includes(activeTab)
            ? 'text-primary font-semibold'
            : 'text-secondary'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">more_horiz</span>
        <span className="text-[10px] font-sans mt-0.5">More</span>
      </button>
    </nav>
  );
};
