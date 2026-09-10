import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { db } from '../db/database';

export const SettingsPage: React.FC = () => {
  const { currentUser, users, switchUser, createUser } = useAuth();
  const { refreshData } = useData();

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [msg, setMsg] = useState('');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    await createUser(
      newUserName.trim(),
      newUserEmail.trim() || `${newUserName.toLowerCase().replace(/\s+/g, '')}@fittrack.ai`
    );
    setNewUserName('');
    setNewUserEmail('');
    await refreshData();
    setMsg('New profile created & activated successfully!');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleResetCurrentUserData = async () => {
    if (!currentUser) return;
    if (
      confirm(
        `Are you sure you want to delete ALL data (habits, workouts, nutrition, weight, goals) for profile "${currentUser.name}"? This action cannot be undone.`
      )
    ) {
      const uid = currentUser.id;
      await db.transaction(
        'rw',
        [
          db.habits,
          db.habitCompletions,
          db.workoutPlans,
          db.workoutLogs,
          db.nutritionGoals,
          db.mealEntries,
          db.progressEntries,
          db.goals,
        ],
        async () => {
          await db.habits.where('user_id').equals(uid).delete();
          await db.habitCompletions.where('user_id').equals(uid).delete();
          await db.workoutPlans.where('user_id').equals(uid).delete();
          await db.workoutLogs.where('user_id').equals(uid).delete();
          await db.nutritionGoals.where('user_id').equals(uid).delete();
          await db.mealEntries.where('user_id').equals(uid).delete();
          await db.progressEntries.where('user_id').equals(uid).delete();
          await db.goals.where('user_id').equals(uid).delete();
        }
      );
      await refreshData();
      setMsg(`Reset complete! Profile "${currentUser.name}" is now at fresh 0-data state.`);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const handleExportJSON = async () => {
    if (!currentUser) return;
    const uid = currentUser.id;
    const exportData = {
      user: currentUser,
      habits: await db.habits.where('user_id').equals(uid).toArray(),
      completions: await db.habitCompletions.where('user_id').equals(uid).toArray(),
      workoutPlans: await db.workoutPlans.where('user_id').equals(uid).toArray(),
      workoutLogs: await db.workoutLogs.where('user_id').equals(uid).toArray(),
      nutritionGoals: await db.nutritionGoals.where('user_id').equals(uid).toArray(),
      mealEntries: await db.mealEntries.where('user_id').equals(uid).toArray(),
      progressEntries: await db.progressEntries.where('user_id').equals(uid).toArray(),
      goals: await db.goals.where('user_id').equals(uid).toArray(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittrack_backup_${currentUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-on-surface">Settings & Profiles</h1>
        <p className="text-xs text-on-surface-variant">
          User profile isolation, persistent database management, and zero-state testing tools.
        </p>
      </div>

      {msg && (
        <div className="bg-secondary-container/20 border border-secondary-container text-secondary p-3 rounded-xl text-xs font-heading font-bold animate-fade-in">
          {msg}
        </div>
      )}

      {/* Active Profiles Selector */}
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 space-y-4 shadow-lg">
        <div className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
          Active User Profile
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              onClick={async () => {
                await switchUser(u.id);
                await refreshData();
              }}
              className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                currentUser?.id === u.id
                  ? 'bg-primary-container/20 border-primary-container ring-1 ring-primary-container'
                  : 'bg-surface-container border-outline-variant/20 hover:border-outline-variant/40'
              }`}
            >
              <div>
                <div className="font-heading font-bold text-sm text-on-surface">{u.name}</div>
                <div className="text-xs text-on-surface-variant">{u.email}</div>
              </div>
              {currentUser?.id === u.id && (
                <span className="material-symbols-outlined text-primary-container text-[20px]">
                  check_circle
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Create Profile Form */}
        <form onSubmit={handleCreateUser} className="pt-4 border-t border-outline-variant/20 space-y-3">
          <div className="font-heading text-xs font-bold text-on-surface">Create Secondary Profile</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Full Name (e.g. Jordan Lee)"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:border-primary-container"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:border-primary-container"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-variant font-heading text-xs font-bold"
          >
            + Add & Switch Profile
          </button>
        </form>
      </div>

      {/* Database Tools */}
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 space-y-4 shadow-lg">
        <div className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
          Database & Storage Controls
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-heading font-bold text-xs"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export User JSON Backup</span>
          </button>

          <button
            onClick={handleResetCurrentUserData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-error-container/30 border border-error/30 text-error hover:bg-error-container/50 font-heading font-bold text-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            <span>Reset Profile to Zero State</span>
          </button>
        </div>
      </div>
    </div>
  );
};
