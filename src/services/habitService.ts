import { db } from '../db/database';
import { firestoreService } from './firestoreService';
import type { Habit, HabitCompletion } from '../types';
import { formatLocalDate } from '../utils/dateUtils';

export const habitService = {
  async getHabits(userId: string): Promise<Habit[]> {
    try {
      const fsHabits = await firestoreService.getHabits(userId);
      if (fsHabits && fsHabits.length > 0) {
        for (const h of fsHabits) {
          await db.habits.put(h).catch(() => {});
        }
        return fsHabits;
      }
    } catch (err) {
      console.warn('firestoreService.getHabits error, falling back to local Dexie:', err);
    }

    return await db.habits.where('user_id').equals(userId).toArray();
  },

  async getActiveHabits(userId: string): Promise<Habit[]> {
    const habits = await this.getHabits(userId);
    return habits.filter((h) => !h.archived);
  },

  async createHabit(habit: Omit<Habit, 'id' | 'created_at' | 'archived'>): Promise<Habit> {
    const newHabit: Habit = {
      ...habit,
      id: 'hbt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      archived: false,
      created_at: new Date().toISOString(),
    };
    await db.habits.put(newHabit).catch(() => {});

    // Save directly to Firestore under users/{userId}/habits/{habitId}
    await firestoreService.saveHabit(habit.user_id, newHabit).catch((err) => {
      console.warn('saveHabit error to Firestore:', err);
    });

    return newHabit;
  },

  async updateHabit(id: string, updates: Partial<Habit>, userId?: string): Promise<void> {
    await db.habits.update(id, updates);
    const updated = await db.habits.get(id);
    if (updated && (userId || updated.user_id)) {
      await firestoreService.saveHabit(userId || updated.user_id, updated).catch(() => {});
    }
  },

  async deleteHabit(id: string, userId?: string): Promise<void> {
    const existing = await db.habits.get(id);
    const ownerId = userId || existing?.user_id;

    await db.transaction('rw', [db.habits, db.habitCompletions], async () => {
      await db.habits.delete(id);
      await db.habitCompletions.where('habit_id').equals(id).delete();
    });

    if (ownerId) {
      await firestoreService.deleteHabit(ownerId, id).catch(() => {});
    }
  },

  async toggleCompletion(userId: string, habitId: string, dateStr: string): Promise<boolean> {
    const existing = await db.habitCompletions
      .where({ user_id: userId, habit_id: habitId, date: dateStr })
      .first();

    let newStatus = true;
    if (existing) {
      newStatus = !existing.completed;
      await db.habitCompletions.update(existing.id, { completed: newStatus });
    } else {
      const newComp: HabitCompletion = {
        id: 'hbc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        user_id: userId,
        habit_id: habitId,
        date: dateStr,
        completed: true,
        created_at: new Date().toISOString(),
      };
      await db.habitCompletions.add(newComp);
    }

    await firestoreService.toggleCompletion(userId, habitId, dateStr).catch(() => {});
    return newStatus;
  },

  async clearAllCompletions(userId: string): Promise<void> {
    await db.habitCompletions.where('user_id').equals(userId).delete();
    if (userId) {
      await firestoreService.clearAllCompletions(userId).catch(() => {});
    }
  },

  async getCompletions(userId: string): Promise<HabitCompletion[]> {
    try {
      const fsComps = await firestoreService.getCompletions(userId);
      if (fsComps && fsComps.length > 0) {
        for (const c of fsComps) {
          await db.habitCompletions.put(c).catch(() => {});
        }
        return fsComps;
      }
    } catch (err) {
      console.warn('firestoreService.getCompletions error, falling back to local Dexie:', err);
    }

    return await db.habitCompletions.where('user_id').equals(userId).toArray();
  },

  async getCompletionsMap(userId: string): Promise<Record<string, Record<string, boolean>>> {
    const completions = await this.getCompletions(userId);
    const map: Record<string, Record<string, boolean>> = {};

    for (const c of completions) {
      if (!map[c.habit_id]) {
        map[c.habit_id] = {};
      }
      map[c.habit_id][c.date] = c.completed;
    }
    return map;
  },

  async calculateStreak(userId: string): Promise<{ currentStreak: number; bestStreak: number }> {
    const activeHabits = await this.getActiveHabits(userId);
    if (activeHabits.length === 0) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    const completionsMap = await this.getCompletionsMap(userId);
    
    const dateSet = new Set<string>();
    for (const habitId of Object.keys(completionsMap)) {
      for (const dateStr of Object.keys(completionsMap[habitId])) {
        if (completionsMap[habitId][dateStr]) {
          dateSet.add(dateStr);
        }
      }
    }

    if (dateSet.size === 0) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    const today = new Date();
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    let checkDate = new Date(today);
    const todayStr = formatLocalDate(checkDate);
    const hasToday = dateSet.has(todayStr);

    if (!hasToday) {
      checkDate.setDate(checkDate.getDate() - 1);
      if (!dateSet.has(formatLocalDate(checkDate))) {
        currentStreak = 0;
      } else {
        while (dateSet.has(formatLocalDate(checkDate))) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    } else {
      while (dateSet.has(formatLocalDate(checkDate))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    const sortedDates = Array.from(dateSet).sort();
    let prevTime: number | null = null;

    for (const dStr of sortedDates) {
      const dateTime = new Date(dStr).getTime();
      if (prevTime === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((dateTime - prevTime) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevTime = dateTime;
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
    }

    return {
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
    };
  },
};
