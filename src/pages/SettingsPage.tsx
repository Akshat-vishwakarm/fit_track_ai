import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { db } from '../db/database';
import { ApiIntegrationSection } from '../components/settings/ApiIntegrationSection';

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
    setMsg('New profile registered and activated.');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleResetCurrentUserData = async () => {
    if (!currentUser) return;
    if (
      confirm(
        `Are you sure you want to delete all fitness records for profile "${currentUser.name}"? This operation cannot be reversed.`
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
      setMsg(`Profile "${currentUser.name}" reset to baseline zero state.`);
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
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">MODULE 08 &bull; CONFIGURATION</div>
          <h1 className="font-heading text-xl font-bold text-on-surface tracking-tight">SETTINGS &amp; INTEGRATIONS</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Profile management, personal API access keys, and persistent local storage backups.
          </p>
        </div>

        <span className="px-3 py-1 rounded text-[10px] font-mono font-bold bg-surface-variant border border-outline text-on-surface uppercase tracking-wider self-start sm:self-auto">
          FITTRACK OS v2.4
        </span>
      </div>

      {msg && (
        <div className="bg-surface-variant border border-outline text-on-surface p-3.5 rounded-lg text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{msg}</span>
          </div>
          <button onClick={() => setMsg('')} className="text-[11px] font-bold uppercase underline">Dismiss</button>
        </div>
      )}

      {/* Personal API Token Integration Section */}
      <ApiIntegrationSection />

      {/* Active Profiles Selector */}
      <div className="bg-surface border border-outline rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">Identity Architecture</div>
            <h2 className="font-heading text-sm font-bold text-on-surface uppercase tracking-wider">
              Registered User Profiles
            </h2>
          </div>
          <span className="text-[10px] font-mono text-on-surface-variant">
            {users.length} {users.length === 1 ? 'Profile' : 'Profiles'} Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {users.map((u) => {
            const isActive = currentUser?.id === u.id;
            return (
              <div
                key={u.id}
                onClick={async () => {
                  await switchUser(u.id);
                  await refreshData();
                }}
                className={`p-4 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-surface-variant border-primary ring-1 ring-primary'
                    : 'bg-surface border-outline hover:bg-surface-variant/40'
                }`}
              >
                <div>
                  <div className="font-heading font-bold text-sm text-on-surface">{u.name}</div>
                  <div className="text-xs text-on-surface-variant font-mono">{u.email}</div>
                </div>
                {isActive && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary text-on-primary uppercase tracking-wider">
                    CURRENT
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Create Profile Form */}
        <form onSubmit={handleCreateUser} className="pt-4 border-t border-outline space-y-3">
          <div className="text-xs font-heading font-bold text-on-surface uppercase tracking-wide">
            Add Isolated User Profile
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Full Name (e.g. Alex Morgan)"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="px-3.5 py-2 rounded-lg bg-surface border border-outline text-on-surface text-xs focus:outline-none focus:border-primary font-mono"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="px-3.5 py-2 rounded-lg bg-surface border border-outline text-on-surface text-xs focus:outline-none focus:border-primary font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-primary hover:bg-[#222222] text-on-primary font-heading text-xs font-bold transition-colors"
          >
            + Create &amp; Switch Profile
          </button>
        </form>
      </div>

      {/* Database Tools */}
      <div className="bg-surface border border-outline rounded-xl p-6 space-y-4">
        <div className="pb-3 border-b border-outline">
          <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">Storage Protocol</div>
          <h2 className="font-heading text-sm font-bold text-on-surface uppercase tracking-wider">
            IndexedDB Telemetry &amp; Data Operations
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-[#222222] text-on-primary font-heading font-bold text-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export Encrypted JSON Backup</span>
          </button>

          <button
            onClick={handleResetCurrentUserData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface hover:bg-surface-variant border border-outline text-on-surface font-heading font-bold text-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Reset Active Profile Records</span>
          </button>
        </div>
      </div>
    </div>
  );
};
