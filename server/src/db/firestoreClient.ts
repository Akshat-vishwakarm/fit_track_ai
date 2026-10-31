import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  limit as fsLimit,
  Firestore,
} from 'firebase/firestore';
import { config } from '../config.js';
import type {
  Habit,
  HabitCompletion,
  WorkoutPlan,
  WorkoutLog,
  NutritionGoal,
  MealEntry,
  ProgressEntry,
  Goal,
  WaterEntry,
  WaterGoal,
} from '../types.js';

let firestoreInstance: Firestore | null = null;

function getDb(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;

  try {
    const firebaseConfig = {
      apiKey: config.firebase.apiKey,
      authDomain: config.firebase.authDomain,
      projectId: config.firebase.projectId,
    };

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    firestoreInstance = getFirestore(app);
    return firestoreInstance;
  } catch (err) {
    console.warn('⚠️ Firestore initialization warning, using local in-memory fallback:', err);
    return null;
  }
}

// In-memory cache/store fallback for testing and offline resilience
const memoryStore: Record<string, Record<string, any[]>> = {};

function getMemCollection(userId: string, colName: string): any[] {
  if (!memoryStore[userId]) memoryStore[userId] = {};
  if (!memoryStore[userId][colName]) memoryStore[userId][colName] = [];
  return memoryStore[userId][colName];
}

let isCloudFirestoreDisabled = process.env.NODE_ENV === 'test';

export function setCloudFirestoreDisabled(disabled: boolean) {
  isCloudFirestoreDisabled = disabled;
}

const withTimeout = async <T>(promise: Promise<T>, fallback: T, ms = 8000): Promise<T> => {
  if (isCloudFirestoreDisabled) return fallback;
  try {
    return await Promise.race([
      promise.catch((err) => {
        console.warn('Firestore operation failed, using fallback:', err?.message || err);
        return fallback;
      }),
      new Promise<T>((resolve) =>
        setTimeout(() => {
          console.warn(`Firestore operation timed out after ${ms}ms, using fallback`);
          resolve(fallback);
        }, ms)
      ),
    ]);
  } catch {
    return fallback;
  }
};

export const firestoreClient = {
  // Scoped sub-collection helper
  getUserCol(userId: string, colName: string) {
    if (isCloudFirestoreDisabled) return null;
    const db = getDb();
    if (!db) return null;
    return collection(db, 'users', userId, colName);
  },

  // --- HABITS ---
  async getHabits(userId: string, includeArchived = false, category?: string): Promise<Habit[]> {
    const colRef = this.getUserCol(userId, 'habits');
    if (colRef) {
      try {
        const fetchPromise = getDocs(colRef).then((snap) => {
          let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Habit));
          if (!includeArchived) list = list.filter((h) => !h.archived);
          if (category) list = list.filter((h) => h.category === category);
          return list;
        });
        const results = await withTimeout(fetchPromise, null as any);
        if (results) return results;
      } catch (err) {
        // Fallback to memory
      }
    }
    const mem = getMemCollection(userId, 'habits');
    return mem.filter((h) => (includeArchived ? true : !h.archived) && (!category || h.category === category));
  },

  async updateHabit(userId: string, habitId: string, updates: Partial<Habit>): Promise<Habit> {
    if (!isCloudFirestoreDisabled) {
      const db = getDb();
      if (db) {
        try {
          const docRef = doc(db, 'users', userId, 'habits', habitId);
          await withTimeout(setDoc(docRef, updates, { merge: true }), null as any);
          const snap = await withTimeout(getDoc(docRef), null as any);
          if (snap && snap.exists()) {
            return { id: snap.id, ...snap.data() } as Habit;
          }
        } catch (err) {
          // Fallback to memory
        }
      }
    }
    const mem = getMemCollection(userId, 'habits');
    const idx = mem.findIndex((h) => h.id === habitId);
    if (idx >= 0) {
      mem[idx] = { ...mem[idx], ...updates };
      return mem[idx];
    }
    const created = { id: habitId, user_id: userId, ...updates } as Habit;
    mem.push(created);
    return created;
  },

  // --- HABIT COMPLETIONS ---
  async getHabitCompletions(
    userId: string,
    habitId?: string,
    startDate?: string,
    endDate?: string,
    limitCount = 50
  ): Promise<HabitCompletion[]> {
    const colRef = this.getUserCol(userId, 'habitCompletions');
    if (colRef) {
      try {
        const fetchPromise = getDocs(colRef).then((snap) => {
          let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as HabitCompletion));
          if (habitId) list = list.filter((c) => c.habit_id === habitId);
          if (startDate) list = list.filter((c) => c.date >= startDate);
          if (endDate) list = list.filter((c) => c.date <= endDate);
          return list.slice(0, limitCount);
        });
        const results = await withTimeout(fetchPromise, null as any);
        if (results) return results;
      } catch (err) {
        // Fallback to memory
      }
    }
    const mem = getMemCollection(userId, 'habitCompletions');
    return mem
      .filter((c) => (!habitId || c.habit_id === habitId) && (!startDate || c.date >= startDate) && (!endDate || c.date <= endDate))
      .slice(0, limitCount);
  },

  async saveHabitCompletion(
    userId: string,
    habitId: string,
    date: string,
    completed: boolean,
    value?: number
  ): Promise<HabitCompletion> {
    const colRef = this.getUserCol(userId, 'habitCompletions');
    if (colRef) {
      try {
        const q = query(colRef, where('habit_id', '==', habitId), where('date', '==', date));
        const snap = await withTimeout(getDocs(q), null as any);
        if (snap && !snap.empty) {
          const docId = snap.docs[0].id;
          const docRef = doc(getDb()!, 'users', userId, 'habitCompletions', docId);
          await updateDoc(docRef, { completed, value: value || 1 });
          return {
            id: docId,
            user_id: userId,
            habit_id: habitId,
            date,
            completed,
            value: value || 1,
            created_at: snap.docs[0].data().created_at,
          };
        } else {
          const newDoc = {
            user_id: userId,
            habit_id: habitId,
            date,
            completed,
            value: value || 1,
            created_at: new Date().toISOString(),
          };
          const ref = await addDoc(colRef, newDoc);
          return { id: ref.id, ...newDoc };
        }
      } catch (err) {
        // Fallback to memory
      }
    }
    const mem = getMemCollection(userId, 'habitCompletions');
    const existing = mem.find((c) => c.habit_id === habitId && c.date === date);
    if (existing) {
      existing.completed = completed;
      if (value !== undefined) existing.value = value;
      return existing;
    }
    const newComp: HabitCompletion = {
      id: 'hbc_' + Date.now(),
      user_id: userId,
      habit_id: habitId,
      date,
      completed,
      value: value || 1,
      created_at: new Date().toISOString(),
    };
    mem.push(newComp);
    return newComp;
  },

  // --- WORKOUT PLANS ---
  async getWorkoutPlans(userId: string): Promise<WorkoutPlan[]> {
    const colRef = this.getUserCol(userId, 'workoutPlans');
    if (colRef) {
      try {
        const fetchPromise = getDocs(colRef).then((snap) =>
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkoutPlan))
        );
        const results = await withTimeout(fetchPromise, null as any);
        if (results) return results;
      } catch (err) {
        // Fallback to memory
      }
    }
    return getMemCollection(userId, 'workoutPlans');
  },

  // --- WORKOUT LOGS ---
  async getWorkoutLogs(userId: string, limitCount = 20, startDate?: string, endDate?: string): Promise<WorkoutLog[]> {
    const colRef = this.getUserCol(userId, 'workoutLogs');
    if (colRef) {
      try {
        const fetchPromise = getDocs(colRef).then((snap) => {
          let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkoutLog));
          if (startDate) list = list.filter((l) => l.date >= startDate);
          if (endDate) list = list.filter((l) => l.date <= endDate);
          return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limitCount);
        });
        const results = await withTimeout(fetchPromise, null as any);
        if (results) return results;
      } catch (err) {
        // Fallback to memory
      }
    }
    const mem = getMemCollection(userId, 'workoutLogs');
    return mem
      .filter((w) => (!startDate || w.date >= startDate) && (!endDate || w.date <= endDate))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limitCount);
  },

  async addWorkoutLog(userId: string, log: Omit<WorkoutLog, 'id' | 'created_at'>): Promise<WorkoutLog> {
    const newLog: WorkoutLog = {
      ...log,
      id: 'wl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    const colRef = this.getUserCol(userId, 'workoutLogs');
    if (colRef) {
      try {
        const docRef = doc(getDb()!, 'users', userId, 'workoutLogs', newLog.id);
        await withTimeout(setDoc(docRef, newLog), null as any);
        return newLog;
      } catch (err) {
        // Fallback to memory
      }
    }
    getMemCollection(userId, 'workoutLogs').push(newLog);
    return newLog;
  },

  // --- NUTRITION GOAL ---
  async getNutritionGoal(userId: string): Promise<NutritionGoal | null> {
    const colRef = this.getUserCol(userId, 'nutritionGoals');
    if (colRef) {
      try {
        const fetchPromise = getDocs(colRef).then((snap) => {
          if (snap.empty) return null;
          return { id: snap.docs[0].id, ...snap.docs[0].data() } as NutritionGoal;
        });
        const result = await withTimeout(fetchPromise, undefined as any);
        if (result !== undefined) return result;
      } catch (err) {
        // Fallback to memory
      }
    }
    const mem = getMemCollection(userId, 'nutritionGoals');
    return mem.length > 0 ? mem[0] : null;
  },

  // --- MEAL ENTRIES ---
  async getMealEntries(
    userId: string,
    date?: string,
    startDate?: string,
    endDate?: string,
    mealType?: string,
    limitCount = 30
  ): Promise<MealEntry[]> {
    const colRef = this.getUserCol(userId, 'mealEntries');
    if (colRef) {
      try {
        const fetchPromise = getDocs(colRef).then((snap) => {
          let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealEntry));
          if (date) list = list.filter((m) => m.date === date);
          if (startDate) list = list.filter((m) => m.date >= startDate);
          if (endDate) list = list.filter((m) => m.date <= endDate);
          if (mealType) list = list.filter((m) => m.meal_type === mealType);
          return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limitCount);
        });
        const results = await withTimeout(fetchPromise, null as any);
        if (results) return results;
      } catch (err) {
        // Fallback to memory
      }
    }
    const mem = getMemCollection(userId, 'mealEntries');
    return mem
      .filter(
        (m) =>
          (!date || m.date === date) &&
          (!startDate || m.date >= startDate) &&
          (!endDate || m.date <= endDate) &&
          (!mealType || m.meal_type === mealType)
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limitCount);
  },

  async getMealEntryById(userId: string, mealId: string): Promise<MealEntry | null> {
    const db = getDb();
    if (db) {
      try {
        const docRef = doc(db, 'users', userId, 'mealEntries', mealId);
        const snap = await withTimeout(getDoc(docRef), null as any);
        if (snap && snap.exists()) {
          return { id: snap.id, ...snap.data() } as MealEntry;
        }
      } catch (err) {
        // Fallback
      }
    }
    const mem = getMemCollection(userId, 'mealEntries');
    return mem.find((m) => m.id === mealId) || null;
  },

  async addMealEntry(userId: string, meal: Omit<MealEntry, 'id' | 'created_at'>): Promise<MealEntry> {
    const newEntry: MealEntry = {
      ...meal,
      id: 'ml_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    const colRef = this.getUserCol(userId, 'mealEntries');
    if (colRef) {
      try {
        const docRef = doc(getDb()!, 'users', userId, 'mealEntries', newEntry.id);
        await withTimeout(setDoc(docRef, newEntry), null as any);
        return newEntry;
      } catch (err) {
        // Fallback to memory
      }
    }
    getMemCollection(userId, 'mealEntries').push(newEntry);
    return newEntry;
  },

  // --- PROGRESS ENTRIES ---
  async getProgressEntries(
    userId: string,
    limitCount = 30,
    startDate?: string,
    endDate?: string
  ): Promise<ProgressEntry[]> {
    const colRef = this.getUserCol(userId, 'progressEntries');
    if (colRef) {
      try {
        const fetchPromise = getDocs(colRef).then((snap) => {
          let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProgressEntry));
          if (startDate) list = list.filter((p) => p.date >= startDate);
          if (endDate) list = list.filter((p) => p.date <= endDate);
          return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limitCount);
        });
        const results = await withTimeout(fetchPromise, null as any);
        if (results) return results;
      } catch (err) {
        // Fallback
      }
    }
    const mem = getMemCollection(userId, 'progressEntries');
    return mem
      .filter((p) => (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limitCount);
  },

  async addProgressEntry(userId: string, entry: Omit<ProgressEntry, 'id' | 'created_at'>): Promise<ProgressEntry> {
    const newEntry: ProgressEntry = {
      ...entry,
      id: 'pe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    const colRef = this.getUserCol(userId, 'progressEntries');
    if (colRef) {
      try {
        const docRef = doc(getDb()!, 'users', userId, 'progressEntries', newEntry.id);
        await withTimeout(setDoc(docRef, newEntry), null as any);
        return newEntry;
      } catch (err) {
        // Fallback
      }
    }
    getMemCollection(userId, 'progressEntries').push(newEntry);
    return newEntry;
  },

  // --- GOALS ---
  async getGoals(userId: string, status?: string): Promise<Goal[]> {
    const colRef = this.getUserCol(userId, 'goals');
    if (colRef) {
      try {
        const fetchPromise = getDocs(colRef).then((snap) => {
          let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal));
          if (status) list = list.filter((g) => g.status === status);
          return list;
        });
        const results = await withTimeout(fetchPromise, null as any);
        if (results) return results;
      } catch (err) {
        // Fallback
      }
    }
    const mem = getMemCollection(userId, 'goals');
    return mem.filter((g) => !status || g.status === status);
  },

  async getGoalById(userId: string, goalId: string): Promise<Goal | null> {
    const db = getDb();
    if (db) {
      try {
        const docRef = doc(db, 'users', userId, 'goals', goalId);
        const snap = await withTimeout(getDoc(docRef), null as any);
        if (snap && snap.exists()) {
          return { id: snap.id, ...snap.data() } as Goal;
        }
      } catch (err) {
        // Fallback
      }
    }
    const mem = getMemCollection(userId, 'goals');
    return mem.find((g) => g.id === goalId) || null;
  },

  async updateGoal(userId: string, goalId: string, updates: Partial<Goal>): Promise<Goal> {
    if (!isCloudFirestoreDisabled) {
      const db = getDb();
      if (db) {
        try {
          const docRef = doc(db, 'users', userId, 'goals', goalId);
          await withTimeout(setDoc(docRef, updates, { merge: true }), null as any);
          const snap = await withTimeout(getDoc(docRef), null as any);
          if (snap && snap.exists()) {
            return { id: snap.id, ...snap.data() } as Goal;
          }
        } catch (err) {
          // Fallback
        }
      }
    }
    const mem = getMemCollection(userId, 'goals');
    const idx = mem.findIndex((g) => g.id === goalId);
    if (idx >= 0) {
      mem[idx] = { ...mem[idx], ...updates };
      return mem[idx];
    }
    const created = { id: goalId, user_id: userId, ...updates } as Goal;
    mem.push(created);
    return created;
  },

  // --- HYDRATION & WATER ---
  async getWaterEntries(
    userId: string,
    date?: string,
    startDate?: string,
    endDate?: string,
    limitCount = 50
  ): Promise<WaterEntry[]> {
    const colRef = this.getUserCol(userId, 'waterEntries');
    if (colRef) {
      try {
        const fetchPromise = getDocs(colRef).then((snap) => {
          let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WaterEntry));
          if (date) list = list.filter((w) => w.date === date);
          if (startDate) list = list.filter((w) => w.date >= startDate);
          if (endDate) list = list.filter((w) => w.date <= endDate);
          return list.sort((a, b) => (b.time || '').localeCompare(a.time || '')).slice(0, limitCount);
        });
        const results = await withTimeout(fetchPromise, null as any);
        if (results) return results;
      } catch (err) {
        // Fallback
      }
    }
    const mem = getMemCollection(userId, 'waterEntries');
    return mem
      .filter((w) => (!date || w.date === date) && (!startDate || w.date >= startDate) && (!endDate || w.date <= endDate))
      .sort((a, b) => (b.time || '').localeCompare(a.time || ''))
      .slice(0, limitCount);
  },

  async addWaterEntry(userId: string, entry: Omit<WaterEntry, 'id' | 'created_at'>): Promise<WaterEntry> {
    const newEntry: WaterEntry = {
      ...entry,
      id: 'we_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    const colRef = this.getUserCol(userId, 'waterEntries');
    if (colRef) {
      try {
        const docRef = doc(getDb()!, 'users', userId, 'waterEntries', newEntry.id);
        await withTimeout(setDoc(docRef, newEntry), null as any);
        return newEntry;
      } catch (err) {
        // Fallback
      }
    }
    getMemCollection(userId, 'waterEntries').push(newEntry);
    return newEntry;
  },

  async getWaterGoal(userId: string): Promise<WaterGoal | null> {
    const colRef = this.getUserCol(userId, 'waterGoals');
    if (colRef) {
      try {
        const fetchPromise = getDocs(colRef).then((snap) => {
          if (snap.empty) return null;
          return { id: snap.docs[0].id, ...snap.docs[0].data() } as WaterGoal;
        });
        const result = await withTimeout(fetchPromise, undefined as any);
        if (result !== undefined) return result;
      } catch (err) {
        // Fallback
      }
    }
    const mem = getMemCollection(userId, 'waterGoals');
    return mem.length > 0 ? mem[0] : null;
  },

  async saveWaterGoal(userId: string, target_ml: number): Promise<WaterGoal> {
    const colRef = this.getUserCol(userId, 'waterGoals');
    const data: WaterGoal = {
      id: 'wg_' + userId,
      user_id: userId,
      daily_target_ml: target_ml,
      updated_at: new Date().toISOString(),
    };
    if (colRef) {
      try {
        const docRef = doc(getDb()!, 'users', userId, 'waterGoals', data.id);
        await withTimeout(setDoc(docRef, data, { merge: true }), null as any);
        return data;
      } catch (err) {
        // Fallback
      }
    }
    const mem = getMemCollection(userId, 'waterGoals');
    const existing = mem.findIndex((g) => g.user_id === userId);
    if (existing >= 0) {
      mem[existing] = data;
    } else {
      mem.push(data);
    }
    return data;
  },
};
