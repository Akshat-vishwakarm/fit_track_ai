import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { firestoreDb } from '../firebase/config';
import type {
  User,
  Habit,
  HabitCompletion,
  WorkoutPlan,
  WorkoutLog,
  NutritionGoal,
  MealEntry,
  ProgressEntry,
  Goal,
} from '../types';

const withTimeout = <T>(promise: Promise<T>, fallback: T, ms = 2000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
};

export const firestoreService = {
  // Save or update user profile upon login
  async syncUserProfile(uid: string, email: string, name: string, photoURL?: string): Promise<User> {
    const fallbackUser: User = {
      id: uid,
      name: name || 'Athlete',
      email: email || '',
      avatar: photoURL || '',
      created_at: new Date().toISOString(),
    };

    try {
      const userRef = doc(firestoreDb, 'users', uid);
      const snap = await withTimeout(getDoc(userRef), null as any);

      if (snap && snap.exists && snap.exists()) {
        const data = snap.data();
        updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          name: name || data.name,
          email: email || data.email,
          avatar: photoURL || data.avatar,
        }).catch(() => {});
        return {
          id: uid,
          name: name || data.name,
          email: email || data.email,
          avatar: photoURL || data.avatar,
          created_at: data.created_at || new Date().toISOString(),
        };
      } else {
        setDoc(userRef, {
          userId: uid,
          name: fallbackUser.name,
          email: fallbackUser.email,
          avatar: fallbackUser.avatar,
          created_at: fallbackUser.created_at,
          lastLoginAt: serverTimestamp(),
        }).catch(() => {});
        return fallbackUser;
      }
    } catch (err) {
      console.warn('syncUserProfile fallback:', err);
      return fallbackUser;
    }
  },

  // Scoped sub-collection helper
  getUserCol(uid: string, collectionName: string) {
    return collection(firestoreDb, 'users', uid, collectionName);
  },

  // Habits
  async getHabits(uid: string): Promise<Habit[]> {
    try {
      const fetchPromise = getDocs(this.getUserCol(uid, 'habits')).then((snap) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Habit))
      );
      return await withTimeout(fetchPromise, []);
    } catch (err) {
      console.warn('Firestore fetch habits fallback:', err);
      return [];
    }
  },

  async saveHabit(uid: string, habit: Habit): Promise<Habit> {
    const docRef = doc(firestoreDb, 'users', uid, 'habits', habit.id);
    await setDoc(docRef, habit, { merge: true });
    return habit;
  },

  async addHabit(uid: string, habit: Habit | Omit<Habit, 'id' | 'created_at' | 'archived'>): Promise<Habit> {
    if ('id' in habit && habit.id) {
      return this.saveHabit(uid, habit as Habit);
    }
    const colRef = this.getUserCol(uid, 'habits');
    const docData = {
      ...habit,
      user_id: uid,
      archived: false,
      created_at: new Date().toISOString(),
    };
    const ref = await addDoc(colRef, docData);
    return { id: ref.id, ...docData } as Habit;
  },

  async deleteHabit(uid: string, habitId: string): Promise<void> {
    const docRef = doc(firestoreDb, 'users', uid, 'habits', habitId);
    await deleteDoc(docRef);
  },

  // Habit Completions
  async getCompletions(uid: string): Promise<HabitCompletion[]> {
    try {
      const fetchPromise = getDocs(this.getUserCol(uid, 'habitCompletions')).then((snap) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as HabitCompletion))
      );
      return await withTimeout(fetchPromise, []);
    } catch (err) {
      return [];
    }
  },

  async toggleCompletion(uid: string, habitId: string, dateStr: string): Promise<boolean> {
    const colRef = this.getUserCol(uid, 'habitCompletions');
    const q = query(colRef, where('habit_id', '==', habitId), where('date', '==', dateStr));
    const snap = await withTimeout(getDocs(q), null as any);

    if (snap && !snap.empty) {
      const existingDoc = snap.docs[0];
      const newStatus = !existingDoc.data().completed;
      await updateDoc(doc(firestoreDb, 'users', uid, 'habitCompletions', existingDoc.id), {
        completed: newStatus,
      });
      return newStatus;
    } else {
      const newComp = {
        user_id: uid,
        habit_id: habitId,
        date: dateStr,
        completed: true,
        created_at: new Date().toISOString(),
      };
      await addDoc(colRef, newComp);
      return true;
    }
  },

  async clearAllCompletions(uid: string): Promise<void> {
    try {
      const snap = await getDocs(this.getUserCol(uid, 'habitCompletions'));
      for (const d of snap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    } catch (err) {
      console.warn('clearAllCompletions error:', err);
    }
  },

  // Workout Plans
  async getWorkoutPlans(uid: string): Promise<WorkoutPlan[]> {
    try {
      const fetchPromise = getDocs(this.getUserCol(uid, 'workoutPlans')).then((snap) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkoutPlan))
      );
      return await withTimeout(fetchPromise, []);
    } catch (err) {
      return [];
    }
  },

  async saveWorkoutPlan(
    uid: string,
    dayOfWeek: number,
    workoutName: string,
    muscleGroup: string,
    exercises: WorkoutPlan['exercises'],
    planId?: string
  ): Promise<WorkoutPlan> {
    const colRef = this.getUserCol(uid, 'workoutPlans');
    const docId = planId || `wp_${uid}_day_${dayOfWeek}`;
    const planData = {
      id: docId,
      user_id: uid,
      day_of_week: dayOfWeek,
      workout_name: workoutName,
      muscle_group: muscleGroup,
      exercises,
      created_at: new Date().toISOString(),
    };

    const docRef = doc(firestoreDb, 'users', uid, 'workoutPlans', docId);
    await setDoc(docRef, planData, { merge: true }).catch(() => {});

    // Clean up any other conflicting documents for this day_of_week
    try {
      const q = query(colRef, where('day_of_week', '==', dayOfWeek));
      const snap = await withTimeout(getDocs(q), null as any);
      if (snap && snap.docs) {
        for (const d of snap.docs) {
          if (d.id !== docId) {
            deleteDoc(d.ref).catch(() => {});
          }
        }
      }
    } catch (e) {
      // Ignore background cleanup errors
    }

    return planData as WorkoutPlan;
  },

  async deleteWorkoutPlan(uid: string, planId: string, dayOfWeek?: number): Promise<void> {
    try {
      await deleteDoc(doc(firestoreDb, 'users', uid, 'workoutPlans', planId)).catch(() => {});
      if (dayOfWeek !== undefined) {
        const colRef = this.getUserCol(uid, 'workoutPlans');
        const q = query(colRef, where('day_of_week', '==', dayOfWeek));
        const snap = await withTimeout(getDocs(q), null as any);
        if (snap && snap.docs) {
          for (const d of snap.docs) {
            deleteDoc(d.ref).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('deleteWorkoutPlan error:', err);
    }
  },

  // Workout Logs
  async getWorkoutLogs(uid: string): Promise<WorkoutLog[]> {
    try {
      const fetchPromise = getDocs(this.getUserCol(uid, 'workoutLogs')).then((snap) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkoutLog))
      );
      return await withTimeout(fetchPromise, []);
    } catch (err) {
      return [];
    }
  },

  async logWorkout(uid: string, log: Omit<WorkoutLog, 'id' | 'created_at'>): Promise<WorkoutLog> {
    const colRef = this.getUserCol(uid, 'workoutLogs');
    const docData = {
      ...log,
      user_id: uid,
      created_at: new Date().toISOString(),
    };
    const ref = await addDoc(colRef, docData);
    return { id: ref.id, ...docData } as WorkoutLog;
  },

  // Nutrition Goals
  async getNutritionGoal(uid: string): Promise<NutritionGoal | null> {
    try {
      const fetchPromise = getDocs(this.getUserCol(uid, 'nutritionGoals')).then((snap) => {
        if (snap.empty) return null;
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as NutritionGoal;
      });
      return await withTimeout(fetchPromise, null);
    } catch (err) {
      return null;
    }
  },

  async saveNutritionGoal(
    uid: string,
    goals: { calories: number; protein: number; carbs: number; fats: number }
  ): Promise<NutritionGoal> {
    const colRef = this.getUserCol(uid, 'nutritionGoals');
    const snap = await withTimeout(getDocs(colRef), null as any);
    const data = {
      user_id: uid,
      ...goals,
      updated_at: new Date().toISOString(),
    };

    if (snap && !snap.empty) {
      const existingId = snap.docs[0].id;
      await updateDoc(doc(firestoreDb, 'users', uid, 'nutritionGoals', existingId), data);
      return { id: existingId, ...data } as NutritionGoal;
    } else {
      const ref = await addDoc(colRef, data);
      return { id: ref.id, ...data } as NutritionGoal;
    }
  },

  // Meal Entries
  async getMealEntries(uid: string): Promise<MealEntry[]> {
    try {
      const fetchPromise = getDocs(this.getUserCol(uid, 'mealEntries')).then((snap) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealEntry))
      );
      return await withTimeout(fetchPromise, []);
    } catch (err) {
      return [];
    }
  },

  async addMealEntry(uid: string, meal: Omit<MealEntry, 'id' | 'created_at'>): Promise<MealEntry> {
    const colRef = this.getUserCol(uid, 'mealEntries');
    const docData = {
      ...meal,
      user_id: uid,
      created_at: new Date().toISOString(),
    };
    const ref = await addDoc(colRef, docData);
    return { id: ref.id, ...docData } as MealEntry;
  },

  async updateMealEntry(uid: string, id: string, updates: Partial<MealEntry>): Promise<void> {
    await updateDoc(doc(firestoreDb, 'users', uid, 'mealEntries', id), updates);
  },

  async deleteMealEntry(uid: string, id: string): Promise<void> {
    await deleteDoc(doc(firestoreDb, 'users', uid, 'mealEntries', id));
  },

  // Progress Entries
  async getProgressEntries(uid: string): Promise<ProgressEntry[]> {
    try {
      const fetchPromise = getDocs(this.getUserCol(uid, 'progressEntries')).then((snap) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProgressEntry))
      );
      return await withTimeout(fetchPromise, []);
    } catch (err) {
      return [];
    }
  },

  async addProgressEntry(uid: string, entry: Omit<ProgressEntry, 'id' | 'created_at'>): Promise<ProgressEntry> {
    const colRef = this.getUserCol(uid, 'progressEntries');
    const q = query(colRef, where('date', '==', entry.date));
    const snap = await withTimeout(getDocs(q), null as any);

    if (snap && !snap.empty) {
      const docId = snap.docs[0].id;
      await updateDoc(doc(firestoreDb, 'users', uid, 'progressEntries', docId), entry);
      return { id: docId, created_at: snap.docs[0].data().created_at, ...entry } as ProgressEntry;
    } else {
      const fullData = { ...entry, user_id: uid, created_at: new Date().toISOString() };
      const ref = await addDoc(colRef, fullData);
      return { id: ref.id, ...fullData } as ProgressEntry;
    }
  },

  async deleteProgressEntry(uid: string, id: string): Promise<void> {
    await deleteDoc(doc(firestoreDb, 'users', uid, 'progressEntries', id));
  },

  // Goals
  async getGoals(uid: string): Promise<Goal[]> {
    try {
      const fetchPromise = getDocs(this.getUserCol(uid, 'goals')).then((snap) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal))
      );
      return await withTimeout(fetchPromise, []);
    } catch (err) {
      return [];
    }
  },

  async addGoal(uid: string, goal: Omit<Goal, 'id' | 'created_at' | 'status'>): Promise<Goal> {
    const colRef = this.getUserCol(uid, 'goals');
    const docData = {
      ...goal,
      user_id: uid,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    const ref = await addDoc(colRef, docData);
    return { id: ref.id, ...docData } as Goal;
  },

  async deleteGoal(uid: string, id: string): Promise<void> {
    await deleteDoc(doc(firestoreDb, 'users', uid, 'goals', id));
  },
};
