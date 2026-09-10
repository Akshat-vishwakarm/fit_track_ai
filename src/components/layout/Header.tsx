import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface HeaderProps {
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const { currentUser, logout } = useAuth();
  const { streak } = useData();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 px-4 h-16 flex items-center justify-between">
      {/* Brand & Page Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* FitTrack AI SVG Logo */}
          <svg className="h-8 w-auto" viewBox="0 0 160 40" fill="none">
            <path
              d="M10 20 L16 12 L22 28 L28 16 L34 20"
              stroke="#00d2ff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="20" r="2.5" fill="#00e599" />
            <circle cx="34" cy="20" r="2.5" fill="#a855f7" />
            <text
              x="44"
              y="26"
              fill="#ffffff"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontSize="20"
              fontWeight="800"
              letterSpacing="-0.5px"
            >
              FitTrack <tspan fill="#00d2ff">AI</tspan>
            </text>
          </svg>
        </div>
        <div className="h-4 w-px bg-outline-variant/30 hidden md:block" />
        <span className="hidden md:inline-block font-heading text-sm font-bold text-on-surface-variant capitalize">
          {activeTab}
        </span>
      </div>

      {/* Date, Streak & User Profile */}
      <div className="flex items-center gap-2">
        {/* Date Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-xs font-heading font-semibold text-on-surface-variant">
          <span className="material-symbols-outlined text-primary text-[14px]">calendar_today</span>
          <span>{formattedDate}</span>
        </div>

        {/* Streak Pill */}
        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-xs font-heading font-bold text-flame border border-flame/20 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
          <span>🔥</span>
          <span>{streak.currentStreak}D</span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold transition-colors border border-outline-variant/20"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover border border-primary/30"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary-fixed flex items-center justify-center font-bold text-[11px]">
                {currentUser ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span className="max-w-[100px] truncate">{currentUser?.name || 'User'}</span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              expand_more
            </span>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in space-y-3">
              {/* Account Info Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-outline-variant/20">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full object-cover border border-primary-container"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-fixed flex items-center justify-center font-extrabold text-base">
                    {currentUser ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="font-heading font-bold text-xs text-on-surface truncate">
                    {currentUser?.name || 'User'}
                  </div>
                  <div className="text-[11px] text-on-surface-variant truncate">
                    {currentUser?.email || 'Authenticated User'}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-secondary mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    <span>Protected Account</span>
                  </div>
                </div>
              </div>

              {/* Sign Out Action */}
              <button
                onClick={async () => {
                  setShowUserDropdown(false);
                  await logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-error-container/20 hover:bg-error-container/40 text-error text-xs font-heading font-bold transition-all border border-error/20"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

